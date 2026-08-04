import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { getAuthorizedStaffIdentity, type StaffRole } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const roles: StaffRole[] = [
  "admin", "cleaner", "driver", "cleaning_manager", "office_manager", "virtual_assistant",
];

function response(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function optionalText(value: unknown, maxLength = 255): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null;
}

function validEmail(value: unknown): value is string {
  return typeof value === "string"
    && value.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const siteUrl = Deno.env.get("SITE_URL");
    if (!supabaseUrl || !serviceRoleKey || !siteUrl) return response({ error: "Staff management is not configured" }, 503);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const authorization = await getAuthorizedStaffIdentity(req, adminClient, roles);
    if (authorization.error) return authorization.error;

    const body = await req.json();
    const action = body.action;

    if (action === "update-profile") {
      const name = optionalText(body.name, 120);
      if (!name) return response({ error: "Valid name is required" }, 400);
      const phone = optionalText(body.phone, 40);
      const { data: staff, error } = await adminClient
        .from("staff")
        .update({ name, phone })
        .eq("id", authorization.identity.staffId)
        .select("*")
        .single();
      if (error || !staff) return response({ error: "Unable to update profile" }, 400);
      const { error: authError } = await adminClient.auth.admin.updateUserById(authorization.identity.userId, {
        user_metadata: { full_name: name, phone },
      });
      if (authError) console.error("Profile saved but Auth metadata synchronization failed");
      return response({ staff, auth_metadata_synced: !authError });
    }

    if (!["admin", "office_manager"].includes(authorization.identity.role)) {
      return response({ error: "Your role cannot manage staff accounts" }, 403);
    }

    if (action === "invite") {
      const name = optionalText(body.name, 120);
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const role = body.role as StaffRole;
      if (!name || !validEmail(email) || !roles.includes(role)) {
        return response({ error: "Valid name, email and role are required" }, 400);
      }

      const { data: existing } = await adminClient
        .from("staff")
        .select("id")
        .ilike("email", email)
        .maybeSingle();
      if (existing) return response({ error: "A staff member already uses this email" }, 409);

      const redirectTo = new URL("/set-password", siteUrl).toString();
      const { data: invitation, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { full_name: name },
      });
      if (inviteError || !invitation.user) return response({ error: "Unable to invite this email" }, 400);

      const { data: staff, error: staffError } = await adminClient
        .from("staff")
        .insert({
          name,
          email,
          auth_user_id: invitation.user.id,
          phone: optionalText(body.phone, 40),
          is_driver: role === "driver",
          is_active: body.is_active !== false,
          team: optionalText(body.team, 80),
          payment_method: optionalText(body.payment_method, 40) || "zelle",
          zelle_key: optionalText(body.zelle_key, 255),
          quickbooks_vendor_id: optionalText(body.quickbooks_vendor_id, 255),
        })
        .select("*")
        .single();
      if (staffError || !staff) {
        await adminClient.auth.admin.deleteUser(invitation.user.id);
        return response({ error: "Unable to create staff record" }, 400);
      }

      const { error: roleError } = await adminClient.from("staff_roles").insert({ staff_id: staff.id, role });
      if (roleError) {
        await adminClient.from("staff").delete().eq("id", staff.id);
        await adminClient.auth.admin.deleteUser(invitation.user.id);
        return response({ error: "Unable to assign staff role" }, 400);
      }

      return response({ staff: { ...staff, staff_roles: { role } }, invited: true }, 201);
    }

    if (action === "update") {
      const id = optionalText(body.id, 36);
      const name = optionalText(body.name, 120);
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const role = body.role as StaffRole;
      if (!id || !name || !validEmail(email) || !roles.includes(role)) {
        return response({ error: "Valid id, name, email and role are required" }, 400);
      }

      const { data: current, error: currentError } = await adminClient
        .from("staff")
        .select("*, staff_roles(role)")
        .eq("id", id)
        .single();
      if (currentError || !current) return response({ error: "Staff member not found" }, 404);

      if (current.auth_user_id) {
        const { error } = await adminClient.auth.admin.updateUserById(current.auth_user_id, {
          email,
          user_metadata: { full_name: name },
        });
        if (error) return response({ error: "Unable to update the staff login" }, 400);
      }

      const { data: staff, error: staffError } = await adminClient
        .from("staff")
        .update({
          name,
          email,
          phone: optionalText(body.phone, 40),
          is_driver: role === "driver",
          is_active: body.is_active !== false,
          team: optionalText(body.team, 80),
          payment_method: optionalText(body.payment_method, 40) || "zelle",
          zelle_key: optionalText(body.zelle_key, 255),
          quickbooks_vendor_id: optionalText(body.quickbooks_vendor_id, 255),
        })
        .eq("id", id)
        .select("*")
        .single();
      if (staffError || !staff) return response({ error: "Unable to update staff record" }, 400);

      const { error: roleError } = await adminClient
        .from("staff_roles")
        .upsert({ staff_id: id, role }, { onConflict: "staff_id" });
      if (roleError) return response({ error: "Unable to update staff role" }, 400);

      return response({ staff: { ...staff, staff_roles: { role } } });
    }

    if (action === "delete") {
      const id = optionalText(body.id, 36);
      if (!id) return response({ error: "Staff id is required" }, 400);
      if (id === authorization.identity.staffId) return response({ error: "You cannot delete your own account" }, 409);

      const { data: staff, error: findError } = await adminClient
        .from("staff")
        .select("auth_user_id")
        .eq("id", id)
        .single();
      if (findError || !staff) return response({ error: "Staff member not found" }, 404);

      const { error: deleteError } = await adminClient.from("staff").delete().eq("id", id);
      if (deleteError) return response({ error: "Unable to delete staff record" }, 400);

      if (staff.auth_user_id) {
        const { error } = await adminClient.auth.admin.deleteUser(staff.auth_user_id);
        if (error) console.error("Staff record deleted but Auth user cleanup failed");
      }
      return response({ success: true });
    }

    return response({ error: "Invalid action" }, 400);
  } catch (error) {
    console.error("Staff management error:", error);
    return response({ error: "Staff management failed" }, 500);
  }
});
