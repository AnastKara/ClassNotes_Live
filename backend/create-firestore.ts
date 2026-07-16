import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const saPath = join(__dirname, "service-account.json");

console.log("Loading service account from:", saPath);

const sa = JSON.parse(readFileSync(saPath, "utf8"));

const app = admin.initializeApp({
  credential: admin.credential.cert(sa),
});

console.log("App created. Trying Firestore...");

const db = admin.firestore(app);

try {
  // Try a simple write to trigger database creation
  const testRef = db.collection("_init_check").doc("test");
  await testRef.set({ created: true, ts: new Date().toISOString() });
  console.log("Write succeeded!");

  // Read it back
  const doc = await testRef.get();
  console.log("Read succeeded:", doc.data());

  // Clean up
  await testRef.delete();
  console.log("Cleanup done. Firestore is working!");
} catch (e: any) {
  console.error("FIRESTORE ERROR:", e.code, "-", e.message);
  console.log("\nFull error details:");
  console.log(
    JSON.stringify(
      {
        code: e.code,
        message: e.message,
        details: e.details,
      },
      null,
      2,
    ),
  );
}
