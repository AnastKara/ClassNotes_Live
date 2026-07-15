// Firebase types for the application
// These types are shared between client and server

// User type for Firebase Auth
export type User = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
};

// Custom claims for role-based access
export type UserClaims = {
  role?: "admin" | "user" | "student" | "teacher";
  [key: string]: unknown;
};

// Room type
export type Room = {
  id: string;
  name: string;
  content: string;
  locked: boolean;
  updated_at: string;
};

// Flashcard type
export type Flashcard = {
  id: string;
  room_id: string;
  front: string;
  back: string;
  created_at: string;
};

// Product type (eBooks / prompts)
export type Product = {
  id: string;
  title: string;
  description: string;
  type: "ebook" | "prompt";
  price: number; // in cents
  currency: string;
  file_url?: string;
  preview_url?: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  published: boolean;
  tags: string[];
};

// Order type
export type Order = {
  id: string;
  user_id: string;
  product_id: string;
  product_title: string;
  amount: number; // in cents
  currency: string;
  status: "pending" | "completed" | "failed" | "refunded";
  payment_intent_id?: string;
  created_at: string;
  updated_at: string;
};

// Payment metadata
export type Payment = {
  id: string;
  user_id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  payment_method?: string;
  stripe_payment_intent_id?: string;
  created_at: string;
};

// User profile
export type UserProfile = {
  id: string;
  uid: string;
  email: string;
  display_name?: string;
  role: "admin" | "user" | "student" | "teacher";
  created_at: string;
  updated_at: string;
};
