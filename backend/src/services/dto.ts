// DTO builders for API responses

// Room DTO
export function buildRoomDto(room: any) {
  return {
    id: room.id,
    name: room.name,
    content: room.content,
    locked: room.locked,
  };
}

// Flashcard DTO
export function buildFlashcardDto(card: any) {
  return {
    id: card.id,
    room_id: card.room_id,
    front: card.front,
    back: card.back,
    created_at: card.created_at,
  };
}

// Product DTO
export function buildProductDto(product: any) {
  return {
    id: product.id,
    title: product.title,
    description: product.description,
    type: product.type,
    price: product.price,
    currency: product.currency,
    file_url: product.file_url,
    preview_url: product.preview_url,
    author_id: product.author_id,
    created_at: product.created_at,
    updated_at: product.updated_at,
    published: product.published,
    tags: product.tags || [],
  };
}

// Order DTO
export function buildOrderDto(order: any) {
  return {
    id: order.id,
    user_id: order.user_id,
    product_id: order.product_id,
    product_title: order.product_title,
    amount: order.amount,
    currency: order.currency,
    status: order.status,
    payment_intent_id: order.payment_intent_id,
    created_at: order.created_at,
    updated_at: order.updated_at,
  };
}

// User profile DTO
export function buildUserProfileDto(profile: any) {
  return {
    id: profile.id,
    uid: profile.uid,
    email: profile.email,
    display_name: profile.display_name,
    role: profile.role,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  };
}