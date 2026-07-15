import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import formbody from "@fastify/formbody";
import { registerApiRoutes } from "../routes/index.js";
import { registerErrorHandlers } from "./errors";
import { registerWsHandlers } from "./ws";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
    },
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(websocket);
  await app.register(formbody);

  await registerApiRoutes(app);
  await registerWsHandlers(app);
  registerErrorHandlers(app);

  return app;
}
