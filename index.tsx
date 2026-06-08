
// DEFENSIVE FETCH PROTECTION
// Some libraries attempt to polyfill or wrap fetch by assigning to window.fetch.
// In this environment, window.fetch is a read-only getter, so assignment fails.
(function() {
  try {
    const desc = Object.getOwnPropertyDescriptor(window, 'fetch');
    if (!desc || desc.configurable) {
      console.log("[ENV] Shadowing fetch to prevent read-only property/getter errors.");
      const originalFetch = window.fetch;
      let currentFetch = originalFetch;
      Object.defineProperty(window, 'fetch', {
        get() {
          return currentFetch;
        },
        set(v) {
          currentFetch = v;
        },
        configurable: true,
        enumerable: true
      });
    }
  } catch (e) {
    console.warn("[ENV] Fetch shadowing failed:", e);
  }
})();

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { APP_VERSION } from './types';

// AUTHORITATIVE DIAGNOSTIC ENGINE v2.2.1
const BUILD_ID = `v${APP_VERSION} (AUTHORITATIVE)`;
const MILESTONE_DATE = "2025-10-24";

window.onerror = function(message, source, lineno, colno, error) {
  console.error("%c[FATAL ERROR] %cCaught globally:", "color: #ef4444; font-weight: bold", "color: #1f2937", {
    message, source, lineno, colno, error
  });
  if (message.toString().includes('fetch') && message.toString().includes('getter')) {
    console.warn("%c[ENV FIX] %cDetected fetch collision. The app is attempting to bypass read-only property constraints.", "color: #f59e0b; font-weight: bold", "color: #4b5563");
  }
};

console.log(`%c[UNSanctionGuard] %cMilestone Reached: ${BUILD_ID}`, "color: #10b981; font-weight: bold", "color: #3b82f6");
console.log(`%c[UNSanctionGuard] %cVerified Success Point archived on ${MILESTONE_DATE}`, "color: #10b981; font-weight: bold", "color: #6b7280");

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root container missing");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
