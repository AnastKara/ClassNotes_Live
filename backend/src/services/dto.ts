export function buildRoomDto(room: any) {
  return {
    id: room.id,
    name: room.name,
    content: room.content,
    locked: room.locked,
  };
}

export function buildFlashcardDto(card: any) {
  return {
    id: card.id,
    room_id: card.room_id,
    front: card.front,
    back: card.back,
    created_at: card.created_at,
  };
}

