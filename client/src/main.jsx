import React from "react";
import ReactDOM from "react-dom/client";

// Suppress third-party noise (react-calendar internals, browser extension telemetry)
const _warn = console.warn.bind(console);
const _error = console.error.bind(console);
console.warn = (...a) => { if (typeof a[0] === 'string' && (a[0].includes('deprecated') || a[0].includes('initialization function'))) return; _warn(...a); };
console.error = (...a) => { if (typeof a[0] === 'string' && (a[0].includes('deprecated') || a[0].includes('initialization function'))) return; _error(...a); };
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