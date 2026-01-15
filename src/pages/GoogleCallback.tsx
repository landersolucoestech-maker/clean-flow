import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { googleState } from "@/lib/googleState";

const CALLBACK_PATH = "/integrations/google/callback";

function safeReturnPath(stateUrl: string | null) {
  if (!stateUrl) return "/settings";
  try {
    const u = new URL(stateUrl);
    if (u.origin !== window.location.origin) return "/settings";
    return `${u.pathname}${u.search}${u.hash}` || "/settings";
  } catch {
    return "/settings";
  }
}

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Conectando ao Google...");

  const returnPath = useMemo(() => safeReturnPath(searchParams.get("state")), [searchParams]);

  useEffect(() => {
    const notifyOpener = (success: boolean, error: string | null, data?: any) => {
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

      if (!code) {
        setStatus("error");
        setMessage("Parâmetros inválidos (code ausente)");
        notifyOpener(false, "Parâmetros inválidos (code ausente)");
        return;
      }

      try {
        const oauthRedirectUri = `${window.location.origin}${CALLBACK_PATH}`;

        const { data, error: callbackError } = await supabase.functions.invoke("google-auth", {
          body: {
            action: "exchange-token",
            code,
            oauthRedirectUri,
          },
        });

        if (callbackError) {
          throw new Error(callbackError.message);
        }

        const newTokens = {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresAt: Date.now() + data.expiresIn * 1000,
          scope: data.scope,
          userInfo: data.userInfo,
        };

        // Persist here as a fallback for cases where opener cannot access storage (iframe partitioning)
        localStorage.setItem("google_tokens", JSON.stringify(newTokens));
        googleState.setTokens(newTokens as any);

        setStatus("success");
        setMessage("Google conectado com sucesso!");

        notifyOpener(true, null, data);

        // If this was opened as a popup, close it.
        if (window.opener) {
          setTimeout(() => window.close(), 1200);
          return;
        }

        // Otherwise, navigate back
        setTimeout(() => {
          window.location.assign(returnPath);
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
  }, [searchParams, returnPath]);

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
