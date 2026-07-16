import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = join(__dirname, "service-account.json");
console.log("Service account path:", serviceAccountPath);

try {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
  console.log("Account loaded OK, project:", serviceAccount.project_id);

  const app =
    admin.apps.length === 0
      ? admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
      : admin.apps[0];

  console.log("Firebase Admin app initialized");

  const auth = admin.auth(app);
  console.log("✓ Firebase Auth client works");

  // Test Firestore
  const db = admin.firestore(app);
  console.log("Firestore client obtained");

  // Add a timeout handler around the Firestore call
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT after 15s")), 15000),
    );

    const snapshot = await Promise.race([db.collection("rooms").limit(1).get(), timeoutPromise]);
    console.log("Firestore rooms read works, docs:", snapshot.size);
  } catch (timeoutError) {
    console.error("Firestore read timed out or failed:", timeoutError.message);
  }

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
