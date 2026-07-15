import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { createUserWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";

import { auth } from "@/integrations/firebase/client";

export const Route = createFileRoute("/signup")({
  component: SignupRoute,
  ssr: false,
});

type Role = "student" | "teacher";

function SignupRoute() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && !user.isAnonymous) navigate({ to: "/" });
    });
    return () => unsub();
  }, [navigate]);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);

      const user = userCred.user;
      if (!user) throw new Error("User not available after signup");

      const idToken = await user.getIdToken(true);

      const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
      const res = await fetch(`${apiBase}/api/users/role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        // If role assignment fails, the user is created in Firebase Auth
        // but has no role in our backend. That's okay — they can still log in
        // and the role will be set to default.
        console.warn("Role assignment failed, continuing with default role");
      }

      navigate({ to: "/" });
    } catch (e) {
      const err = e as { code?: string; message?: string };
      const msg =
        err.code === "auth/email-already-in-use"
          ? "An account with this email already exists."
          : err.code === "auth/weak-password"
            ? "Password must be at least 6 characters."
            : err.code === "auth/invalid-email"
              ? "Invalid email address."
              : err.code === "auth/too-many-requests"
                ? "Too many attempts. Try again later."
                : (err.message ?? "Signup failed");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm border-2 border-foreground p-8 shadow-[8px_8px_0px_0px_var(--foreground)]">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="text-3xl font-black tracking-tighter">classnotes.live</div>
          <div className="text-xs mt-1 border-2 border-foreground inline-block px-2 py-0.5 font-bold">
            SIGN UP
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold block mb-1">EMAIL</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="w-full bg-background border-2 border-foreground px-3 py-2 outline-none text-sm focus:shadow-[2px_2px_0px_0px_var(--foreground)] transition-shadow"
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-xs font-bold block mb-1">PASSWORD</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="w-full bg-background border-2 border-foreground px-3 py-2 outline-none text-sm focus:shadow-[2px_2px_0px_0px_var(--foreground)] transition-shadow"
              autoComplete="new-password"
              placeholder="at least 6 characters"
            />
          </div>

          <div>
            <label className="text-xs font-bold block mb-2">ACCOUNT TYPE</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRole("student")}
                className={
                  "flex-1 border-2 px-3 py-2 font-bold text-sm transition-colors " +
                  (role === "student"
                    ? "bg-foreground text-background border-foreground"
                    : "border-foreground hover:bg-foreground hover:text-background")
                }
              >
                STUDENT
              </button>
              <button
                type="button"
                onClick={() => setRole("teacher")}
                className={
                  "flex-1 border-2 px-3 py-2 font-bold text-sm transition-colors " +
                  (role === "teacher"
                    ? "bg-foreground text-background border-foreground"
                    : "border-foreground hover:bg-foreground hover:text-background")
                }
              >
                TEACHER
              </button>
            </div>
          </div>

          {error && (
            <div className="border-2 border-danger bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-danger font-bold">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={loading || !email.trim() || password.length < 6}
            onClick={submit}
            className="border-2 border-foreground px-4 py-3 font-bold text-sm bg-foreground text-background hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_var(--foreground)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
          >
            {loading
              ? "CREATING ACCOUNT..."
              : role === "teacher"
                ? "CREATE TEACHER ACCOUNT"
                : "CREATE STUDENT ACCOUNT"}
          </button>

          <div className="text-xs text-center border-t-2 border-foreground pt-4 mt-2">
            Already have an account?{" "}
            <Link to="/login" className="font-bold underline hover:opacity-80">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
