import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DialpadCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Conectando ao Dialpad...");

  useEffect(() => {
    const notifyOpener = (success: boolean, error: string | null, phoneNumber?: string, warning?: string | null) => {
      if (!window.opener) return;
      window.opener.postMessage({
        type: "dialpad-callback",
        success,
        error,
        phoneNumber,
        warning,
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
        const redirectUri = `${window.location.origin}/integrations/dialpad/callback`;
        const { data, error } = await supabase.functions.invoke("dialpad-callback", {
          body: { code, state, redirect_uri: redirectUri },
        });
        if (error || !data?.success) throw new Error(error?.message || data?.error || "Falha ao concluir OAuth do Dialpad");

        setStatus("success");
        setMessage(`Dialpad conectado${data.phone_number ? `: ${data.phone_number}` : ""}`);
        notifyOpener(true, null, data.phone_number, data.warning || null);
        window.setTimeout(() => window.close(), 1800);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        console.error("Dialpad callback error:", error);
        setStatus("error");
        setMessage(errorMessage);
        notifyOpener(false, errorMessage);
      }
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2 text-center">
            {status === "loading" && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
            {status === "success" && <CheckCircle className="h-6 w-6 text-success" />}
            {status === "error" && <XCircle className="h-6 w-6 text-destructive" />}
            Dialpad OAuth
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className={`text-lg ${status === "error" ? "text-destructive" : "text-foreground"}`}>{message}</p>
          {status === "success" && <p className="mt-2 text-sm text-muted-foreground">Esta janela fechará automaticamente...</p>}
          {status === "error" && <p className="mt-2 text-sm text-muted-foreground">Você pode fechar esta janela e tentar novamente.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
