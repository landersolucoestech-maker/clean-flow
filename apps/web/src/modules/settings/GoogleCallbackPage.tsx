import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { completeGoogleOAuth } from "./services/googleOAuthService";

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Conectando ao Google...");

  const oauthState = useMemo(() => searchParams.get("state") || searchParams.get("oauth_state"), [searchParams]);

  useEffect(() => {
    const notifyOpener = (success: boolean, error: string | null, data?: unknown) => {
      if (!window.opener) return;
      window.opener.postMessage(
        {
          type: "google-callback",
          success,
          error,
          data,
        },
        window.location.origin,
      );
    };

    const handleCallback = async () => {
      const code = searchParams.get("code");
      const providerError = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (providerError) {
        const errorMessage = errorDescription || "Autorização negada";
        setStatus("error");
        setMessage(errorMessage);
        notifyOpener(false, errorMessage);
        return;
      }

      if (!code || !oauthState) {
        setStatus("error");
        setMessage("Parâmetros OAuth inválidos");
        notifyOpener(false, "Parâmetros OAuth inválidos");
        return;
      }

      try {
        const data = await completeGoogleOAuth(code, oauthState);
        setStatus("success");
        setMessage("Google conectado com sucesso!");
        notifyOpener(true, null);

        if (window.opener) {
          window.setTimeout(() => window.close(), 1200);
          return;
        }

        window.setTimeout(() => {
          const returnUrl = typeof data.returnUrl === "string" ? new URL(data.returnUrl) : null;
          window.location.assign(returnUrl?.origin === window.location.origin ? returnUrl.toString() : "/settings");
        }, 400);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        setStatus("error");
        setMessage(errorMessage);
        notifyOpener(false, errorMessage);
      }
    };

    void handleCallback();
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
