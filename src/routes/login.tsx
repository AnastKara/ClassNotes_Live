import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";

import { auth } from "@/integrations/firebase/client";

export const Route = createFileRoute("/login")({
  component: LoginRoute,
  ssr: false,
});

type AuthErrorShape = { code?: string; message?: string };

function LoginRoute() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = useMemo(() => import.meta.env.VITE_API_BASE_URL ?? "", []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        navigate({ to: "/" });
      }
    });
    return () => unsub();
  }, [navigate]);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate({ to: "/" });
    } catch (e) {
      const err = e as AuthErrorShape;
      setError(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md border border-border rounded-md p-6">
        <h1 className="text-xl font-semibold">Log in</h1>
        <p className="text-sm text-muted-foreground mt-1">Use your email/password.</p>

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
              autoComplete="current-password"
            />
          </label>

          {error && <div className="text-sm text-danger">{error}</div>}

          <button
            type="button"
            disabled={loading || !email.trim() || !password}
            onClick={submit}
            className="border border-border px-4 py-2 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Log in"}
          </button>

          <div className="text-xs text-muted-foreground">
            Don’t have an account?{" "}
            <a className="text-accent hover:underline" href="/signup">
              Sign up
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

