import { createMiddleware } from "@tanstack/react-start";
import { auth } from "../integrations/firebase/client.ts";

export const attachFirebaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;

    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);