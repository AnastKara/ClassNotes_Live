// Firebase client SDK - for frontend use only
// This file should only be imported in client-side code

import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate required env vars
const requiredEnvVars = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
];

const missing = requiredEnvVars.filter((v) => !import.meta.env[v]);
let missingMessage: string | null = null;
if (missing.length > 0) {
  missingMessage = `Missing Firebase environment variable(s): ${missing.join(", ")}.`;
  console.error(`[Firebase] ${missingMessage}`);
}

// Initialize Firebase app (singleton) - but do not hard-throw during module import.
// This prevents a blank screen; the UI can show an error after it mounts.
let firebaseApp;
try {
  if (missingMessage) {
    // Intentionally skip initialization.
    firebaseApp = undefined as any;
  } else {
    firebaseApp = initializeApp(firebaseConfig);
  }
} catch (e) {
  // App already initialized
  if (missingMessage) {
    firebaseApp = undefined as any;
  } else {
    firebaseApp = getApps()[0];
  }
}

export const firebaseEnvError = missingMessage;

// If firebaseEnvError is set, these will be undefined.
// Use `firebaseEnvError` to show an error UI instead of crashing.
export const db = missingMessage ? (undefined as any) : getFirestore(firebaseApp);
export const auth = missingMessage ? (undefined as any) : getAuth(firebaseApp);
export const storage = missingMessage ? (undefined as any) : getStorage(firebaseApp);

// Export for use in other modules
export { firebaseApp };
