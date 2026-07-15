import type { FastifyInstance } from "fastify";
import { roomsRoutes } from "./rooms";
import { flashcardsRoutes } from "./flashcards";
import { productsRoutes } from "./products";
import { ordersRoutes } from "./orders";
import { usersRoutes } from "./users";
import { healthRoute } from "./health";

export async function registerApiRoutes(app: FastifyInstance) {
  app.register(healthRoute, { prefix: "/api" });
  app.register(roomsRoutes, { prefix: "/api" });
  app.register(flashcardsRoutes, { prefix: "/api" });
  app.register(productsRoutes, { prefix: "/api" });
  app.register(ordersRoutes, { prefix: "/api" });
  app.register(usersRoutes, { prefix: "/api" });
}
