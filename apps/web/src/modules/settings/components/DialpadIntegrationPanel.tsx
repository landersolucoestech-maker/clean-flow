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
            {isConnected && <Badge className="bg-success text-success-foreground">Conectado</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Conecte o Dialpad para enviar e receber SMS/MMS pelo Communications com OAuth, refresh de token e eventos de entrega.
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
                  SMS/MMS ativo
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
              <Label className="text-xs text-muted-foreground">Redirect URI para cadastrar no app OAuth do Dialpad</Label>
              <div className="flex gap-2">
                <Input value={redirectUri} readOnly className="h-9 font-mono text-xs" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={copyRedirectUri}>
                        {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copiar</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Provedor de SMS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Escolha qual integração o Communications deve usar. Automático preserva RingCentral como prioridade e usa Dialpad quando necessário.
          </p>
          <Select value={smsProvider} onValueChange={handleProviderChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Automático</SelectItem>
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
