import { supabase } from "@/integrations/supabase/client";

interface OAuthCallbackResponse {
  success?: boolean;
  error?: string;
  phone_number?: string;
  warning?: string | null;
}

async function completeProviderOAuth(
  functionName: "dialpad-callback" | "ringcentral-callback",
  code: string,
  state: string,
  redirectUri: string,
) {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: { code, state, redirect_uri: redirectUri },
  });
  const response = data as OAuthCallbackResponse | null;
  if (error || !response?.success) {
    throw new Error(error?.message || response?.error || "Failed to exchange token");
  }
  return response;
}

export function completeDialpadOAuth(code: string, state: string, redirectUri: string) {
  return completeProviderOAuth("dialpad-callback", code, state, redirectUri);
}

export function completeRingCentralOAuth(code: string, state: string, redirectUri: string) {
  return completeProviderOAuth("ringcentral-callback", code, state, redirectUri);
}
