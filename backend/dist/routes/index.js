import { roomsRoutes } from "./rooms.js";
import { flashcardsRoutes } from "./flashcards.js";
import { healthRoute } from "./health.js";
export async function registerApiRoutes(app) {
    app.register(healthRoute, { prefix: "/api" });
    app.register(roomsRoutes, { prefix: "/api" });
    app.register(flashcardsRoutes, { prefix: "/api" });
}
