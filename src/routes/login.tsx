import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";

import { auth } from "@/integrations/firebase/client";

export const Route = createFileRoute("/login")({
  component: LoginRoute,
  ssr: false,
});

function LoginRoute() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user && !user.isAnonymous) {
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
      const err = e as { code?: string; message?: string };
      const msg =
        err.code === "auth/user-not-found" || err.code === "auth/invalid-credential"
          ? "No account found with that email/password."
          : err.code === "auth/invalid-email"
            ? "Invalid email address."
            : err.code === "auth/too-many-requests"
              ? "Too many attempts. Try again later."
              : (err.message ?? "Login failed");
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
            LOG IN
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
              autoComplete="current-password"
              placeholder="••••••••"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading && email.trim() && password) {
                  submit();
                }
              }}
            />
          </div>

          {error && (
            <div className="border-2 border-danger bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-danger font-bold">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={loading || !email.trim() || !password}
            onClick={submit}
            className="border-2 border-foreground px-4 py-3 font-bold text-sm bg-foreground text-background hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_var(--foreground)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
          >
            {loading ? "SIGNING IN..." : "LOG IN"}
          </button>

          <div className="text-xs text-center border-t-2 border-foreground pt-4 mt-2">
            Don't have an account?{" "}
            <Link to="/signup" className="font-bold underline hover:opacity-80">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
