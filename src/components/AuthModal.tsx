import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, ArrowRight, Loader2, AlertCircle, CheckCircle2, Copy, Check, ExternalLink, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import firebaseConfigFile from '../../firebase-applet-config.json';

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    authModalMode, 
    setAuthModalMode, 
    login, 
    signup, 
    signInWithGoogle, 
    resetPassword 
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const firebaseProjectId = (firebaseConfigFile as any)?.projectId || 'khan-g-2ba49';
  const consoleSettingsUrl = `https://console.firebase.google.com/project/${firebaseProjectId}/authentication/settings`;

  if (!isAuthModalOpen) return null;

  const getFriendlyErrorMessage = (err: any): string => {
    const code = (err?.code || '').toLowerCase();
    const rawMsg = (err?.message || '').toLowerCase();

    if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found') || rawMsg.includes('invalid credential')) {
      return 'Incorrect email or password. Please double-check your credentials and try again.';
    }
    if (code.includes('email-already-in-use') || rawMsg.includes('email-already-in-use')) {
      return 'An account with this email already exists. Try logging in instead, or reset your password.';
    }
    if (code.includes('weak-password')) {
      return 'Password is too weak. Please use at least 6 characters.';
    }
    if (code.includes('invalid-email')) {
      return 'Please enter a valid email address.';
    }
    if (code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')) {
      return 'Google sign-in was cancelled.';
    }
    if (code.includes('popup-blocked')) {
      return 'Google sign-in popup was blocked by your browser. Please allow popups for this site and try again.';
    }
    if (code.includes('network-request-failed') || rawMsg.includes('network error')) {
      return 'Network error. Please check your internet connection and try again.';
    }
    if (code.includes('operation-not-allowed') || rawMsg.includes('password_login_disabled') || rawMsg.includes('operation_not_allowed')) {
      return 'Authentication is not enabled in Firebase Console. Please go to Firebase Console > Authentication > Sign-in method, and enable Email/Password (and Google).';
    }
    if (code.includes('unauthorized-domain') || rawMsg.includes('unauthorized-domain')) {
      return 'This web domain is not authorized in Firebase. Please add this domain to Firebase Console > Authentication > Settings > Authorized domains.';
    }
    if (code.includes('too-many-requests')) {
      return 'Too many attempts. Access temporarily disabled for security. Please try again in a few minutes.';
    }
    return err?.message || 'Authentication failed. Please try again.';
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsUnauthorizedDomain(false);
    setResetSuccessMessage(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (authModalMode === 'forgot') {
      try {
        setIsLoading(true);
        await resetPassword(email.trim());
        setResetSuccessMessage('Password reset link sent! Check your email inbox.');
      } catch (err: any) {
        setError(getFriendlyErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!password) {
      setError('Please enter a password.');
      return;
    }

    if (authModalMode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    try {
      setIsLoading(true);
      if (authModalMode === 'login') {
        await login(email.trim(), password);
      } else {
        await signup(email.trim(), password, displayName.trim() || undefined);
      }
      closeAuthModal();
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsUnauthorizedDomain(false);
    setResetSuccessMessage(null);
    try {
      setIsLoading(true);
      await signInWithGoogle();
      closeAuthModal();
    } catch (err: any) {
      const code = (err?.code || '').toLowerCase();
      const rawMsg = (err?.message || '').toLowerCase();
      if (code.includes('unauthorized-domain') || rawMsg.includes('unauthorized-domain')) {
        setIsUnauthorizedDomain(true);
      }
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
    >
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">
              {authModalMode === 'login' && 'Sign in to Khan G AI'}
              {authModalMode === 'signup' && 'Create your account'}
              {authModalMode === 'forgot' && 'Reset your password'}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {authModalMode === 'login' && 'Access your chat history & personalized file tools'}
              {authModalMode === 'signup' && 'Save and sync conversations across all your devices'}
              {authModalMode === 'forgot' && "Enter your email and we'll send a recovery link"}
            </p>
          </div>
          <button
            onClick={closeAuthModal}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher (Login / Signup) */}
        {authModalMode !== 'forgot' && (
          <div className="flex border-b border-stone-100 bg-stone-50/70 p-1 mx-6 mt-4 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setAuthModalMode('login');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                authModalMode === 'login'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setAuthModalMode('signup');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                authModalMode === 'signup'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Register
            </button>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Unauthorized Domain Helper Card */}
          {isUnauthorizedDomain ? (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2.5 text-stone-800 text-xs animate-fade-in">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-900 text-xs">Domain Authorization Required for Google Sign-in</h4>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    Google OAuth requires adding your app preview domain to your Firebase Console settings.
                  </p>
                </div>
              </div>

              {/* Domain Copy Field */}
              <div className="p-2 bg-white border border-amber-200 rounded-lg flex items-center justify-between gap-2 shadow-xs">
                <div className="overflow-hidden min-w-0 flex-1">
                  <span className="block text-[9px] text-stone-400 font-bold uppercase tracking-wider">Your App Domain</span>
                  <code className="text-[11px] font-mono font-medium text-stone-800 truncate block select-all">
                    {currentHostname}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(currentHostname);
                      setCopiedDomain(true);
                      setTimeout(() => setCopiedDomain(false), 2500);
                    }
                  }}
                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-md flex items-center gap-1.5 transition-colors shrink-0 text-[11px]"
                  title="Copy domain to clipboard"
                >
                  {copiedDomain ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-stone-600" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* 3 Step instructions */}
              <div className="space-y-1 text-[11px] text-stone-700 bg-white/70 p-2.5 rounded-lg border border-amber-100">
                <p className="font-semibold text-stone-900 mb-0.5">Quick 30-Second Fix:</p>
                <p className="flex items-start gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                  <span>Click <strong>Open Firebase Settings</strong> below to access Authorized Domains.</span>
                </p>
                <p className="flex items-start gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                  <span>Click <strong>Add domain</strong> and paste the copied domain above.</span>
                </p>
                <p className="flex items-start gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                  <span>Click <strong>Done</strong>. Return here and click Google Sign-In again!</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <a
                  href={consoleSettingsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-[11px] transition-colors shadow-xs"
                >
                  <span>Open Firebase Settings</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-[10px] text-stone-500 font-medium">
                  Or use <strong>Email &amp; Password</strong> below (works instantly)!
                </span>
              </div>
            </div>
          ) : error ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : null}

          {/* Success Message banner */}
          {resetSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{resetSuccessMessage}</span>
            </div>
          )}

          {/* Google Sign-in Button */}
          {authModalMode !== 'forgot' && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 shadow-sm transition-all active:scale-[0.99] disabled:opacity-60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-stone-200 w-full" />
                <span className="bg-white px-3 text-[11px] font-medium text-stone-400 uppercase tracking-wider absolute">
                  or with email
                </span>
              </div>
            </>
          )}

          <form onSubmit={handleEmailSubmit} className="space-y-3">
            {/* Display Name (only in signup) */}
            {authModalMode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Asad Khan"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all text-stone-900"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all text-stone-900"
                />
              </div>
            </div>

            {/* Password Field */}
            {authModalMode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-stone-700">
                    Password
                  </label>
                  {authModalMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setResetSuccessMessage(null);
                        setAuthModalMode('forgot');
                      }}
                      className="text-[11px] text-amber-700 hover:text-amber-800 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all text-stone-900"
                  />
                </div>
              </div>
            )}

            {/* Confirm Password (only in signup) */}
            {authModalMode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all text-stone-900"
                  />
                </div>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>
                    {authModalMode === 'login' && 'Sign In'}
                    {authModalMode === 'signup' && 'Create Account'}
                    {authModalMode === 'forgot' && 'Send Reset Email'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Back to sign in link for Forgot Password */}
          {authModalMode === 'forgot' && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setResetSuccessMessage(null);
                  setAuthModalMode('login');
                }}
                className="text-xs text-stone-600 hover:text-stone-900 hover:underline"
              >
                ← Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
