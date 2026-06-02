"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth";

export default function LoginPage() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  // Already signed in — send them through
  useEffect(() => {
    if (!loading && session) router.replace("/dashboard");
  }, [session, loading, router]);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setSigningIn(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setSigningIn(false);
      setAuthError(
        error.message.includes("provider is not enabled")
          ? "Google sign-in is not configured for this project yet."
          : error.message
      );
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary mx-auto mb-4">
            <span className="font-mono text-lg font-bold text-primary-foreground">A</span>
          </div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">AthleteTracker</h1>
          <p className="text-sm text-muted-foreground mt-2">Know before you go.</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-foreground mb-1">Sign in</h2>
          <p className="text-sm text-muted-foreground mb-6">Continue to your P&L dashboard</p>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="w-full inline-flex items-center justify-center gap-3 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {signingIn ? "Redirecting..." : "Continue with Google"}
          </button>

          {authError ? (
            <p role="alert" className="mt-4 rounded-lg border border-loss/30 bg-loss-soft px-3 py-2 text-sm text-loss">
              {authError}
            </p>
          ) : null}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By signing in you agree to our{" "}
          <a href="#" className="underline underline-offset-2 hover:text-foreground">Terms</a>{" "}
          and{" "}
          <a href="#" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
