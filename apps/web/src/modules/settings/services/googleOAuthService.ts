import { supabase } from "@/integrations/supabase/client";

interface GoogleOAuthResponse {
  returnUrl?: string;
}

export async function completeGoogleOAuth(code: string, state: string) {
  const { data, error } = await supabase.functions.invoke("google-auth", {
    body: {
      action: "exchange-token",
      code,
      state,
    },
  });
  if (error) throw error;
  return (data || {}) as GoogleOAuthResponse;
}
