import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Enums } from "@/integrations/supabase/types";

export type AppRole = Enums<"app_role">;
export type StaffIdentity = { id: string; role: AppRole };

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle(redirectTo: string) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) throw error;
}

export async function requestPasswordReset(email: string, redirectTo: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function bootstrapFirstAdmin(companyName: string, staffName: string | null) {
  const { error } = await supabase.rpc("bootstrap_first_admin", {
    company_name: companyName,
    staff_name: staffName,
  });
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function subscribeToSession(onSession: (session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => onSession(session));
  return () => data.subscription.unsubscribe();
}

export async function getCurrentStaffIdentity(): Promise<StaffIdentity | null> {
  const { data: staffId, error: staffIdError } = await supabase.rpc("current_staff_id");
  if (staffIdError) throw staffIdError;
  if (!staffId) return null;

  const { data, error } = await supabase
    .from("staff")
    .select("id, staff_roles(role)")
    .eq("id", staffId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const roleJoin = data.staff_roles;
  const role = (Array.isArray(roleJoin) ? roleJoin[0]?.role : roleJoin?.role) as AppRole | undefined;
  return role ? { id: data.id, role } : null;
}

export async function isPlatformAdmin(userId: string) {
  const { data, error } = await supabase.rpc("is_platform_admin", { _user_id: userId });
  if (error) throw error;
  return data === true;
}

export async function verifyPlatformAdminCredentials(email: string, password: string) {
  const auth = await signIn(email, password);
  const userId = auth.user?.id;
  if (!userId) {
    await signOut();
    throw new Error("Access denied. You are not a platform administrator.");
  }

  const { data, error } = await supabase
    .from("platform_admins")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    await signOut();
    throw new Error("Access denied. You are not a platform administrator.");
  }

  return auth;
}
