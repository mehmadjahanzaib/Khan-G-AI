import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import firebaseConfigFile from '../../firebase-applet-config.json';
import { ChatMessage } from '../types.js';

// Resolve configuration from Vite environment variables with fallback to config file
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (firebaseConfigFile as any).apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (firebaseConfigFile as any).authDomain || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || (firebaseConfigFile as any).projectId || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || (firebaseConfigFile as any).storageBucket || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || (firebaseConfigFile as any).messagingSenderId || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || (firebaseConfigFile as any).appId || '',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || (firebaseConfigFile as any).firestoreDatabaseId || '',
};

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(config);

// Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Firestore (with support for custom database ID if provisioned)
export const db = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, config.firestoreDatabaseId)
  : getFirestore(app);

// Authentication helper functions
export async function loginWithEmail(email: string, pass: string) {
  return signInWithEmailAndPassword(auth, email.trim(), pass);
}

export async function signupWithEmail(email: string, pass: string, displayName?: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, { displayName: displayName.trim() });
    // Also save user profile record
    await saveUserProfile(userCredential.user);
  }
  return userCredential;
}

export async function loginWithGoogle() {
  const userCredential = await signInWithPopup(auth, googleProvider);
  if (userCredential.user) {
    await saveUserProfile(userCredential.user);
  }
  return userCredential;
}

export async function logoutUser() {
  return signOut(auth);
}

export async function resetUserPassword(email: string) {
  return sendPasswordResetEmail(auth, email.trim());
}

export async function saveUserProfile(user: User) {
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('Could not save user profile document:', err);
  }
}

// Conversation Management in Firestore
export interface ConversationItem {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  lastMessage?: string;
}

/**
 * Fetch all conversations for a user ordered by updatedAt desc
 */
export async function fetchUserConversations(userId: string): Promise<ConversationItem[]> {
  try {
    const colRef = collection(db, 'users', userId, 'conversations');
    const q = query(colRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const updated = data.updatedAt instanceof Timestamp 
        ? data.updatedAt.toMillis() 
        : (data.updatedAt || Date.now());
      const created = data.createdAt instanceof Timestamp 
        ? data.createdAt.toMillis() 
        : (data.createdAt || Date.now());

      return {
        id: docSnap.id,
        title: data.title || 'New Chat',
        createdAt: created,
        updatedAt: updated,
        lastMessage: data.lastMessage || '',
      };
    });
  } catch (err) {
    console.error('Error fetching conversations:', err);
    return [];
  }
}

/**
 * Fetch messages for a specific conversation
 */
export async function fetchConversationMessages(userId: string, conversationId: string): Promise<ChatMessage[]> {
  try {
    const colRef = collection(db, 'users', userId, 'conversations', conversationId, 'messages');
    const q = query(colRef, orderBy('timestamp', 'asc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        sender: d.sender,
        text: d.text,
        timestamp: d.timestamp || Date.now(),
        toolCall: d.toolCall,
        files: d.files,
        isClarification: d.isClarification,
      } as ChatMessage;
    });
  } catch (err) {
    console.error('Error fetching messages for conversation:', err);
    return [];
  }
}

/**
 * Save or update conversation metadata and push message
 */
export async function saveMessageToConversation(
  userId: string,
  conversationId: string,
  message: ChatMessage,
  conversationTitle?: string
) {
  try {
    const convRef = doc(db, 'users', userId, 'conversations', conversationId);
    
    // Check if conversation exists
    const convSnap = await getDoc(convRef);
    if (!convSnap.exists()) {
      await setDoc(convRef, {
        id: conversationId,
        userId,
        title: conversationTitle || (message.text.slice(0, 30) || 'New Chat'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: message.text.slice(0, 80),
      });
    } else {
      await updateDoc(convRef, {
        updatedAt: serverTimestamp(),
        lastMessage: message.text.slice(0, 80),
      });
    }

    // Save individual message
    const msgRef = doc(db, 'users', userId, 'conversations', conversationId, 'messages', message.id);
    // Sanitize message object for Firestore (remove undefined)
    const sanitizedMsg: Record<string, any> = {
      id: message.id,
      sender: message.sender,
      text: message.text || '',
      timestamp: message.timestamp || Date.now(),
      createdAt: serverTimestamp(),
    };

    if (message.toolCall) {
      sanitizedMsg.toolCall = {
        name: message.toolCall.name || '',
        args: message.toolCall.args || {},
      };
    }

    if (message.files && message.files.length > 0) {
      sanitizedMsg.files = message.files.map((f) => ({
        id: f.id,
        originalName: f.originalName,
        processedName: f.processedName,
        mimeType: f.mimeType,
        size: f.size,
        downloadUrl: f.downloadUrl,
        expiresAt: f.expiresAt,
        previewText: f.previewText || '',
        isImage: Boolean(f.isImage),
      }));
    }

    if (typeof message.isClarification === 'boolean') {
      sanitizedMsg.isClarification = message.isClarification;
    }

    await setDoc(msgRef, sanitizedMsg);
  } catch (err) {
    console.error('Error saving message to Firestore:', err);
  }
}

/**
 * Rename a conversation
 */
export async function renameUserConversation(userId: string, conversationId: string, newTitle: string) {
  try {
    const convRef = doc(db, 'users', userId, 'conversations', conversationId);
    await updateDoc(convRef, {
      title: newTitle.trim(),
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error('Error renaming conversation:', err);
    return false;
  }
}

/**
 * Delete a conversation and its messages
 */
export async function deleteUserConversation(userId: string, conversationId: string) {
  try {
    // Delete messages subcollection
    const msgCol = collection(db, 'users', userId, 'conversations', conversationId, 'messages');
    const msgsSnap = await getDocs(msgCol);
    for (const mDoc of msgsSnap.docs) {
      await deleteDoc(mDoc.ref);
    }
    // Delete conversation document
    const convRef = doc(db, 'users', userId, 'conversations', conversationId);
    await deleteDoc(convRef);
    return true;
  } catch (err) {
    console.error('Error deleting conversation:', err);
    return false;
  }
}

/**
 * Clear all messages inside a conversation
 */
export async function clearConversationMessages(userId: string, conversationId: string) {
  try {
    const msgCol = collection(db, 'users', userId, 'conversations', conversationId, 'messages');
    const msgsSnap = await getDocs(msgCol);
    for (const mDoc of msgsSnap.docs) {
      await deleteDoc(mDoc.ref);
    }
    const convRef = doc(db, 'users', userId, 'conversations', conversationId);
    await updateDoc(convRef, {
      lastMessage: '',
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error('Error clearing conversation messages:', err);
    return false;
  }
}

/**
 * Standardized Firestore error handler providing structured debugging context
 */
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const err = error as any;
  const errInfo = {
    code: err?.code || 'unknown',
    message: err?.message || 'Unknown Firestore error',
    operationType,
    path,
    authUid: auth?.currentUser?.uid || null,
  };
  console.error('Firestore Operation Error:', JSON.stringify(errInfo));
  return errInfo;
}

