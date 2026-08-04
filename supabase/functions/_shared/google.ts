import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";

export interface GoogleConnection {
  id: string;
  company_id: string;
  google_user_id: string | null;
  email: string | null;
  name: string | null;
  picture_url: string | null;
  scopes: string[];
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
}

export async function getGoogleConnection(adminClient: SupabaseClient): Promise<GoogleConnection> {
  const { data, error } = await adminClient
    .from("google_connections")
    .select("id, company_id, google_user_id, email, name, picture_url, scopes, access_token, refresh_token, token_expires_at")
    .limit(1)
    .maybeSingle();
  if (error || !data) throw new Error("Google is not connected");

  const connection = data as GoogleConnection;
  if (new Date(connection.token_expires_at).getTime() > Date.now() + 60_000) return connection;

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Google credentials are not configured");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const tokens = await response.json();
  if (!response.ok) throw new Error(tokens.error_description || "Failed to refresh Google token");

  const refreshed = {
    ...connection,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || connection.refresh_token,
    token_expires_at: new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString(),
  };
  const { error: updateError } = await adminClient
    .from("google_connections")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      token_expires_at: refreshed.token_expires_at,
    })
    .eq("id", connection.id);
  if (updateError) throw new Error("Failed to persist refreshed Google token");
  return refreshed;
}
