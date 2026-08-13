import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";

export interface QuickBooksConnection {
  id: string;
  company_id: string;
  realm_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
}

export async function getQuickBooksConnection(
  adminClient: SupabaseClient,
  companyId?: string,
): Promise<QuickBooksConnection> {
  let query = adminClient
    .from("quickbooks_connections")
    .select("id, company_id, realm_id, access_token, refresh_token, token_expires_at");

  if (companyId) query = query.eq("company_id", companyId);

  // Without an explicit company, maybeSingle intentionally fails when multiple
  // connections exist instead of silently selecting another tenant's token.
  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    throw new Error(companyId
      ? "QuickBooks is not connected for this company"
      : "QuickBooks connection is ambiguous or not configured");
  }

  const connection = data as QuickBooksConnection;
  if (new Date(connection.token_expires_at).getTime() > Date.now() + 60_000) {
    return connection;
  }

  const clientId = Deno.env.get("QUICKBOOKS_CLIENT_ID");
  const clientSecret = Deno.env.get("QUICKBOOKS_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("QuickBooks credentials are not configured");

  const response = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
    }),
  });
  const tokens = await response.json();
  if (!response.ok) throw new Error(tokens.error_description || "Failed to refresh QuickBooks token");

  const refreshed: QuickBooksConnection = {
    ...connection,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || connection.refresh_token,
    token_expires_at: new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString(),
  };

  const { error: updateError } = await adminClient
    .from("quickbooks_connections")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      token_expires_at: refreshed.token_expires_at,
    })
    .eq("id", connection.id)
    .eq("company_id", connection.company_id);
  if (updateError) throw new Error("Failed to persist refreshed QuickBooks token");

  return refreshed;
}

export function quickBooksHeaders(accessToken: string): Record<string, string> {
  return {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
}
