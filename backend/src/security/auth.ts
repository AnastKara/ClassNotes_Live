import type { FastifyRequest } from "fastify";
import jwt from "@fastify/jwt";
import { HttpError } from "../server/errors.js";

// For MVP, require an Authorization: Bearer <supabase_jwt> header.
// Later: verify via Supabase JWT public keys or supabase auth endpoints.
export async function requireAuth(req: FastifyRequest & { user?: { userId: string; claims?: unknown } }) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    throw new HttpError(401, "Unauthorized");
  }
  const token = auth.slice("Bearer ".length);

  // decode without verification (placeholder removed later by proper verification)
  const parts = token.split(".");
  if (parts.length !== 3) throw new HttpError(401, "Unauthorized");

  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    const userId = payload?.sub;
    if (!userId) throw new HttpError(401, "Unauthorized");
    req.user = { userId, claims: payload };
  } catch {
    throw new HttpError(401, "Unauthorized");
  }
}

