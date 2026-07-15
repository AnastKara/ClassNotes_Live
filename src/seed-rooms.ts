import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBHOKybiziZ1iBzBeFo9JjtdQldnyM5pj0",
  authDomain: "classnoteslive-988a5.firebaseapp.com",
  projectId: "classnoteslive-988a5",
  storageBucket: "classnoteslive-988a5.firebasestorage.app",
  messagingSenderId: "200703024291",
  appId: "1:200703024291:web:82680d2a331d4244dfb316",
};

// Initialize Firebase app (singleton)
const firebaseApp = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

async function seedRooms() {
  const rooms = [
    { id: "math", name: "math", content: "", locked: false },
    { id: "physics", name: "physics", content: "", locked: false },
    { id: "chemistry", name: "chemistry", content: "", locked: false },
    { id: "history", name: "history", content: "", locked: false },
  ];

  for (const room of rooms) {
    const roomRef = doc(db, "rooms", room.id);
    const docSnap = await getDoc(roomRef);

    if (!docSnap.exists()) {
      await setDoc(roomRef, {
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
