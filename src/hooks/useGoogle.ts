import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { googleState } from "@/lib/googleState";
import { getErrorMessage } from "@/lib/errors";

interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
}

interface GoogleUserInfo {
  email: string;
  name: string;
  picture: string;
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

const STORAGE_KEY = "google_tokens";
const PENDING_AUTH_KEY = "google_auth_pending";
const GOOGLE_CALLBACK_PATH = "/integrations/google/callback";

export function useGoogle() {
  const [tokens, setTokens] = useState<GoogleTokens | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<GoogleUserInfo | null>(null);
  
  // Use ref to track if we've initialized to avoid double-running effects
  const initialized = useRef(false);

  // Disconnect function (defined early so it can be used in refreshTokens)
  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    googleState.setTokens(null); // Clear global state
    setTokens(null);
    setIsConnected(false);
    setUserInfo(null);
    toast.success("Google desconectado");
  }, []);

  // Refresh tokens function
  const refreshTokens = useCallback(async (refreshToken: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("google-auth", {
        body: { action: "refresh-token", refreshToken },
      });

      if (error) throw error;

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const newTokens = {
        ...stored,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || refreshToken,
        expiresAt: Date.now() + data.expiresIn * 1000,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTokens));
      googleState.setTokens(newTokens as GoogleTokens); // Sync to global state
      setTokens(newTokens);
      setIsConnected(true);
      return newTokens as GoogleTokens & { userInfo?: GoogleUserInfo };
    } catch (error) {
      console.error("[Google] Failed to refresh tokens:", error);
      disconnect();
      return null;
    }
  }, [disconnect]);

  // Exchange token function
  const exchangeToken = useCallback(async (code: string, oauthRedirectUri?: string) => {
    setIsLoading(true);
    try {
      const redirectUri = oauthRedirectUri || `${window.location.origin}${GOOGLE_CALLBACK_PATH}`;

      const { data, error } = await supabase.functions.invoke("google-auth", {
        body: { action: "exchange-token", code, oauthRedirectUri: redirectUri },
      });

      if (error) throw error;

      console.log("[Google] Token exchanged, scope:", data.scope);
      console.log("[Google] Has calendar scope:", data.scope?.includes("calendar"));

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

      const newTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || stored.refreshToken,
        expiresAt: Date.now() + data.expiresIn * 1000,
        scope: data.scope,
        userInfo: data.userInfo,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTokens));
      googleState.setTokens(newTokens as GoogleTokens & { userInfo?: GoogleUserInfo }); // Sync to global state
      localStorage.removeItem(PENDING_AUTH_KEY);
      setTokens(newTokens);
      setUserInfo(data.userInfo);
      setIsConnected(true);
      toast.success("Google conectado com sucesso!");
    } catch (error: unknown) {
      toast.error(`Falha ao trocar token: ${getErrorMessage(error, "Erro desconhecido")}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load tokens from localStorage on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as GoogleTokens & { userInfo?: GoogleUserInfo };
        console.log("[Google] Loaded tokens from storage, scope:", parsed.scope);
        googleState.setTokens(parsed); // Sync to global state
        if (parsed.expiresAt > Date.now()) {
          setTokens(parsed);
          setIsConnected(true);
          if (parsed.userInfo) {
            setUserInfo(parsed.userInfo as GoogleUserInfo);
          }
        } else if (parsed.refreshToken) {
          refreshTokens(parsed.refreshToken);
        }
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, [refreshTokens]);

  // Keep tabs in sync (OAuth flow happens in a different tab)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;

      if (!e.newValue) {
        setTokens(null);
        setIsConnected(false);
        setUserInfo(null);
        return;
      }

      try {
        const parsed = JSON.parse(e.newValue) as GoogleTokens & { userInfo?: GoogleUserInfo };
        setTokens(parsed);
        setIsConnected(true);
        if (parsed.userInfo) setUserInfo(parsed.userInfo as GoogleUserInfo);
      } catch {
        // ignore invalid storage values
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Listen for OAuth completion from the callback window (works even when storage is partitioned in iframes)
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const msg = event.data;
      if (!msg || msg.type !== "google-callback") return;

      localStorage.removeItem(PENDING_AUTH_KEY);

      if (!msg.success) {
        toast.error(msg.error || "Falha ao conectar ao Google");
        return;
      }

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const data = msg.data || {};

      const newTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || stored.refreshToken,
        expiresAt: Date.now() + (data.expiresIn ? data.expiresIn * 1000 : 3600 * 1000),
        scope: data.scope,
        userInfo: data.userInfo,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTokens));
      googleState.setTokens(newTokens as GoogleTokens & { userInfo?: GoogleUserInfo });
      setTokens(newTokens);
      setUserInfo(data.userInfo);
      setIsConnected(true);
      toast.success("Google conectado com sucesso!");
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Check for OAuth callback on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const googleAuth = urlParams.get("google_auth");
    const googleError = urlParams.get("google_error");

    // Only handle redirects we initiated
    if (googleAuth !== "true") return;

    // Clean URL first (keeps the app route stable)
    window.history.replaceState({}, document.title, window.location.pathname);

    if (googleError) {
      localStorage.removeItem(PENDING_AUTH_KEY);
      toast.error(`Google: ${googleError}`);
      return;
    }

    if (code) {
      exchangeToken(code);
    }
  }, [exchangeToken]);

  const connect = useCallback(async () => {
    setIsLoading(true);
    try {
      const returnUrl = `${window.location.origin}${window.location.pathname}`;
      const oauthRedirectUri = `${window.location.origin}${GOOGLE_CALLBACK_PATH}`;

      const { data, error } = await supabase.functions.invoke("google-auth", {
        body: { action: "get-auth-url", returnUrl, oauthRedirectUri },
      });

      if (error) throw error;

      localStorage.setItem(PENDING_AUTH_KEY, "true");

      // IMPORTANT: Google OAuth cannot run inside an iframe.
      // Try to open in a new tab, or redirect if popup blocked.

      // Check if we're inside an iframe (Lovable preview)
      const isInIframe = window.self !== window.top;

      if (isInIframe) {
        try {
          window.top?.open(data.authUrl, "_blank", "noopener,noreferrer");
          toast.message("Abra a nova aba para concluir o login do Google.");
        } catch {
          window.open(data.authUrl, "_blank", "noopener,noreferrer");
          toast.message("Abra a nova aba para concluir o login do Google.");
        }
      } else {
        const opened = window.open(data.authUrl, "_blank", "noopener,noreferrer");
        if (!opened) {
          window.location.href = data.authUrl;
          return;
        }
        toast.message("Abra a nova aba para concluir o login do Google.");
      }
    } catch (error: unknown) {
      toast.error(`Falha ao conectar: ${getErrorMessage(error, "Erro desconhecido")}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const callApi = useCallback(
    async (action: string, data?: Record<string, unknown>) => {
      if (!tokens) {
        throw new Error("Não conectado ao Google");
      }

      let accessToken = tokens.accessToken;

      // Check if token needs refresh
      if (tokens.expiresAt < Date.now() + 60000 && tokens.refreshToken) {
        const refreshed = await refreshTokens(tokens.refreshToken);
        if (refreshed?.accessToken) {
          accessToken = refreshed.accessToken;
        }
      }

      const { data: result, error } = await supabase.functions.invoke("google-api", {
        body: {
          action,
          accessToken,
          data,
        },
      });

      if (error) throw error;
      return result;
    },
    [tokens, refreshTokens]
  );

  // ==================== CALENDAR METHODS ====================
  const listCalendars = useCallback(async () => {
    const result = await callApi("list-calendars");
    return result.items || [];
  }, [callApi]);

  const listEvents = useCallback(
    async (options?: {
      calendarId?: string;
      timeMin?: string;
      timeMax?: string;
      maxResults?: number;
    }): Promise<GoogleCalendarEvent[]> => {
      const result = await callApi("list-events", options);
      return result.items || [];
    },
    [callApi]
  );

  const createEvent = useCallback(
    async (event: {
      summary: string;
      description?: string;
      location?: string;
      startDateTime: string;
      endDateTime: string;
      timeZone?: string;
      attendees?: string[];
      calendarId?: string;
    }) => {
      const result = await callApi("create-event", event);
      return result;
    },
    [callApi]
  );

  const updateEvent = useCallback(
    async (event: {
      eventId: string;
      summary?: string;
      description?: string;
      location?: string;
      startDateTime?: string;
      endDateTime?: string;
      timeZone?: string;
      attendees?: string[];
      calendarId?: string;
    }) => {
      const result = await callApi("update-event", event);
      return result;
    },
    [callApi]
  );

  const deleteEvent = useCallback(
    async (eventId: string, calendarId?: string) => {
      const result = await callApi("delete-event", { eventId, calendarId });
      return result;
    },
    [callApi]
  );

  // ==================== HELPER METHODS ====================
  const hasScope = useCallback(
    (scope: string) => {
      if (!tokens?.scope) return false;
      return tokens.scope.includes(scope);
    },
    [tokens]
  );

  const hasCalendarAccess = useCallback(() => {
    // Alguns tokens retornam apenas calendar.events no `scope`
    return (
      hasScope("https://www.googleapis.com/auth/calendar") ||
      hasScope("https://www.googleapis.com/auth/calendar.events")
    );
  }, [hasScope]);

  const hasAdsAccess = useCallback(() => {
    return hasScope("https://www.googleapis.com/auth/adwords");
  }, [hasScope]);

  const hasLocalServicesAccess = useCallback(() => {
    return hasScope("localservices.pfp.readonly") || hasScope("localservices");
  }, [hasScope]);

  return {
    isConnected,
    isLoading,
    userInfo,
    tokens,
    connect,
    disconnect,
    // Calendar
    listCalendars,
    listEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    // Permissions check
    hasCalendarAccess,
    hasAdsAccess,
    hasLocalServicesAccess,
  };
}
