import { HttpError } from "../server/errors.js";
import { supabaseAdmin } from "./supabase-admin";
export class FlashcardService {
    admin() {
        return supabaseAdmin();
    }
    async listFlashcards(roomId) {
        const { data, error } = await this.admin()
            .from("flashcards")
            .select("id,room_id,front,back,created_at")
            .eq("room_id", roomId)
            .order("created_at", { ascending: true });
        if (error)
            throw new HttpError(500, "Failed to load flashcards");
        return data ?? [];
    }
    async createFlashcard(roomId, front, back, _userId) {
        const { data, error } = await this.admin()
            .from("flashcards")
            .insert({ room_id: roomId, front, back })
            .select("id,room_id,front,back,created_at")
            .single();
        if (error || !data)
            throw new HttpError(500, "Failed to create flashcard");
        return data;
    }
    async deleteFlashcard(cardId, _userId) {
        const { error } = await this.admin().from("flashcards").delete().eq("id", cardId);
        if (error)
            throw new HttpError(500, "Failed to delete flashcard");
    }
}
