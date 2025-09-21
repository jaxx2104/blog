import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ERROR_MESSAGES } from "@/lib/constants/messages";

export function useGoogleAuth() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const signInWithGoogle = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) throw error;
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL);
      setIsLoading(false);
    }
  };

  return { signInWithGoogle, error, isLoading };
}