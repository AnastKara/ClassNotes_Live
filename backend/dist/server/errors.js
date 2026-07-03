export class HttpError extends Error {
    statusCode;
    code;
    details;
    constructor(statusCode, message, options) {
        super(message);
        this.name = "HttpError";
        this.statusCode = statusCode;
        this.code = options?.code;
        this.details = options?.details;
    }
}
export function registerErrorHandlers(app) {
    app.setErrorHandler((err, _req, reply) => {
        const statusCode = err?.statusCode ?? 500;
        const message = err?.message ?? "Internal Server Error";
        // If you throw Zod/Fastify validation errors they should already have useful messages.
        if (process.env.NODE_ENV !== "production") {
            app.log.error(err);
        }
        else {
            app.log.error({ err }, message);
        }
        return reply.status(statusCode).send({
            error: {
                message,
                ...(typeof err?.code === "string" ? { code: err.code } : {}),
            },
        });
    });
}
export function sendError(reply, statusCode, message) {
    return reply.status(statusCode).send({ error: { message } });
}
