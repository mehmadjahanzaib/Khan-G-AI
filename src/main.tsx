import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js';
import { AuthProvider } from './context/AuthContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { ProProvider } from './context/ProContext.js';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ProProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ProProvider>
    </ThemeProvider>
  </StrictMode>,
);

