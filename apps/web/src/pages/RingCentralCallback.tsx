import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RingCentralCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Conectando ao RingCentral...");

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (error) {
        setStatus("error");
        setMessage(errorDescription || "Autorização negada");
        notifyOpener(false, errorDescription || "Autorização negada");
        return;
      }

      if (!code || !state) {
        setStatus("error");
        setMessage("Parâmetros inválidos");
        notifyOpener(false, "Parâmetros inválidos");
        return;
      }

      try {
        // Build redirect URI (same as auth request)
        const redirectUri = `${window.location.origin}/integrations/ringcentral/callback`;

        const { data, error: callbackError } = await supabase.functions.invoke("ringcentral-callback", {
          body: {
            code,
            state,
            redirect_uri: redirectUri,
          },
        });

        if (callbackError || !data?.success) {
          throw new Error(callbackError?.message || data?.error || "Failed to exchange token");
        }

        setStatus("success");
        setMessage(`Conectado! Número: ${data.phone_number || "N/A"}`);
        notifyOpener(true, null, data.phone_number);

        // Auto-close after success
        setTimeout(() => {
          window.close();
        }, 2000);

      } catch (err) {
        console.error("Callback error:", err);
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Erro desconhecido");
        notifyOpener(false, err instanceof Error ? err.message : "Erro desconhecido");
      }
    };

    handleCallback();
  }, [searchParams]);

  const notifyOpener = (success: boolean, error: string | null, phoneNumber?: string) => {
    if (window.opener) {
      window.opener.postMessage({
        type: "ringcentral-callback",
        success,
        error,
        phoneNumber,
      }, window.location.origin);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-center justify-center">
            {status === "loading" && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
            {status === "success" && <CheckCircle className="w-6 h-6 text-success" />}
            {status === "error" && <XCircle className="w-6 h-6 text-destructive" />}
            RingCentral OAuth
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className={`text-lg ${status === "error" ? "text-destructive" : "text-foreground"}`}>
            {message}
          </p>
          {status === "success" && (
            <p className="text-sm text-muted-foreground mt-2">
              Esta janela fechará automaticamente...
            </p>
          )}
          {status === "error" && (
            <p className="text-sm text-muted-foreground mt-2">
              Você pode fechar esta janela e tentar novamente.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
