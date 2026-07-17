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

  const auth = admin.auth(app);
  console.log("\n✓ Firebase Auth client works");

  // Test Firestore
  const db = admin.firestore(app);
  console.log("3. Firestore client obtained");

  // Test: simple read
  const snapshot = await db.collection("rooms").limit(1).get();
  console.log("4. Firestore rooms read works, docs:", snapshot.size);

  console.log("\n=== ALL CHECKS PASSED ===");
  process.exit(0);
} catch (e) {
  console.error("\n=== ERROR ===");
  console.error("Type:", e.constructor?.name);
  console.error("Code:", e.code);
  console.error("Message:", e.message);
  console.error("Stack:", e.stack?.split("\n").slice(0, 5).join("\n"));
  process.exit(1);
}
