import { HttpError } from "../server/errors.js";
import { getFirestoreAdmin } from "./firebase-admin.js";
import { getFirebaseAuthAdmin } from "./firebase-admin.js";

const USERS_COLLECTION = "users";

export class UserService {
  private db() {
    return getFirestoreAdmin();
  }

  private auth() {
    return getFirebaseAuthAdmin();
  }

  async getUserProfile(uid: string) {
    const doc = await this.db().collection(USERS_COLLECTION).doc(uid).get();
    
    if (!doc.exists) {
      // Create user profile if it doesn't exist
      const userRecord = await this.auth().getUser(uid);
      const newProfile = {
        uid,
        email: userRecord.email || "",
        display_name: userRecord.displayName || null,
        role: "user" as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      await this.db().collection(USERS_COLLECTION).doc(uid).set(newProfile);
      return { id: uid, ...newProfile };
    }

    return {
      id: doc.id,
      ...doc.data(),
    };
  }

  async updateUserProfile(
    uid: string,
    updates: Partial<{
      display_name: string;
      role: "admin" | "user" | "student" | "teacher";
    }>
  ) {
    const docRef = this.db().collection(USERS_COLLECTION).doc(uid);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      throw new HttpError(404, "User profile not found");
    }

    await docRef.update({
      ...updates,
      updated_at: new Date().toISOString(),
    });

    const updated = await docRef.get();
    return {
      id: updated.id,
      ...updated.data(),
    };
  }

  async setUserRole(uid: string, role: "admin" | "user" | "student" | "teacher") {
    // Set custom claims
    await this.auth().setCustomUserClaims(uid, { role });
    
    // Update user profile
    const docRef = this.db().collection(USERS_COLLECTION).doc(uid);
    await docRef.set(
      {
        role,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );

    return { uid, role };
  }
}