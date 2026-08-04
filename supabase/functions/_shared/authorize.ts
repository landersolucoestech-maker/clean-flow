import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type StaffRole =
  | "admin"
  | "cleaner"
  | "driver"
  | "cleaning_manager"
  | "office_manager"
  | "virtual_assistant";

const responseHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

function authorizationResponse(status: number, error: string, code: string): Response {
  return new Response(JSON.stringify({ error, code }), {
    status,
    headers: responseHeaders,
  });
}

export async function authorizeStaffRequest(
  req: Request,
  adminClient: SupabaseClient,
  allowedRoles: StaffRole[],
  options: { allowServiceRole?: boolean } = {},
): Promise<Response | null> {
  const authorization = req.headers.get("Authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) {
    return authorizationResponse(401, "Authentication required", "UNAUTHENTICATED");
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (options.allowServiceRole && serviceRoleKey && accessToken === serviceRoleKey) {
    return null;
  }

  const { data: authData, error: authError } = await adminClient.auth.getUser(accessToken);
  const email = authData.user?.email;
  if (authError || !email) {
    return authorizationResponse(401, "Invalid authentication token", "UNAUTHENTICATED");
  }

  const { data: staffMatches, error: staffError } = await adminClient
    .from("staff")
    .select("id, staff_roles(role)")
    .ilike("email", email)
    .eq("is_active", true)
    .limit(2);

  if (staffError || staffMatches?.length !== 1) {
    return authorizationResponse(
      403,
      "The authenticated account is not linked to exactly one active staff member",
      "STAFF_IDENTITY_REQUIRED",
    );
  }

  const roleJoin = staffMatches[0].staff_roles;
  const role = (Array.isArray(roleJoin) ? roleJoin[0]?.role : roleJoin?.role) as StaffRole | undefined;
  if (!role || !allowedRoles.includes(role)) {
    return authorizationResponse(403, "Your role cannot perform this action", "PERMISSION_DENIED");
  }

  return null;
}

export function authorizeServiceRequest(req: Request): Response | null {
  const authorization = req.headers.get("Authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!serviceRoleKey || accessToken !== serviceRoleKey) {
    return authorizationResponse(401, "Valid service credentials are required", "UNAUTHENTICATED");
  }

  return null;
}
