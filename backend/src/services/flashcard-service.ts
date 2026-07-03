import { HttpError } from "../server/errors.js";
import { supabaseAdmin } from "./supabase-admin";



export class FlashcardService {
  private admin() {
    return supabaseAdmin();
  }

  async listFlashcards(roomId: string) {
    const { data, error } = await this.admin()
      .from("flashcards")
      .select("id,room_id,front,back,created_at")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (error) throw new HttpError(500, "Failed to load flashcards");
    return data ?? [];
  }

  async createFlashcard(roomId: string, front: string, back: string, _userId: string) {
    const { data, error } = await this.admin()
      .from("flashcards")
      .insert({ room_id: roomId, front, back })
      .select("id,room_id,front,back,created_at")
      .single();

    if (error || !data) throw new HttpError(500, "Failed to create flashcard");
    return data;
  }

  async deleteFlashcard(cardId: string, _userId: string) {
    const { error } = await this.admin().from("flashcards").delete().eq("id", cardId);
    if (error) throw new HttpError(500, "Failed to delete flashcard");
  }
}


