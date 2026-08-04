import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GuardProps {
  children: ReactNode;
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading session" />
    </div>
  );
}

function useSupabaseSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { session, isLoading };
}

export function AuthenticatedRoute({ children }: GuardProps) {
  const { session, isLoading } = useSupabaseSession();
  const location = useLocation();

  if (isLoading) return <LoadingScreen />;
  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export function PlatformAdminRoute({ children }: GuardProps) {
  const { session, isLoading: isSessionLoading } = useSupabaseSession();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session?.user.id) {
      setIsAdmin(false);
      return;
    }

    let active = true;
    void supabase
      .rpc("is_platform_admin", { _user_id: session.user.id })
      .then(({ data, error }) => {
        if (!active) return;
        setIsAdmin(!error && data === true);
      });

    return () => {
      active = false;
    };
  }, [session?.user.id]);

  if (isSessionLoading || (session && isAdmin === null)) return <LoadingScreen />;
  if (!session || !isAdmin) return <Navigate to="/admin/auth" replace />;

  return children;
}
