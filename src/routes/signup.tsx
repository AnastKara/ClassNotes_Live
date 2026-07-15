import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { onAuthStateChanged, createUserWithEmailAndPassword } from "firebase/auth";


import { auth } from "@/integrations/firebase/client";

export const Route = createFileRoute("/signup")({
  component: SignupRoute,
  ssr: false,
});

type Role = "student" | "teacher";

type ApiError = { error?: { message?: string } } | { message?: string };

function SignupRoute() {
  const navigate = useNavigate();
  const apiBase = useMemo(() => import.meta.env.VITE_API_BASE_URL ?? "", []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) navigate({ to: "/" });
    });
    return () => unsub();
  }, [navigate]);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);


      // Persist role to backend custom claims + profile
      const user = userCred.user;
      if (!user) throw new Error("User not available after signup");

      const idToken = await user.getIdToken(true);

      const res = await fetch(`${apiBase}/api/users/role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as ApiError;
        const msg = (data as any)?.error?.message
          ? (data as any).error.message
          : (data as any)?.message ?? "Failed to set role";
        throw new Error(msg);

      }

      navigate({ to: "/" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md border border-border rounded-md p-6">
        <h1 className="text-xl font-semibold">Sign up</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose teacher or student — you can’t change it here.
        </p>

        <div className="mt-5 flex flex-col gap-3">
          <label className="text-sm">
            <div className="text-xs text-muted-foreground mb-1">Email</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="w-full bg-background border border-border px-3 py-2 rounded outline-none focus:border-accent focus:ring-2 focus:ring-accent/40"
              autoComplete="email"
            />
          </label>

          <label className="text-sm">
            <div className="text-xs text-muted-foreground mb-1">Password</div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="w-full bg-background border border-border px-3 py-2 rounded outline-none focus:border-accent focus:ring-2 focus:ring-accent/40"
              autoComplete="new-password"
            />
          </label>

          <div className="mt-2">
            <div className="text-xs text-muted-foreground mb-2">Account type</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRole("student")}
                className={
                  "flex-1 border px-3 py-2 rounded transition-colors " +
                  (role === "student"
                    ? "border-accent/50 bg-accent/10 text-accent"
                    : "border-border hover:bg-muted")
                }
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setRole("teacher")}
                className={
                  "flex-1 border px-3 py-2 rounded transition-colors " +
                  (role === "teacher"
                    ? "border-accent/50 bg-accent/10 text-accent"
                    : "border-border hover:bg-muted")
                }
              >
                Teacher
              </button>
            </div>
          </div>

          {error && <div className="text-sm text-danger">{error}</div>}

          <button
            type="button"
            disabled={loading || !email.trim() || password.length < 6}
            onClick={submit}
            className="border border-border px-4 py-2 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>

          <div className="text-xs text-muted-foreground">
            Already have an account?{" "}
            <a className="text-accent hover:underline" href="/login">
              Log in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

