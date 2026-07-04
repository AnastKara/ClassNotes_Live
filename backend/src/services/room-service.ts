import { HttpError } from "../server/errors.js";
import { getFirestoreAdmin } from "./firebase-admin.js";

const ROOMS_COLLECTION = "rooms";

export class RoomService {
  private db() {
    return getFirestoreAdmin();
  }

  async listRooms() {
    const snapshot = await this.db().collection(ROOMS_COLLECTION).get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  async updateRoomContent(roomId: string, content: string) {
    const roomRef = this.db().collection(ROOMS_COLLECTION).doc(roomId);
    const doc = await roomRef.get();
    
    if (!doc.exists) {
      throw new HttpError(404, "Room not found");
    }

    await roomRef.update({
      content,
      updated_at: new Date().toISOString(),
    });

    const updated = await roomRef.get();
    return {
      id: updated.id,
      ...updated.data(),
    };
  }

  async setRoomLock(roomId: string, locked: boolean, _userId: string) {
    // Teacher-only enforcement requires teacher role mapping.
    // For production, implement proper role lookup.
    const roomRef = this.db().collection(ROOMS_COLLECTION).doc(roomId);
    const doc = await roomRef.get();
    
    if (!doc.exists) {
      throw new HttpError(404, "Room not found");
    }

    await roomRef.update({ locked });

    const updated = await roomRef.get();
    return {
      id: updated.id,
      ...updated.data(),
    };
  }
}