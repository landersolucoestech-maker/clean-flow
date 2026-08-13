import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Conectando ao Google...");

  const oauthState = useMemo(() => searchParams.get("state") || searchParams.get("oauth_state"), [searchParams]);

  useEffect(() => {
    const notifyOpener = (success: boolean, error: string | null, data?: unknown) => {
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "google-callback",
            success,
            error,
            data,
          },
          window.location.origin
        );
      }
    };

    const handleCallback = async () => {
      const code = searchParams.get("code");
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (error) {
        setStatus("error");
        setMessage(errorDescription || "Autorização negada");
        notifyOpener(false, errorDescription || "Autorização negada");
        return;
      }

      if (!code || !oauthState) {
        setStatus("error");
        setMessage("Parâmetros OAuth inválidos");
        notifyOpener(false, "Parâmetros OAuth inválidos");
        return;
      }

      try {
        const { data, error: callbackError } = await supabase.functions.invoke("google-auth", {
          body: {
            action: "exchange-token",
            code,
            state: oauthState,
          },
        });

        if (callbackError) {
          throw new Error(callbackError.message);
        }

        setStatus("success");
        setMessage("Google conectado com sucesso!");

        notifyOpener(true, null);

        // If this was opened as a popup, close it.
        if (window.opener) {
          setTimeout(() => window.close(), 1200);
          return;
        }

        // Otherwise, navigate back
        setTimeout(() => {
          const returnUrl = typeof data?.returnUrl === "string" ? new URL(data.returnUrl) : null;
          window.location.assign(returnUrl?.origin === window.location.origin ? returnUrl.toString() : "/settings");
        }, 400);
      } catch (err) {
        console.error("Google callback error:", err);
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        setStatus("error");
        setMessage(msg);
        notifyOpener(false, msg);
      }
    };

    handleCallback();
  }, [oauthState, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-center justify-center">
            {status === "loading" && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
            {status === "success" && <CheckCircle className="w-6 h-6 text-success" />}
            {status === "error" && <XCircle className="w-6 h-6 text-destructive" />}
            Google OAuth
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className={`text-lg ${status === "error" ? "text-destructive" : "text-foreground"}`}>
            {message}
          </p>
          {status === "success" && (
            <p className="text-sm text-muted-foreground mt-2">Esta janela fechará automaticamente...</p>
          )}
          {status === "error" && (
            <p className="text-sm text-muted-foreground mt-2">Você pode fechar esta janela e tentar novamente.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
