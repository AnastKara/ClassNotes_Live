import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Use GOOGLE_APPLICATION_CREDENTIALS enviroment variable
// Set it before running: set GOOGLE_APPLICATION-CREDENTIALS=path/to/service-account.json
initializeApp();

const db = getFirestore();

async function seedRooms() {
  const rooms = [
    { id: "math", name: "math", content: "", locked: false },
    { id: "physics", name: "physics", content: "", locked: false },
    { id: "chemistry", name: "chemistry", content: "", locked: false },
    { id: "history", name: "history", content: "", locked: false },
  ];

  for (const room of rooms) {
    const roomRef = db.collection("rooms").doc(room.id);
    const doc = await roomRef.get();
    
    if (!doc.exists) {
      await roomRef.set({
        name: room.name,
        content: room.content,
        locked: room.locked,
        updated_at: new Date().toISOString(),
      });
      console.log(`Created room: ${room.id}`);
    } else {
      console.log(`Room already exists: ${room.id}`);
    }
  }
}

seedRooms()
  .then(() => {
    console.log("Seed completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });