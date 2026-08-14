import { T } from "@/shared/components/i18n/T";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Calendar,
  Megaphone,
  Shield,
  Phone,
  Copy,
  Check,
  CreditCard,
  Loader2,
  LogOut,
  Mail,
  User,
  Globe,
  FileText,
  Code,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuickBooks } from "@/hooks/useQuickBooks";
import { useGoogle } from "@/hooks/useGoogle";
import { useRingCentral } from "@/hooks/useRingCentral";
import { getSelectedCalendarId, setSelectedCalendarId, getLeadsCalendarId, setLeadsCalendarId } from "@/hooks/useGoogleCalendarSync";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { SUPABASE_URL } from "@/integrations/supabase/client";

interface GoogleCalendar {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
}

export function IntegrationsTab() {
  const websiteLeadCaptureUrl = `${SUPABASE_URL}/functions/v1/website-lead-capture`;
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState(getSelectedCalendarId());
  const [selectedLeadsCalendar, setSelectedLeadsCalendar] = useState(getLeadsCalendarId());
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  
  const { isConnected: qbConnected, isLoading: qbLoading, companyName, connect: connectQB, disconnect: disconnectQB } = useQuickBooks();
  const { 
    isConnected: googleConnected, 
    isLoading: googleLoading, 
    userInfo: googleUser, 
    connect: connectGoogle, 
    disconnect: disconnectGoogle,
    hasCalendarAccess,
    hasAdsAccess,
    hasLocalServicesAccess,
    listCalendars,
  } = useGoogle();
  const {
    isConnected: rcConnected,
    isLoading: rcLoading,
    connection: rcConnection,
    authDebug: rcAuthDebug,
    connect: connectRC,
    disconnect: disconnectRC,
  } = useRingCentral();

  // Fetch calendars when Google is connected
  useEffect(() => {
    const fetchCalendars = async () => {
      if (googleConnected && hasCalendarAccess()) {
        setLoadingCalendars(true);
        try {
          const cals = await listCalendars();
          setCalendars(cals || []);
        } catch (error) {
          console.error("Failed to fetch calendars:", error);
        } finally {
          setLoadingCalendars(false);
        }
      }
    };
    fetchCalendars();
  }, [googleConnected, hasCalendarAccess, listCalendars]);

  // Handle calendar selection change for jobs
  const handleCalendarChange = (calendarId: string) => {
    setSelectedCalendar(calendarId);
    setSelectedCalendarId(calendarId);
    const cal = calendars.find(c => c.id === calendarId);
    toast.success(`Calendário de Jobs alterado para: ${cal?.summary || calendarId}`);
  };

  // Handle calendar selection change for leads
  const handleLeadsCalendarChange = (calendarId: string) => {
    setSelectedLeadsCalendar(calendarId);
    setLeadsCalendarId(calendarId);
    if (calendarId === "none") {
      toast.info("Sincronização de leads desativada");
    } else {
      const cal = calendars.find(c => c.id === calendarId);
      toast.success(`Calendário de Leads alterado para: ${cal?.summary || calendarId}`);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Copiado para a área de transferência!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error("Falha ao copiar");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Google Integration Card */}
      <Card className={`border-2 ${googleConnected ? 'border-success/50 bg-success/5' : 'border-google/30 bg-google/5'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg">
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google Workspace
              {googleConnected && (
                <Badge variant="default" className="bg-success text-success-foreground ml-2">
                  <T k="settings.connected" />
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <T k="literal.settings.conecte_sua_conta_google_para_sincronizar_ca.a732e61d" />
          </p>
          
          {googleConnected && googleUser && (
            <div className="p-3 bg-muted rounded-lg flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={googleUser.picture} alt={googleUser.name} />
                <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">{googleUser.name}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {googleUser.email}
                </p>
              </div>
            </div>
          )}

          {/* Services available */}
          {googleConnected && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2">
                <div className={`p-3 rounded-lg border ${hasCalendarAccess() ? 'border-success/50 bg-success/5' : 'border-muted bg-muted/50'}`}>
                  <div className="flex items-center gap-2">
                    <Calendar className={`w-4 h-4 ${hasCalendarAccess() ? 'text-success' : 'text-muted-foreground'}`} />
                    <span className="font-medium text-sm"><T k="literal.settings.google_calendar.570374e4" /></span>
                    {hasCalendarAccess() && <Check className="w-4 h-4 text-success ml-auto" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1"><T k="literal.settings.sincronizacao_automatica_ativa.91c1f2bc" /></p>
                </div>
                <div className={`p-3 rounded-lg border ${hasAdsAccess() ? 'border-success/50 bg-success/5' : 'border-muted bg-muted/50'}`}>
                  <div className="flex items-center gap-2">
                    <Megaphone className={`w-4 h-4 ${hasAdsAccess() ? 'text-success' : 'text-muted-foreground'}`} />
                    <span className="font-medium text-sm"><T k="leads.origin.google_ads" /></span>
                    {hasAdsAccess() && <Check className="w-4 h-4 text-success ml-auto" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1"><T k="literal.settings.importar_leads_de_campanhas.22d37fe6" /></p>
                </div>
                <div className={`p-3 rounded-lg border ${hasLocalServicesAccess() ? 'border-success/50 bg-success/5' : 'border-muted bg-muted/50'}`}>
                  <div className="flex items-center gap-2">
                    <Shield className={`w-4 h-4 ${hasLocalServicesAccess() ? 'text-success' : 'text-muted-foreground'}`} />
                    <span className="font-medium text-sm"><T k="literal.settings.local_services.46680cf7" /></span>
                    {hasLocalServicesAccess() && <Check className="w-4 h-4 text-success ml-auto" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1"><T k="literal.settings.leads_do_google_garantido.f520258b" /></p>
                </div>
              </div>

              {/* Calendar Selector for Jobs */}
              {hasCalendarAccess() && calendars.length > 0 && (
                <div className="p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium"><T k="literal.settings.calendario_para_jobs.eda55760" /></p>
                      <p className="text-xs text-muted-foreground"><T k="literal.settings.escolha_qual_calendario_recebera_os_agendame.aec95263" /></p>
                    </div>
                    <Select value={selectedCalendar} onValueChange={handleCalendarChange}>
                      <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Selecione um calendário" />
                      </SelectTrigger>
                      <SelectContent>
                        {calendars.map((cal) => (
                          <SelectItem key={cal.id} value={cal.id}>
                            <div className="flex items-center gap-2">
                              {cal.backgroundColor && (
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: cal.backgroundColor }}
                                />
                              )}
                              <span>{cal.summary}</span>
                              {cal.primary && (
                                <Badge variant="outline" className="text-xs ml-1"><T k="literal.settings.principal.f3b86b13" /></Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Calendar Selector for Leads */}
              {hasCalendarAccess() && calendars.length > 0 && (
                <div className="p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium"><T k="literal.settings.calendario_para_leads.0fb8999e" /></p>
                      <p className="text-xs text-muted-foreground"><T k="literal.settings.escolha_um_calendario_separado_para_agendame.3b25ed01" /></p>
                    </div>
                    <Select value={selectedLeadsCalendar || "none"} onValueChange={handleLeadsCalendarChange}>
                      <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Selecione um calendário" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-muted-foreground"><T k="admin.auth.disabled" /></span>
                        </SelectItem>
                        {calendars.map((cal) => (
                          <SelectItem key={cal.id} value={cal.id}>
                            <div className="flex items-center gap-2">
                              {cal.backgroundColor && (
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: cal.backgroundColor }}
                                />
                              )}
                              <span>{cal.summary}</span>
                              {cal.primary && (
                                <Badge variant="outline" className="text-xs ml-1"><T k="literal.settings.principal.f3b86b13" /></Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              {hasCalendarAccess() && loadingCalendars && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <T k="literal.settings.carregando_calendarios.671918cc" />
                </div>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-3">
            {googleConnected ? (
              <>
                <Button variant="outline" size="sm" disabled>
                  <Check className="w-4 h-4 mr-2 text-success" />
                  <T k="literal.settings.conta_vinculada.d8df85b9" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive hover:text-destructive"
                  onClick={disconnectGoogle}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <T k="settings.disconnect" />
                </Button>
              </>
            ) : (
              <Button 
                variant="default" 
                size="lg"
                onClick={connectGoogle}
                disabled={googleLoading}
                className="bg-google hover:bg-google/90 text-google-foreground"
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Entrar com Google
              </Button>
            )}
          </div>
          
          {!googleConnected && (
            <p className="text-xs text-muted-foreground">
              <T k="literal.settings.o_login_abre_em_uma_nova_aba_o_google_bloque.01e961d3" />
            </p>
          )}
        </CardContent>
      </Card>

      {/* QuickBooks Integration Card */}
      <Card className={`border-2 ${qbConnected ? 'border-success/50 bg-success/5' : 'border-primary/20 bg-primary/5'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg">
              <CreditCard className={`w-5 h-5 ${qbConnected ? 'text-success' : 'text-primary'}`} />
              QuickBooks Online
              {qbConnected && (
                <Badge variant="default" className="bg-success text-success-foreground ml-2">
                  <T k="settings.connected" />
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <T k="literal.settings.conecte_sua_conta_quickbooks_para_sincroniza.b956a5a2" />
          </p>
          
          {qbConnected && companyName && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium"><T k="literal.settings.empresa_conectada.2bf35d5e" /></p>
              <p className="text-lg font-semibold text-foreground">{companyName}</p>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            {qbConnected ? (
              <>
                <Button variant="outline" size="sm" disabled>
                  <Check className="w-4 h-4 mr-2 text-success" />
                  <T k="literal.settings.sincronizacao_ativa.9ab283f1" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive hover:text-destructive"
                  onClick={disconnectQB}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <T k="settings.disconnect" />
                </Button>
              </>
            ) : (
              <Button 
                variant="default" 
                size="lg"
                onClick={connectQB}
                disabled={qbLoading}
                className="bg-[#2CA01C] hover:bg-[#238015] text-white"
              >
                {qbLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                Conectar ao QuickBooks
              </Button>
            )}
          </div>
          
          {!qbConnected && (
            <p className="text-xs text-muted-foreground">
              Ao conectar, você será redirecionado para o QuickBooks para autorizar o acesso. 
              Seus dados permanecerão seguros e você pode desconectar a qualquer momento.
            </p>
          )}
        </CardContent>
      </Card>

      {/* RingCentral Integration Card */}
      <Card className={`border-2 ${rcConnected ? 'border-success/50 bg-success/5' : 'border-warning/30 bg-warning/5'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg">
              <Phone className={`w-5 h-5 ${rcConnected ? 'text-success' : 'text-warning-foreground'}`} />
              RingCentral
              {rcConnected && (
                <Badge variant="default" className="bg-success text-success-foreground ml-2">
                  <T k="settings.connected" />
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <T k="literal.settings.conecte_sua_conta_ringcentral_para_enviar_e_.a9ad76a5" />
          </p>
          
          {rcConnected && rcConnection && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-full">
                  <Phone className="w-5 h-5 text-warning-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium"><T k="literal.settings.numero_sms.51c39b45" /></p>
                  <p className="text-lg font-semibold text-foreground">{rcConnection.phone_number || "N/A"}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Conectado em {new Date(rcConnection.connected_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            {rcConnected ? (
              <>
                <Button variant="outline" size="sm" disabled>
                  <Check className="w-4 h-4 mr-2 text-success" />
                  <T k="literal.settings.sms_ativo.bfcac61b" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive hover:text-destructive"
                  onClick={disconnectRC}
                  disabled={rcLoading}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <T k="settings.disconnect" />
                </Button>
              </>
            ) : (
              <Button 
                variant="default" 
                size="lg"
                onClick={connectRC}
                disabled={rcLoading}
                className="bg-warning hover:bg-warning/90 text-white"
              >
                {rcLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Phone className="w-4 h-4 mr-2" />
                )}
                Conectar ao RingCentral
              </Button>
            )}
          </div>
          
          {!rcConnected && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Ao conectar, você será redirecionado para o RingCentral para autorizar o acesso à sua conta.
                Suas mensagens serão sincronizadas automaticamente com o módulo Communications.
              </p>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  <T k="literal.settings.redirect_uri_deste_ambiente_copie_e_cadastre.a50de264" />
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={`${window.location.origin}/integrations/ringcentral/callback`}
                    readOnly
                    className="font-mono text-xs h-8 bg-muted/50"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() =>
                            copyToClipboard(
                              `${window.location.origin}/integrations/ringcentral/callback`,
                              "ringcentral_redirect_uri"
                            )
                          }
                        >
                          {copiedId === "ringcentral_redirect_uri" ? (
                            <Check className="h-4 w-4 text-success" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><T k="literal.settings.copiar.88541077" /></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {rcAuthDebug?.clientId && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      <T k="literal.settings.client_id_em_uso_no_sistema.c04dc9f2" /> <span className="font-mono">{rcAuthDebug.clientId}</span>
                    </p>
                    {rcAuthDebug.scope && (
                      <p className="text-xs text-muted-foreground">
                        <T k="literal.settings.scope_solicitado.443182b5" /> <span className="font-mono">{rcAuthDebug.scope}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Website Lead Capture Card */}
      <Card className="border-2 border-success/50 bg-success/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg">
              <Globe className="w-5 h-5 text-success" />
              <T k="literal.settings.website_lead_capture.a973daee" />
              <Badge variant="default" className="bg-success text-success-foreground ml-2">
                <T k="common.active" />
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <T k="literal.settings.capture_leads_automaticamente_do_seu_site_us.2dfb7c4e" />
          </p>
          
          <div className="p-3 bg-muted/30 rounded-lg border">
            <p className="text-sm font-medium mb-2"><T k="literal.settings.webhook_url.fa7517b6" /></p>
            <div className="flex items-center gap-2">
              <Input
                value={websiteLeadCaptureUrl}
                readOnly
                className="font-mono text-xs h-8 bg-muted/50"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() =>
                        copyToClipboard(
                          websiteLeadCaptureUrl,
                          "website_webhook"
                        )
                      }
                    >
                      {copiedId === "website_webhook" ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><T k="literal.settings.copiar.88541077" /></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg border border-success/30 bg-success/5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-success" />
                <span className="text-sm font-medium"><T k="literal.settings.auto_lead_creation.27a15ea6" /></span>
              </div>
            </div>
            <div className="p-2 rounded-lg border border-success/30 bg-success/5">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-success" />
                <span className="text-sm font-medium"><T k="literal.settings.customer_matching.826d5b0b" /></span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Integration Card */}
      <Card className="border-2 border-success/50 bg-success/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg">
              <Mail className="w-5 h-5 text-success" />
              <T k="literal.settings.resend_email.c5aa56b3" />
              <Badge variant="default" className="bg-success text-success-foreground ml-2">
                <T k="settings.connected" />
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <T k="literal.settings.envio_de_emails_transacionais_para_invoices_.5490451d" />
          </p>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg border border-success/30 bg-success/5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-success" />
                <span className="text-sm font-medium"><T k="literal.settings.invoice_emails.352dea48" /></span>
              </div>
            </div>
            <div className="p-2 rounded-lg border border-success/30 bg-success/5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-success" />
                <span className="text-sm font-medium"><T k="literal.settings.reminders.ae8c3939" /></span>
              </div>
            </div>
            <div className="p-2 rounded-lg border border-success/30 bg-success/5">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-success" />
                <span className="text-sm font-medium"><T k="literal.settings.review_requests.0bf76986" /></span>
              </div>
            </div>
            <div className="p-2 rounded-lg border border-success/30 bg-success/5">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-success" />
                <span className="text-sm font-medium"><T k="audit.estimates" /></span>
              </div>
            </div>
          </div>

          <Button variant="outline" size="sm" disabled>
            <Check className="w-4 h-4 mr-2 text-success" />
            <T k="literal.settings.email_configurado.8aaef296" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
