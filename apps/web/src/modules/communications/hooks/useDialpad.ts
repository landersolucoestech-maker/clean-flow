import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SmsProviderPreference = "auto" | "ringcentral" | "dialpad";

interface DialpadConnection {
  id: string;
  company_id: string;
  dialpad_user_id: string | null;
  email: string | null;
  display_name: string | null;
  phone_number: string | null;
  connected_at: string;
  token_expires_at: string;
  scopes: string[];
}

export function useDialpad() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connection, setConnection] = useState<DialpadConnection | null>(null);
  const [smsProvider, setSmsProviderState] = useState<SmsProviderPreference>("auto");

  const checkConnection = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("dialpad-auth", {
        body: { action: "status" },
      });
      if (error) throw error;
      setIsConnected(Boolean(data?.connected && data?.connection));
      setConnection(data?.connection || null);
      setSmsProviderState((data?.sms_provider || "auto") as SmsProviderPreference);
    } catch (error) {
      console.error("Failed to check Dialpad connection:", error);
      setIsConnected(false);
      setConnection(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const connect = useCallback(async () => {
    setIsLoading(true);
    try {
      const redirectUri = `${window.location.origin}/integrations/dialpad/callback`;
      const { data, error } = await supabase.functions.invoke("dialpad-auth", {
        body: { action: "get-auth-url", redirect_uri: redirectUri },
      });
      if (error || !data?.auth_url) throw new Error(error?.message || "Failed to get Dialpad authorization URL");

      const width = 600;
      const height = 720;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        data.auth_url,
        "dialpad-oauth",
        `width=${width},height=${height},left=${left},top=${top}`,
      );
      if (!popup) throw new Error("O navegador bloqueou a janela de autorização");

      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin || event.source !== popup) return;
        if (event.data?.type !== "dialpad-callback") return;
        window.removeEventListener("message", handleMessage);
        if (event.data.success) {
          toast.success("Dialpad conectado com sucesso!");
          if (event.data.warning) toast.warning(event.data.warning);
          await checkConnection();
        } else {
          toast.error(event.data.error || "Falha ao conectar Dialpad");
        }
      };
      window.addEventListener("message", handleMessage);

      const checkClosed = window.setInterval(() => {
        if (!popup.closed) return;
        window.clearInterval(checkClosed);
        window.removeEventListener("message", handleMessage);
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error("Dialpad connect error:", error);
      toast.error(error instanceof Error ? error.message : "Falha ao iniciar conexão com Dialpad");
      setIsLoading(false);
    }
  }, [checkConnection]);

  const disconnect = useCallback(async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke("dialpad-auth", {
        body: { action: "disconnect" },
      });
      if (error) throw error;
      setIsConnected(false);
      setConnection(null);
      setSmsProviderState("auto");
      toast.success("Dialpad desconectado");
    } catch (error) {
      console.error("Failed to disconnect Dialpad:", error);
      toast.error("Falha ao desconectar Dialpad");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setSmsProvider = useCallback(async (provider: SmsProviderPreference) => {
    const previous = smsProvider;
    setSmsProviderState(provider);
    try {
      const { data, error } = await supabase.functions.invoke("dialpad-auth", {
        body: { action: "set-provider", provider },
      });
      if (error || !data?.success) throw new Error(error?.message || "Unable to update SMS provider");
      toast.success(provider === "auto" ? "Provedor SMS definido como automático" : `Provedor SMS definido como ${provider === "dialpad" ? "Dialpad" : "RingCentral"}`);
    } catch (error) {
      setSmsProviderState(previous);
      console.error("Failed to update SMS provider:", error);
      toast.error("Falha ao alterar o provedor de SMS");
    }
  }, [smsProvider]);

  return {
    isConnected,
    isLoading,
    connection,
    smsProvider,
    connect,
    disconnect,
    setSmsProvider,
    refresh: checkConnection,
  };
}
