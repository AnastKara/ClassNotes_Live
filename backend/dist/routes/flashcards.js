import { z } from "zod";
import { requireAuth } from "../security/auth.js";
import { FlashcardService } from "../services/flashcard-service.js";
import { buildFlashcardDto } from "../services/dto.js";
export async function flashcardsRoutes(app) {
    const flashcardService = new FlashcardService();
    app.get("/rooms/:roomId/flashcards", {
        preHandler: requireAuth,
        // Temporarily disable schema validation due to Fastify/Zod schema conversion issues.
    }, async (req) => {
        const { roomId } = req.params;
        const flashcards = await flashcardService.listFlashcards(roomId);
        return { flashcards: flashcards.map(buildFlashcardDto) };
    });
    app.post("/rooms/:roomId/flashcards", {
        preHandler: requireAuth,
        schema: {
            params: z.object({ roomId: z.string().min(1) }),
            body: z.object({ front: z.string().min(1), back: z.string().min(1) }),
        },
    }, async (req) => {
        const { roomId } = req.params;
        const { front, back } = req.body;
        const created = await flashcardService.createFlashcard(roomId, front, back, req.user.userId);
        return { flashcard: buildFlashcardDto(created) };
    });
    app.delete("/flashcards/:id", {
        preHandler: requireAuth,
        schema: {
            params: z.object({ id: z.string().min(1) }),
        },
    }, async (req) => {
        const { id } = req.params;
        await flashcardService.deleteFlashcard(id, req.user.userId);
        return { ok: true };
    });
}
