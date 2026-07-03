import { requireAuth } from "../security/auth.js";
import { RoomService } from "../services/room-service.js";
import { buildRoomDto } from "../services/dto.js";
export async function roomsRoutes(app) {
    const roomService = new RoomService();
    // Note: fastify requires a schema format compatible with its validator.
    // Currently only Zod objects are used; avoid Fastify/JSON-schema conversion issues.
    app.get("/rooms", {
        preHandler: requireAuth,
    }, async () => {
        const rooms = await roomService.listRooms();
        return { rooms: rooms.map(buildRoomDto) };
    });
    app.patch("/rooms/:id", {
        preHandler: requireAuth,
        // Keep schema validation disabled for now to avoid Fastify/Zod schema conversion issues.
        // We'll re-enable with Fastify-compatible JSON schemas.
    }, async (req) => {
        const { id } = req.params;
        const content = req.body?.content;
        if (typeof content !== "string") {
            return { room: buildRoomDto(await roomService.updateRoomContent(id, "")) };
        }
        const updated = await roomService.updateRoomContent(id, content);
        return { room: buildRoomDto(updated) };
    });
    app.patch("/rooms/:id/lock", {
        preHandler: requireAuth,
        // Keep schema validation disabled for now to avoid Fastify/Zod schema conversion issues.
    }, async (req) => {
        const { id } = req.params;
        const { locked } = req.body;
        const updated = await roomService.setRoomLock(id, locked, req.user.userId);
        return { room: buildRoomDto(updated) };
    });
}
