// Firebase Admin SDK - server-side only
// This file should NEVER be imported in client code

import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function formatPrivateKey(key: string): string {
  return key.replace(/\\n/g, "\n");
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[firebase-admin] Missing env var: ${name}`);
  return v;
}

let _app: ReturnType<typeof initializeApp> | null = null;

export function getFirebaseAdminApp() {
  if (_app) return _app;

  const projectId = requireEnv("FIREBASE_PROJECT_ID");
  const clientEmail = requireEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = formatPrivateKey(requireEnv("FIREBASE_PRIVATE_KEY"));

  // Ensure we don't re-initialize in dev/hot reload.
  _app = getApps().length ? getApps()[0] : initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  return _app;
}

export function getFirebaseAuthAdmin() {
  return getAuth(getFirebaseAdminApp());
}

export function getFirestoreAdmin() {
  return getFirestore(getFirebaseAdminApp());
}