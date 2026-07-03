import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export class HttpError extends Error {
  statusCode: number;
  code?: string;
  details?: unknown;

  constructor(statusCode: number, message: string, options?: { code?: string; details?: unknown }) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = options?.code;
    this.details = options?.details;
  }
}

export function registerErrorHandlers(app: FastifyInstance) {
  app.setErrorHandler((err, _req, reply) => {
    const statusCode = (err as any)?.statusCode ?? 500;
    const message = (err as any)?.message ?? "Internal Server Error";

    // If you throw Zod/Fastify validation errors they should already have useful messages.
    if (process.env.NODE_ENV !== "production") {
      app.log.error(err);
    } else {
      app.log.error({ err }, message);
    }

    return reply.status(statusCode).send({
      error: {
        message,
        ...(typeof (err as any)?.code === "string" ? { code: (err as any).code } : {}),
      },
    });
  });
}

export function sendError(reply: FastifyReply, statusCode: number, message: string) {
  return reply.status(statusCode).send({ error: { message } });
}

export type AuthedRequest = FastifyRequest & { user?: { userId: string; claims?: unknown } };

