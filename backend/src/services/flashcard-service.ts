import { HttpError } from "../server/errors.js";
import { getFirestoreAdmin } from "./firebase-admin.js";

const FLASHCARDS_COLLECTION = "flashcards";

export class FlashcardService {
  private db() {
    return getFirestoreAdmin();
  }

  async listFlashcards(roomId: string) {
    const snapshot = await this.db()
      .collection(FLASHCARDS_COLLECTION)
      .where("room_id", "==", roomId)
      .orderBy("created_at", "asc")
      .get();
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  async createFlashcard(roomId: string, front: string, back: string, _userId: string) {
    const docRef = await this.db().collection(FLASHCARDS_COLLECTION).add({
      room_id: roomId,
      front,
      back,
      created_at: new Date().toISOString(),
    });

    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
    };
  }

  async deleteFlashcard(cardId: string, _userId: string) {
    const docRef = this.db().collection(FLASHCARDS_COLLECTION).doc(cardId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      throw new HttpError(404, "Flashcard not found");
    }

    await docRef.delete();
  }
}