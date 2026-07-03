import type { FastifyInstance } from "fastify";
import { roomsRoutes } from "./rooms";
import { flashcardsRoutes } from "./flashcards";
import { healthRoute } from "./health";

export async function registerApiRoutes(app: FastifyInstance) {
  app.register(healthRoute, { prefix: "/api" });
  app.register(roomsRoutes, { prefix: "/api" });
  app.register(flashcardsRoutes, { prefix: "/api" });
}

