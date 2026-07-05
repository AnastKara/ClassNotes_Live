// Firebase integration exports
export { db, auth, storage, firebaseApp } from "./client.ts";
export { attachFirebaseAuth } from "./auth-attacher";
export type {
  User,
  UserClaims,
  Room,
  Flashcard,
  Product,
  Order,
  Payment,
  UserProfile,
} from "./types";