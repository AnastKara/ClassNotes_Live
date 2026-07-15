import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../security/auth.js";

type AuthedReq = { user?: { userId: string } } & any;

import { FlashcardService } from "../services/flashcard-service.js";
import { buildFlashcardDto } from "../services/dto.js";

export async function flashcardsRoutes(app: FastifyInstance) {
  const flashcardService = new FlashcardService();

  app.get(
    "/rooms/:roomId/flashcards",
    {
      preHandler: requireAuth as any,
      // Temporarily disable schema validation due to Fastify/Zod schema conversion issues.
    },

    async (req) => {
      const { roomId } = req.params as any as { roomId: string };
      const flashcards = await flashcardService.listFlashcards(roomId);
      return { flashcards: flashcards.map(buildFlashcardDto) };
    },
  );

  app.post(
    "/rooms/:roomId/flashcards",
    {
      preHandler: requireAuth as any,
      // Temporarily disable schema validation due to Fastify/Zod schema conversion issues.
    },

    async (req) => {
      const { roomId } = req.params as any as { roomId: string };
      const { front, back } = req.body as any;
      const created = await flashcardService.createFlashcard(
        roomId,
        front,
        back,
        (req as any).user!.userId,
      );
      return { flashcard: buildFlashcardDto(created) };
    },
  );

  app.delete(
    "/flashcards/:id",
    {
      preHandler: requireAuth as any,
      // Temporarily disable schema validation due to Fastify/Zod schema conversion issues.
    },

    async (req) => {
      const { id } = req.params as any as { id: string };
      await flashcardService.deleteFlashcard(id, (req as any).user!.userId);
      return { ok: true };
    },
  );
}
