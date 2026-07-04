// Firebase integration exports
export { db, auth, storage, firebaseApp } from "./client";
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