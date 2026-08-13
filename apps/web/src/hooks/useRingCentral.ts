import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RingCentralConnection {
  id: string;
  company_id: string;
  phone_number: string | null;
  extension_id: string | null;
  account_id: string | null;
  connected_at: string;
  token_expires_at: string;
}

export function useRingCentral() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connection, setConnection] = useState<RingCentralConnection | null>(null);
  const [authDebug, setAuthDebug] = useState<
    | {
        clientId?: string;
        redirectUri?: string;
        scope?: string;
        authUrl?: string;
      }
    | null
  >(null);

  // Check connection status
  const checkConnection = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ringcentral-auth", {
        body: { action: "status" },
      });

      if (error || !data?.connected || !data.connection) {
        setIsConnected(false);
        setConnection(null);
      } else {
        setIsConnected(true);
        setConnection(data.connection as RingCentralConnection);
      }
    } catch (err) {
      console.error("Failed to check RingCentral connection:", err);
      setIsConnected(false);
      setConnection(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial check
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Start OAuth flow
  const connect = useCallback(async () => {
    setIsLoading(true);
    try {
      // Build redirect URI - use the callback page
      const redirectUri = `${window.location.origin}/integrations/ringcentral/callback`;

      const { data, error } = await supabase.functions.invoke("ringcentral-auth", {
        body: {
          action: "get-auth-url",
          redirect_uri: redirectUri,
        },
      });

      if (error || !data?.auth_url) {
        throw new Error(error?.message || "Failed to get authorization URL");
      }

      setAuthDebug({
        clientId: data.client_id,
        redirectUri: data.redirect_uri ?? redirectUri,
        scope: data.scope,
        authUrl: data.auth_url,
      });

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        data.auth_url,
        "ringcentral-oauth",
        `width=${width},height=${height},left=${left},top=${top}`
      );
      if (!popup) throw new Error("O navegador bloqueou a janela de autorização");

      // Listen for popup messages
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin || event.source !== popup) return;
        if (event.data?.type === "ringcentral-callback") {
          window.removeEventListener("message", handleMessage);
          
          if (event.data.success) {
            toast.success("RingCentral conectado com sucesso!");
            await checkConnection();
          } else {
            toast.error(event.data.error || "Falha ao conectar RingCentral");
          }
        }
      };

      window.addEventListener("message", handleMessage);

      // Check if popup was closed without completing
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener("message", handleMessage);
          setIsLoading(false);
        }
      }, 500);

    } catch (err) {
      console.error("RingCentral connect error:", err);
      toast.error("Falha ao iniciar conexão com RingCentral");
      setIsLoading(false);
    }
  }, [checkConnection]);

  // Disconnect
  const disconnect = useCallback(async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke("ringcentral-auth", {
        body: { action: "disconnect" },
      });

      if (error) throw error;

      setIsConnected(false);
      setConnection(null);
      toast.success("RingCentral desconectado");
    } catch (err) {
      console.error("Failed to disconnect RingCentral:", err);
      toast.error("Falha ao desconectar RingCentral");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isConnected,
    isLoading,
    connection,
    authDebug,
    connect,
    disconnect,
    refresh: checkConnection,
  };
}
