import type { FastifyInstance, FastifyPluginCallback } from "fastify";

export const healthRoute: any = function (app: FastifyInstance) {
  app.get("/health", async () => {
    return { ok: true };
  });
};
