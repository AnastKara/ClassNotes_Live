import type { FastifyInstance } from "fastify";
import { requireAuth } from "../security/auth.js";
import { UserService } from "../services/user-service.js";
import { buildUserProfileDto } from "../services/dto.js";

type AuthedReq = { user?: { userId: string } } & any;

export async function usersRoutes(app: FastifyInstance) {
  const userService = new UserService();

  // Get current user profile
  app.get(
    "/users/me",
    {
      preHandler: requireAuth as any,
    },
    async (req: AuthedReq) => {
      const profile = await userService.getUserProfile(req.user!.userId);
      return { user: buildUserProfileDto(profile) };
    },
  );

  // Update current user profile
  app.patch(
    "/users/me",
    {
      preHandler: requireAuth as any,
    },
    async (req: AuthedReq) => {
      const updates = req.body as any;
      const updated = await userService.updateUserProfile(req.user!.userId, updates);
      return { user: buildUserProfileDto(updated) };
    },
  );
}