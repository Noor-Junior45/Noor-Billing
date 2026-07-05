import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safely wrap window.alert and window.confirm to prevent Sandboxed iframe crashes
if (typeof window !== 'undefined') {
  const originalAlert = window.alert;
  window.alert = function (message) {
    try {
      originalAlert(message);
    } catch (e) {
      console.warn("window.alert was blocked by browser iframe security sandbox. Message:", message);
    }
  };

  const originalConfirm = window.confirm;
  window.confirm = function (message) {
    try {
      return originalConfirm(message);
    } catch (e) {
      console.warn("window.confirm was blocked by browser iframe security sandbox. Fallback to true. Message:", message);
      return true;
    }
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
