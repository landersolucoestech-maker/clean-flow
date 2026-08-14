import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSession, subscribeToSession } from "../services/authService";

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void getSession()
      .then((currentSession) => {
        if (!active) return;
        setSession(currentSession);
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setSession(null);
        setIsLoading(false);
      });

    const unsubscribe = subscribeToSession((nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return { session, isLoading };
}
