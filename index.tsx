
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { APP_VERSION } from './types';

const BUILD_ID = `v${APP_VERSION} (AUTHORITATIVE)`;
const MILESTONE_DATE = "2025-10-24";

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
