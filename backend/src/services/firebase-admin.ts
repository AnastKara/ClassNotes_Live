// Firebase Admin SDK - server-side only
// This file should NEVER be imported in client code

import admin from "firebase-admin";
import { App } from "firebase-admin/app";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

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

  // Try to load from service account file first (more reliable)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const serviceAccountPath = join(__dirname, "../../service-account.json");

  try {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
    _app = admin.apps.length ? admin.apps[0]! : admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (e) {
    // Fallback to environment variables
    const projectId = requireEnv("FIREBASE_PROJECT_ID");
    const clientEmail = requireEnv("FIREBASE_CLIENT_EMAIL");
    const privateKey = formatPrivateKey(requireEnv("FIREBASE_PRIVATE_KEY"));

    _app = admin.apps.length ? admin.apps[0]! : admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  return _app!;
}

export function getFirebaseAuthAdmin() {
  return admin.auth(getFirebaseAdminApp());
}

export function getFirestoreAdmin() {
  return admin.firestore(getFirebaseAdminApp());
}