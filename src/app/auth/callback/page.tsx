"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { useUser } from "@/context/user";
import { Loader2 } from "lucide-react";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useUser();

  useEffect(() => {
    async function handleCallback() {
      let session = null;
      const code = searchParams.get("code");

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.session) {
          router.replace("/login");
          return;
        }
        session = data.session;
      } else {
        const { data } = await supabase.auth.getSession();
        session = data.session;
      }

      if (!session) {
        router.replace("/login");
        return;
      }

      const email = session.user.email!;
      const googleName = session.user.user_metadata?.full_name ?? session.user.user_metadata?.name ?? "";

      // Try to load an existing profile
      try {
        const profile = await api.profile.get(email);
        if (profile) {
          setUser(profile);
          router.replace("/dashboard");
        } else {
          // New user — send to profile setup with Google data pre-filled
          const params = new URLSearchParams({ email, name: googleName });
          router.replace(`/profile?${params}`);
        }
      } catch {
        router.replace("/login");
      }
    }

    handleCallback();
  }, [router, searchParams, setUser]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  );
}
