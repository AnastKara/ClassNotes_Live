# Firebase Migration Guide

This document describes the migration from Supabase to Firebase for the ClassNotes_Live project.

## Schema Changes

### Supabase (PostgreSQL) → Firestore (NoSQL)

| Supabase Table | Firestore Collection | Notes |
|---------------|---------------------|-------|
| `rooms` | `rooms` | Document ID = room id (math, physics, etc.) |
| `flashcards` | `flashcards` | Auto-generated document ID, room_id as field |

### New Marketplace Collections

| Collection | Description |
|------------|-------------|
| `users` | User profiles with roles (admin/user/student/teacher) |
| `products` | eBooks and prompts for sale |
| `orders` | User purchase orders |
| `payments` | Payment metadata |

### Rooms Collection Structure
```javascript
{
  id: string,           // Document ID (e.g., "math", "physics")
  name: string,         // Room name
  content: string,      // Markdown content
  locked: boolean,      // Lock status
  updated_at: string    // ISO timestamp
}
```

### Flashcards Collection Structure
```javascript
{
  id: string,           // Auto-generated document ID
  room_id: string,      // Reference to room
  front: string,        // Question/term
  back: string,         // Answer/definition
  created_at: string    // ISO timestamp
}
```

### Products Collection Structure
```javascript
{
  id: string,
  title: string,
  description: string,
  type: "ebook" | "prompt",
  price: number,        // in cents
  currency: string,
  file_url?: string,
  preview_url?: string,
  author_id: string,
  created_at: string,
  updated_at: string,
  published: boolean,
  tags: string[]
}
```

### Orders Collection Structure
```javascript
{
  id: string,
  user_id: string,
  product_id: string,
  product_title: string,
  amount: number,
  currency: string,
  status: "pending" | "completed" | "failed" | "refunded",
  payment_intent_id?: string,
  created_at: string,
  updated_at: string
}
```

## Authentication

- **Supabase**: Used `supabase.auth.getSession()` and `supabase.auth.getClaims()`
- **Firebase**: Uses `onAuthStateChanged()` and `user.getIdToken()`

The frontend now uses Firebase Authentication with anonymous sign-in for presence tracking.

## Realtime Updates

- **Supabase**: Used `supabase.channel().on("postgres_changes", ...)`
- **Firebase**: Uses `onSnapshot()` from Firestore SDK

Firebase's `onSnapshot()` provides real-time updates automatically when data changes.

## Security Rules

Firestore security rules are defined in `firestore.rules`:

- **Users**: Can only read/write their own data
- **Products**: Read-only for public users, only admins can create/update
- **Orders**: Private per user
- **Payments**: Private per user, immutable

## Environment Variables

### Frontend (.env)
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Backend (.env)
```
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

## File Structure

### Frontend (src/integrations/firebase/)
- `client.ts` - Firebase client SDK (for browser use only)
- `types.ts` - Shared TypeScript types
- `auth-attacher.ts` - TanStack Start middleware for auth

### Backend (backend/src/services/)
- `firebase-admin.ts` - Firebase Admin SDK (server-side only)
- `room-service.ts` - Room CRUD operations
- `flashcard-service.ts` - Flashcard CRUD operations
- `product-service.ts` - Product CRUD operations
- `order-service.ts` - Order CRUD operations
- `user-service.ts` - User profile operations

## Seeding Initial Data

Run the seed script to create initial rooms:

```bash
cd backend
npm run dev  # or: tsx src/seed.ts
```

## API Endpoints

### Public
- `GET /api/products` - List published products
- `GET /api/products/:id` - Get a specific product

### Authenticated
- `GET /api/rooms` - List all rooms
- `PATCH /api/rooms/:id` - Update room content
- `PATCH /api/rooms/:id/lock` - Toggle room lock
- `GET /api/rooms/:roomId/flashcards` - List flashcards
- `POST /api/rooms/:roomId/flashcards` - Create flashcard
- `DELETE /api/flashcards/:id` - Delete flashcard
- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/me` - Update user profile
- `GET /api/orders` - List user's orders
- `GET /api/orders/:id` - Get specific order
- `POST /api/orders` - Create order

### Admin
- `POST /api/admin/products` - Create product
- `PATCH /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product