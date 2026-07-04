import type { FastifyRequest } from "fastify";
import { getFirebaseAuthAdmin } from "../services/firebase-admin.js";
import { HttpError } from "../server/errors.js";

export type AuthedUser = {
  userId: string;
  claims?: unknown;
  role?: string;
};

export async function requireAuth(
  req: FastifyRequest & { user?: AuthedUser },
) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    throw new HttpError(401, "Unauthorized");
  }

  const idToken = auth.slice("Bearer ".length);

  try {
    const decoded = await getFirebaseAuthAdmin().verifyIdToken(idToken);

    // Standard UID
    const userId = decoded.uid;

    // Custom claims (optional). Firebase returns all custom claims in decoded.
    // Example: { role: "teacher" }
    const claims = decoded;
    const role = (decoded as any).role;

    req.user = { userId, claims, role };
  } catch {
    throw new HttpError(401, "Unauthorized");
  }
}

