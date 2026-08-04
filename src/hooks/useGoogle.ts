import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

interface GoogleUserInfo {
  email: string | null;
  name: string | null;
  picture: string | null;
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: Array<{ email: string }>;
}

export function useGoogle() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<GoogleUserInfo | null>(null);
  const [scopes, setScopes] = useState<string[]>([]);

  const checkConnection = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("google-auth", {
        body: { action: "status" },
      });
      if (error) throw error;
      setIsConnected(data?.connected === true);
      setUserInfo(data?.userInfo || null);
      setScopes(Array.isArray(data?.scopes) ? data.scopes : []);
    } catch {
      setIsConnected(false);
      setUserInfo(null);
      setScopes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkConnection();
    const handleFocus = () => void checkConnection();
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== "google-callback") return;
      if (event.data.success) {
        void checkConnection();
        toast.success("Google conectado com sucesso!");
      } else {
        toast.error(event.data.error || "Falha ao conectar ao Google");
      }
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("message", handleMessage);
    };
  }, [checkConnection]);

  const connect = useCallback(async () => {
    setIsLoading(true);
    try {
      const returnUrl = `${window.location.origin}/settings`;
      const { data, error } = await supabase.functions.invoke("google-auth", {
        body: { action: "get-auth-url", returnUrl },
      });
      if (error || !data?.authUrl) throw error || new Error("Missing authorization URL");

      const opened = window.open(data.authUrl, "_blank", "noopener,noreferrer");
      if (!opened) window.location.assign(data.authUrl);
      else toast.message("Abra a nova aba para concluir o login do Google.");
    } catch (error: unknown) {
      toast.error(`Falha ao conectar: ${getErrorMessage(error, "Erro desconhecido")}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke("google-auth", {
        body: { action: "disconnect" },
      });
      if (error) throw error;
      setIsConnected(false);
      setUserInfo(null);
      setScopes([]);
      toast.success("Google desconectado");
    } catch (error: unknown) {
      toast.error(`Falha ao desconectar: ${getErrorMessage(error, "Erro desconhecido")}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const callApi = useCallback(async (action: string, data?: Record<string, unknown>) => {
    if (!isConnected) throw new Error("Não conectado ao Google");
    const { data: result, error } = await supabase.functions.invoke("google-api", {
      body: { action, data },
    });
    if (error) throw error;
    if (result?.error) throw new Error(result.error.message || result.error);
    return result;
  }, [isConnected]);

  const listCalendars = useCallback(async () => {
    const result = await callApi("list-calendars");
    return result.items || [];
  }, [callApi]);

  const listEvents = useCallback(async (options?: {
    calendarId?: string;
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
  }): Promise<GoogleCalendarEvent[]> => {
    const result = await callApi("list-events", options);
    return result.items || [];
  }, [callApi]);

  const createEvent = useCallback(async (event: {
    summary: string;
    description?: string;
    location?: string;
    startDateTime: string;
    endDateTime: string;
    timeZone?: string;
    attendees?: string[];
    calendarId?: string;
  }) => callApi("create-event", event), [callApi]);

  const updateEvent = useCallback(async (event: {
    eventId: string;
    summary?: string;
    description?: string;
    location?: string;
    startDateTime?: string;
    endDateTime?: string;
    timeZone?: string;
    attendees?: string[];
    calendarId?: string;
  }) => callApi("update-event", event), [callApi]);

  const deleteEvent = useCallback(
    async (eventId: string, calendarId?: string) => callApi("delete-event", { eventId, calendarId }),
    [callApi],
  );

  const hasScope = useCallback(
    (scope: string) => scopes.some((grantedScope) => grantedScope.includes(scope)),
    [scopes],
  );
  const hasCalendarAccess = useCallback(
    () => hasScope("/auth/calendar") || hasScope("/auth/calendar.events"),
    [hasScope],
  );
  const hasAdsAccess = useCallback(() => hasScope("/auth/adwords"), [hasScope]);
  const hasLocalServicesAccess = useCallback(() => hasScope("localservices"), [hasScope]);

  return {
    isConnected,
    isLoading,
    userInfo,
    scopes,
    connect,
    disconnect,
    listCalendars,
    listEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    hasCalendarAccess,
    hasAdsAccess,
    hasLocalServicesAccess,
  };
}
