import React from "react";
import ReactDOM from "react-dom/client";

// Suppress third-party noise
const _warn = console.warn.bind(console);
const _error = console.error.bind(console);
console.warn = (...a) => { if (typeof a[0] === 'string' && (a[0].includes('deprecated') || a[0].includes('initialization function'))) return; _warn(...a); };
console.error = (...a) => { if (typeof a[0] === 'string' && (a[0].includes('deprecated') || a[0].includes('initialization function'))) return; _error(...a); };

// PWA Install prompt
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Show install button after 3 seconds
  setTimeout(() => {
    const btn = document.getElementById('pwa-install-btn');
    if (btn) btn.style.display = 'flex';
  }, 3000);
});
window.addEventListener('appinstalled', () => {
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.style.display = 'none';
  deferredPrompt = null;
});
window.__installPWA = () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
  }
};
import { BrowserRouter } from "react-router-dom";
import AppRouter from "./AppRouter.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);