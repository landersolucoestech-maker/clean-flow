import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { getAuthorizedStaffIdentity } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SmsProvider = "ringcentral" | "dialpad";
type SmsProviderPreference = "auto" | SmsProvider;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "SMS gateway is not configured" }, 503);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json().catch(() => ({}));
    const requestedCompanyId = typeof body.company_id === "string" ? body.company_id : null;
    const bearer = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];

    let companyId: string;
    if (bearer === serviceRoleKey) {
      if (!requestedCompanyId) return json({ error: "company_id is required for service requests" }, 400);
      companyId = requestedCompanyId;
    } else {
      const authorization = await getAuthorizedStaffIdentity(
        req,
        admin,
        ["admin", "cleaning_manager", "office_manager", "virtual_assistant"],
      );
      if (authorization.error) return authorization.error;
      companyId = authorization.identity.companyId;
      if (requestedCompanyId && requestedCompanyId !== companyId) return json({ error: "Company scope mismatch" }, 403);
    }

    const toPhone = typeof body.to_phone === "string" ? body.to_phone.trim() : "";
    const message = typeof body.message === "string" ? body.message : "";
    const attachmentUrl = typeof body.attachment_url === "string" && body.attachment_url ? body.attachment_url : null;
    if (!toPhone) return json({ error: "to_phone is required" }, 400);
    if (!message && !attachmentUrl) return json({ error: "message or attachment_url is required" }, 400);

    const [{ data: settingsData, error: settingsError }, { data: ringCentral, error: ringCentralError }, { data: dialpad, error: dialpadError }] = await Promise.all([
      admin.from("company_settings").select("sms_provider").eq("id", companyId).maybeSingle(),
      admin.from("ringcentral_connections").select("id").eq("company_id", companyId).maybeSingle(),
      admin.from("dialpad_connections").select("id").eq("company_id", companyId).maybeSingle(),
    ]);
    if (settingsError || ringCentralError || dialpadError) throw settingsError || ringCentralError || dialpadError;

    const settings = settingsData as { sms_provider?: SmsProviderPreference | null } | null;
    const preference: SmsProviderPreference = settings?.sms_provider || "auto";
    let provider: SmsProvider | null = null;
    if (preference === "ringcentral") provider = ringCentral ? "ringcentral" : null;
    else if (preference === "dialpad") provider = dialpad ? "dialpad" : null;
    else if (ringCentral) provider = "ringcentral";
    else if (dialpad) provider = "dialpad";

    if (!provider) {
      const label = preference === "auto" ? "No SMS provider is connected" : `${preference} is selected but not connected`;
      return json({ error: label, provider_preference: preference }, 409);
    }

    const functionName = provider === "dialpad" ? "dialpad-send-message" : "ringcentral-send-message";
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        company_id: companyId,
        to_phone: toPhone,
        message,
        attachment_url: attachmentUrl,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return json({
        error: typeof payload.error === "string" ? payload.error : `${provider} delivery failed`,
        provider,
        provider_status: response.status,
      }, 502);
    }

    return json({
      success: true,
      provider,
      message_id: payload.message_id != null ? String(payload.message_id) : null,
      type: typeof payload.type === "string" ? payload.type : attachmentUrl ? "MMS" : "SMS",
    });
  } catch (error) {
    console.error("Provider-aware SMS gateway error:", error);
    return json({ error: error instanceof Error ? error.message : "SMS gateway failed" }, 500);
  }
});
