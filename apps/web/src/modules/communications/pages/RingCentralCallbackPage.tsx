import { T } from "@/shared/components/i18n/T";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { completeRingCentralOAuth } from "../services/communicationsOAuthService";

export default function RingCentralCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Conectando ao RingCentral...");

  useEffect(() => {
    const notifyOpener = (success: boolean, error: string | null, phoneNumber?: string) => {
      if (!window.opener) return;
      window.opener.postMessage({
        type: "ringcentral-callback",
        success,
        error,
        phoneNumber,
      }, window.location.origin);
    };

    const handleCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const providerError = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (providerError) {
        const errorMessage = errorDescription || "Autorização negada";
        setStatus("error");
        setMessage(errorMessage);
        notifyOpener(false, errorMessage);
        return;
      }

      if (!code || !state) {
        setStatus("error");
        setMessage("Parâmetros inválidos");
        notifyOpener(false, "Parâmetros inválidos");
        return;
      }

      try {
        const redirectUri = `${window.location.origin}/integrations/ringcentral/callback`;
        const data = await completeRingCentralOAuth(code, state, redirectUri);
        setStatus("success");
        setMessage(`Conectado! Número: ${data.phone_number || "N/A"}`);
        notifyOpener(true, null, data.phone_number);
        window.setTimeout(() => window.close(), 2000);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        setStatus("error");
        setMessage(errorMessage);
        notifyOpener(false, errorMessage);
      }
    };

    void handleCallback();
  }, [searchParams]);

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
              <T k="literal.communications.esta_janela_fechara_automaticamente.b7a66cfb" />
            </p>
          )}
          {status === "error" && (
            <p className="text-sm text-muted-foreground mt-2">
              <T k="literal.communications.voce_pode_fechar_esta_janela_e_tentar_novame.32feae95" />
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
