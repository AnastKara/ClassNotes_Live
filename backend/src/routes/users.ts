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

  // Set auth role (teacher / student) for the current user
  app.post(
    "/users/role",
    {
      preHandler: requireAuth as any,
    },
    async (req: AuthedReq) => {
      const body = req.body as any;
      const role = body?.role as "teacher" | "student" | undefined;

      if (role !== "teacher" && role !== "student") {
        throw new (await import("../server/errors.js")).HttpError(400, "Invalid role");
      }

      const result = await userService.setUserRole(req.user!.userId, role);
      return { user: result };
    },
  );
}

