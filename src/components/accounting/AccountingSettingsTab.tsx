import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Link,
  Zap,
  Shield,
  DollarSign,
  FileText,
  Bell,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const integrations = [
  { id: "quickbooks", name: "QuickBooks", status: "connected", icon: "📊" },
  { id: "stripe", name: "Stripe", status: "connected", icon: "💳" },
  { id: "pix", name: "Pix", status: "disconnected", icon: "🇧🇷" },
  { id: "webhooks", name: "Webhooks", status: "disconnected", icon: "🔗" },
];

const roles = [
  { name: "Admin", permissions: "Acesso total", color: "destructive" as const },
  { name: "Manager", permissions: "Criar/editar invoices", color: "default" as const },
  { name: "Finance", permissions: "Receitas, despesas, relatórios", color: "secondary" as const },
  { name: "Staff", permissions: "Visualização limitada", color: "outline" as const },
];

export function AccountingSettingsTab() {
  const [settings, setSettings] = useState({
    currency: "USD",
    taxRate: "7.5",
    invoiceFormat: "INV-{YYYY}-{0000}",
    defaultDueDays: "30",
  });

  const [automations, setAutomations] = useState({
    autoInvoiceOnComplete: true,
    sendReminderBefore: true,
    autoMarkPaid: false,
    applyLateFees: false,
  });

  const handleSaveSettings = () => {
    toast({
      title: "Configurações salvas",
      description: "As configurações foram atualizadas com sucesso.",
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Gerais
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Link className="w-4 h-4" />
            Integrações
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Automação
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Permissões (RBAC)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>
                Configure as preferências padrão do módulo financeiro
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Moeda Padrão
                  </Label>
                  <Select
                    value={settings.currency}
                    onValueChange={(value) => setSettings({ ...settings, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - Dólar Americano</SelectItem>
                      <SelectItem value="BRL">BRL - Real Brasileiro</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - Libra Esterlina</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Taxa de Impostos (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.taxRate}
                    onChange={(e) => setSettings({ ...settings, taxRate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Formato de Invoice
                  </Label>
                  <Input
                    value={settings.invoiceFormat}
                    onChange={(e) => setSettings({ ...settings, invoiceFormat: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {"{YYYY}"} para ano, {"{0000}"} para número sequencial
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Prazo Padrão de Vencimento (dias)</Label>
                  <Input
                    type="number"
                    value={settings.defaultDueDays}
                    onChange={(e) => setSettings({ ...settings, defaultDueDays: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="hero" onClick={handleSaveSettings}>
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Integrações</CardTitle>
              <CardDescription>
                Conecte com serviços externos para sincronização de dados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{integration.icon}</span>
                      <div>
                        <p className="font-medium">{integration.name}</p>
                        <div className="flex items-center gap-2">
                          {integration.status === "connected" ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-success" />
                              <span className="text-sm text-success">Conectado</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Desconectado</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant={integration.status === "connected" ? "outline" : "hero"}
                      size="sm"
                    >
                      {integration.status === "connected" ? "Configurar" : "Conectar"}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Integração QuickBooks</CardTitle>
              <CardDescription>
                Funcionalidades disponíveis com a integração QuickBooks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span>Enviar invoices</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span>Receber status (Paid / Overdue)</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span>Sincronizar clientes</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span>Sincronizar pagamentos</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Regras de Automação</CardTitle>
              <CardDescription>
                Configure automações para otimizar o fluxo financeiro
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-base">Criar invoice ao concluir job</Label>
                    <p className="text-sm text-muted-foreground">
                      Gerar invoice automaticamente quando um job for marcado como concluído
                    </p>
                  </div>
                  <Switch
                    checked={automations.autoInvoiceOnComplete}
                    onCheckedChange={(checked) =>
                      setAutomations({ ...automations, autoInvoiceOnComplete: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Enviar lembrete antes do vencimento
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar email de lembrete 3 dias antes do vencimento da invoice
                    </p>
                  </div>
                  <Switch
                    checked={automations.sendReminderBefore}
                    onCheckedChange={(checked) =>
                      setAutomations({ ...automations, sendReminderBefore: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-base">Marcar invoice como paga automaticamente</Label>
                    <p className="text-sm text-muted-foreground">
                      Atualizar status ao receber confirmação de pagamento do gateway
                    </p>
                  </div>
                  <Switch
                    checked={automations.autoMarkPaid}
                    onCheckedChange={(checked) =>
                      setAutomations({ ...automations, autoMarkPaid: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-base">Aplicar multa/juros por atraso</Label>
                    <p className="text-sm text-muted-foreground">
                      Calcular e adicionar juros automaticamente em invoices vencidas
                    </p>
                  </div>
                  <Switch
                    checked={automations.applyLateFees}
                    onCheckedChange={(checked) =>
                      setAutomations({ ...automations, applyLateFees: checked })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Permissões (RBAC)</CardTitle>
              <CardDescription>
                Controle de acesso baseado em funções para o módulo Accounting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roles.map((role) => (
                  <div
                    key={role.name}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <Badge variant={role.color}>{role.name}</Badge>
                      <span className="text-sm text-muted-foreground">{role.permissions}</span>
                    </div>
                    <Button variant="outline" size="sm">
                      Editar
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Shield className="w-8 h-8 text-primary" />
                <div>
                  <h4 className="font-semibold mb-1">Módulo preparado para escala</h4>
                  <p className="text-sm text-muted-foreground">
                    Este módulo foi desenhado para funcionar 100% sozinho, escalar facilmente,
                    ser integrado depois sem retrabalho, e atender SaaS multi-tenant.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
