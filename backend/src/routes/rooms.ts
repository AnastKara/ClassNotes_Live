import type { FastifyInstance } from "fastify";

import { requireAuth } from "../security/auth.js";

import { RoomService } from "../services/room-service";
import { buildRoomDto } from "../services/dto.js";

export async function roomsRoutes(app: FastifyInstance) {

  const roomService = new RoomService();

  // Note: fastify requires a schema format compatible with its validator.
  // Currently only Zod objects are used; avoid Fastify/JSON-schema conversion issues.
  app.get(
    "/rooms",
    {
      preHandler: requireAuth as any,
    },
    async () => {
      const rooms = await roomService.listRooms();
      return { rooms: rooms.map(buildRoomDto) };
    },
  );

  app.patch(
    "/rooms/:id",
    {
      preHandler: requireAuth as any,
      // Keep schema validation disabled for now to avoid Fastify/Zod schema conversion issues.
      // We'll re-enable with Fastify-compatible JSON schemas.
    },
    async (req) => {
      const { id } = (req.params as any) as { id: string };
      const content = (req.body as any)?.content;
      if (typeof content !== "string") {
        return { room: buildRoomDto(await roomService.updateRoomContent(id, "")) };
      }
      const updated = await roomService.updateRoomContent(id, content);
      return { room: buildRoomDto(updated) };
    },
  );


app.patch(
    "/rooms/:id/lock",
    {
      preHandler: requireAuth as any,
      // Keep schema validation disabled for now to avoid Fastify/Zod schema conversion issues.
    },

    async (req) => {
      const { id } = (req.params as any) as { id: string };
      const { locked } = req.body as any;
      const updated = await roomService.setRoomLock(id, locked, (req as any).user!.userId);
      return { room: buildRoomDto(updated) };
    },
  );

  app.post(
    "/rooms",
    {
      preHandler: requireAuth as any,
    },
    async (req) => {
      const roomId = (req.body as any)?.id;
      if (typeof roomId !== "string" || !roomId.trim()) {
        throw new Error("Room ID is required");
      }
      const created = await roomService.createRoom(roomId.trim());
      return { room: buildRoomDto(created) };
    },
  );
}


