import { T } from "@/shared/components/i18n/T";
import { Check, Copy, Loader2, LogOut, PhoneCall } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useDialpad, type SmsProviderPreference } from "../../communications/hooks/useDialpad";
import { useRingCentral } from "../../communications/hooks/useRingCentral";

export function DialpadIntegrationPanel() {
  const [copied, setCopied] = useState(false);
  const {
    isConnected,
    isLoading,
    connection,
    smsProvider,
    connect,
    disconnect,
    setSmsProvider,
  } = useDialpad();
  const { isConnected: ringCentralConnected } = useRingCentral();
  const redirectUri = `${window.location.origin}/integrations/dialpad/callback`;

  const copyRedirectUri = async () => {
    try {
      await navigator.clipboard.writeText(redirectUri);
      setCopied(true);
      toast.success("Redirect URI copiada");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Falha ao copiar Redirect URI");
    }
  };

  const handleProviderChange = (value: string) => {
    void setSmsProvider(value as SmsProviderPreference);
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <Card className={`border-2 ${isConnected ? "border-success/50 bg-success/5" : "border-primary/30 bg-primary/5"}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
            <PhoneCall className={`h-5 w-5 ${isConnected ? "text-success" : "text-primary"}`} />
            Dialpad
            {isConnected && <Badge className="bg-success text-success-foreground"><T k="settings.connected" /></Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <T k="literal.settings.conecte_o_dialpad_para_enviar_e_receber_sms_.15613f55" />
          </p>

          {isConnected && connection && (
            <div className="rounded-lg bg-muted p-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <PhoneCall className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{connection.display_name || "Conta Dialpad"}</p>
                  {connection.email && <p className="truncate text-sm text-muted-foreground">{connection.email}</p>}
                  <p className="text-sm font-semibold text-foreground">{connection.phone_number || "Número não informado pelo Dialpad"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Conectado em {new Date(connection.connected_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {isConnected ? (
              <>
                <Button variant="outline" size="sm" disabled>
                  <Check className="mr-2 h-4 w-4 text-success" />
                  <T k="literal.settings.sms_mms_ativo.2f597ebd" />
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={disconnect} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                  Desconectar
                </Button>
              </>
            ) : (
              <Button onClick={connect} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PhoneCall className="mr-2 h-4 w-4" />}
                Conectar ao Dialpad
              </Button>
            )}
          </div>

          {!isConnected && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground"><T k="literal.settings.redirect_uri_para_cadastrar_no_app_oauth_do_.3394f885" /></Label>
              <div className="flex gap-2">
                <Input value={redirectUri} readOnly className="h-9 font-mono text-xs" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={copyRedirectUri} aria-label="Copy Dialpad redirect URI">
                        {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><T k="literal.settings.copiar.88541077" /></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base"><T k="literal.settings.provedor_de_sms.2ab244e9" /></CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <T k="literal.settings.escolha_qual_integracao_o_communications_dev.139d5001" />
          </p>
          <Select value={smsProvider} onValueChange={handleProviderChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto"><T k="literal.settings.automatico.c9c992be" /></SelectItem>
              <SelectItem value="ringcentral" disabled={!ringCentralConnected}>RingCentral{!ringCentralConnected ? " — desconectado" : ""}</SelectItem>
              <SelectItem value="dialpad" disabled={!isConnected}>Dialpad{!isConnected ? " — desconectado" : ""}</SelectItem>
            </SelectContent>
          </Select>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>RingCentral: {ringCentralConnected ? "conectado" : "desconectado"}</p>
            <p>Dialpad: {isConnected ? "conectado" : "desconectado"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
