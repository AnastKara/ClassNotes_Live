import { initializeApp, apps, firestore, credential } from "firebase-admin";
import { App } from "firebase-admin/app";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[firebase-admin] Missing env var: ${name}`);
  return v;
}

function formatPrivateKey(key: string) {
  // Firebase private keys often arrive with escaped newlines.
  return key.replace(/\\n/g, "\n");
}

let _app: App | undefined;

export function getFirebaseAdminApp(): App {
  if (_app) return _app;

  const projectId = requireEnv("FIREBASE_PROJECT_ID");
  const clientEmail = requireEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = formatPrivateKey(requireEnv("FIREBASE_PRIVATE_KEY"));

  // Ensure we don't re-initialize in dev/hot reload.
  _app = apps.length ? apps[0]! : initializeApp({
    credential: credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  return _app;
}

export function getFirestoreAdmin() {
  const app = getFirebaseAdminApp();
  return firestore(app);
}

