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

  // Get the first company (single-tenant for now)
  const getCompanyId = useCallback(async () => {
    const { data } = await supabase
      .from("company_settings")
      .select("id")
      .limit(1)
      .single();
    return data?.id;
  }, []);

  // Check connection status
  const checkConnection = useCallback(async () => {
    setIsLoading(true);
    try {
      const companyId = await getCompanyId();
      if (!companyId) {
        setIsConnected(false);
        setConnection(null);
        return;
      }

      const { data, error } = await supabase
        .from("ringcentral_connections")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();

      if (error || !data) {
        setIsConnected(false);
        setConnection(null);
      } else {
        // Check if token is expired
        const isExpired = new Date(data.token_expires_at) < new Date();
        setIsConnected(!isExpired);
        setConnection(data as RingCentralConnection);
      }
    } catch (err) {
      console.error("Failed to check RingCentral connection:", err);
      setIsConnected(false);
      setConnection(null);
    } finally {
      setIsLoading(false);
    }
  }, [getCompanyId]);

  // Initial check
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Start OAuth flow
  const connect = useCallback(async () => {
    setIsLoading(true);
    try {
      const companyId = await getCompanyId();
      if (!companyId) {
        toast.error("Empresa não encontrada. Configure as informações da empresa primeiro.");
        return;
      }

      // Build redirect URI - use the callback page
      const redirectUri = `${window.location.origin}/integrations/ringcentral/callback`;

      const { data, error } = await supabase.functions.invoke("ringcentral-auth", {
        body: {
          company_id: companyId,
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

      console.log("RingCentral OAuth debug", {
        clientId: data.client_id,
        redirectUri: data.redirect_uri ?? redirectUri,
        scope: data.scope,
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

      // Listen for popup messages
      const handleMessage = async (event: MessageEvent) => {
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
  }, [getCompanyId, checkConnection]);

  // Disconnect
  const disconnect = useCallback(async () => {
    setIsLoading(true);
    try {
      const companyId = await getCompanyId();
      if (!companyId) return;

      const { error } = await supabase
        .from("ringcentral_connections")
        .delete()
        .eq("company_id", companyId);

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
  }, [getCompanyId]);

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
