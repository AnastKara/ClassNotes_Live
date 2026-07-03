import { HttpError } from "../server/errors.js";
import { supabaseAdmin } from "./supabase-admin";
export class RoomService {
    admin() {
        return supabaseAdmin();
    }
    async listRooms() {
        const { data, error } = await this.admin()
            .from("rooms")
            .select("id,name,content,locked,updated_at");
        if (error)
            throw new HttpError(500, "Failed to load rooms");
        return data ?? [];
    }
    async updateRoomContent(roomId, content) {
        const { data, error } = await this.admin()
            .from("rooms")
            .update({ content, updated_at: new Date().toISOString() })
            .eq("id", roomId)
            .select("id,name,content,locked,updated_at")
            .single();
        if (error || !data)
            throw new HttpError(500, "Failed to update room");
        return data;
    }
    async setRoomLock(roomId, locked, _userId) {
        // Teacher-only enforcement requires teacher role mapping.
        // For production, implement proper role lookup.
        const { data, error } = await this.admin()
            .from("rooms")
            .update({ locked })
            .eq("id", roomId)
            .select("id,name,content,locked,updated_at")
            .single();
        if (error || !data)
            throw new HttpError(500, "Failed to update lock");
        return data;
    }
}
