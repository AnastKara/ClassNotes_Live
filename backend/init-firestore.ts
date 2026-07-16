import { GoogleAuth } from "google-auth-library";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const saPath = join(__dirname, "service-account.json");

async function initFirestore() {
  const sa = JSON.parse(readFileSync(saPath, "utf8"));

  const auth = new GoogleAuth({
    credentials: sa,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const accessToken = token.token;

  const projectId = sa.project_id;

  // First try to create the Firestore database
  // Firestore create database API: POST https://firestore.googleapis.com/v1/projects/{project}/databases
  const createUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases`;

  console.log(`Creating Firestore database for project: ${projectId}...`);

  const createResponse = await fetch(createUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      name: `projects/${projectId}/databases/(default)`,
      locationId: "europe-west3", // Frankfurt - EU location
      type: "FIRESTORE_NATIVE",
    }),
  });

  if (createResponse.ok) {
    const result = await createResponse.json();
    console.log("Database creation initiated:", JSON.stringify(result, null, 2));
    console.log("\nWaiting for operation to complete (may take up to 1 minute)...");
    // Poll the operation
    const opName = result.name;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const opResponse = await fetch(`https://firestore.googleapis.com/v1/${opName}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const opResult = await opResponse.json();
      console.log(`  Poll ${i + 1}:`, opResult.done ? "DONE" : "in progress...");
      if (opResult.done) {
        if (opResult.error) {
          console.error("Operation failed:", opResult.error);
        } else {
          console.log("Database created successfully!");
        }
        return opResult;
      }
    }
  } else if (createResponse.status === 409) {
    console.log("Database already exists (409 Conflict). That's fine!");
  } else {
    const errText = await createResponse.text();
    console.error(`Failed to create database. Status: ${createResponse.status}`);
    console.error("Response:", errText);

    // Try listing databases instead
    console.log("\nListing existing databases...");
    const listResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const listResult = await listResponse.json();
    console.log("Databases:", JSON.stringify(listResult, null, 2));
  }
}

initFirestore().catch(console.error);
