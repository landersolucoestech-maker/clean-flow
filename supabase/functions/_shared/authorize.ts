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

export interface AuthorizedStaffIdentity {
  userId: string;
  email: string;
  staffId: string;
  role: StaffRole;
}

type StaffAuthorizationResult =
  | { identity: AuthorizedStaffIdentity; error: null }
  | { identity: null; error: Response };

export async function getAuthorizedStaffIdentity(
  req: Request,
  adminClient: SupabaseClient,
  allowedRoles: StaffRole[],
): Promise<StaffAuthorizationResult> {
  const authorization = req.headers.get("Authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) {
    return { identity: null, error: authorizationResponse(401, "Authentication required", "UNAUTHENTICATED") };
  }

  const { data: authData, error: authError } = await adminClient.auth.getUser(accessToken);
  const user = authData.user;
  if (authError || !user?.email) {
    return { identity: null, error: authorizationResponse(401, "Invalid authentication token", "UNAUTHENTICATED") };
  }

  const staffSelection = "id, staff_roles(role)";
  const { data: identityMatches, error: identityError } = await adminClient
    .from("staff")
    .select(staffSelection)
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .limit(2);

  let staffMatches = identityMatches;
  let staffError = identityError;
  if (!staffError && staffMatches?.length === 0) {
    const fallback = await adminClient
      .from("staff")
      .select(staffSelection)
      .is("auth_user_id", null)
      .ilike("email", user.email)
      .eq("is_active", true)
      .limit(2);
    staffMatches = fallback.data;
    staffError = fallback.error;
  }

  if (staffError || staffMatches?.length !== 1) {
    return {
      identity: null,
      error: authorizationResponse(
        403,
        "The authenticated account is not linked to exactly one active staff member",
        "STAFF_IDENTITY_REQUIRED",
      ),
    };
  }

  const roleJoin = staffMatches[0].staff_roles;
  const role = (Array.isArray(roleJoin) ? roleJoin[0]?.role : roleJoin?.role) as StaffRole | undefined;
  if (!role || !allowedRoles.includes(role)) {
    return {
      identity: null,
      error: authorizationResponse(403, "Your role cannot perform this action", "PERMISSION_DENIED"),
    };
  }

  return {
    identity: { userId: user.id, email: user.email, staffId: staffMatches[0].id, role },
    error: null,
  };
}

export async function authorizeStaffRequest(
  req: Request,
  adminClient: SupabaseClient,
  allowedRoles: StaffRole[],
  options: { allowServiceRole?: boolean } = {},
): Promise<Response | null> {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (options.allowServiceRole && serviceRoleKey && accessToken === serviceRoleKey) {
    return null;
  }

  const result = await getAuthorizedStaffIdentity(req, adminClient, allowedRoles);
  return result.error;
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
