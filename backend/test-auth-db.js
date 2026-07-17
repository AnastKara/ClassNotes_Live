import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const saPath = join(__dirname, "service-account.json");

console.log("Firebase Admin initialized successfully");

// Test Auth
try {
  const serviceAccount = JSON.parse(readFileSync(saPath, "utf-8"));
  console.log("1. Service account loaded:", serviceAccount.project_id);

  const app =
    admin.apps.length === 0
      ? admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
      : admin.apps[0];

  console.log("2. Firebase Admin app initialized");

  const authAdmin = admin.auth(app);
  console.log("Auth admin obtained");
  const result = await authAdmin.verifyIdToken("fake-token");
  console.log("Auth verify succeeded (unexpected)");
} catch (e) {
  console.log("Auth verify (expected error):", e.code, "-", e.message.substring(0, 100));
}
