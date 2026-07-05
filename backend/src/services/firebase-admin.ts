// Firebase Admin SDK - server-side only
// This file should NEVER be imported in client code

import admin from "firebase-admin";
import { App } from "firebase-admin/app";

function formatPrivateKey(key: string): string {
  // The key from .env has \n as literal characters, need to convert to actual newlines
  // Also handle if it's wrapped in quotes
  const unquoted = key.replace(/^"|"$/g, "");
  return unquoted.replace(/\\n/g, "\n");
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[firebase-admin] Missing env var: ${name}`);
  return v;
}

let _app: App | undefined;

export function getFirebaseAdminApp(): App {
  if (_app) return _app;

  const projectId = requireEnv("FIREBASE_PROJECT_ID");
  const clientEmail = requireEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = formatPrivateKey(requireEnv("FIREBASE_PRIVATE_KEY"));

  // Ensure we don't re-initialize in dev/hot reload.
  _app = admin.apps.length ? admin.apps[0]! : admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  return _app!;
}

export function getFirebaseAuthAdmin() {
  return admin.auth(getFirebaseAdminApp());
}

export function getFirestoreAdmin() {
  return admin.firestore(getFirebaseAdminApp());
}