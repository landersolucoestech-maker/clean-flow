import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap,
  CheckCircle,
  RefreshCw,
  Link,
  Unlink,
  Clock,
  DollarSign,
  FileText,
  Bell,
  Users,
  CreditCard,
  Loader2,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { useQuickBooks } from "@/hooks/useQuickBooks";
import { useQuickBooksStore } from "@/stores/quickbooks.store";
import { getErrorMessage } from "@/lib/errors";
import { format } from "date-fns";

interface QBSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QBSettingsModal({ open, onOpenChange }: QBSettingsModalProps) {
  const { 
    isConnected, 
    isLoading, 
    companyName, 
    connect, 
    disconnect,
    getCustomers,
    getInvoices,
    getEmployees,
  } = useQuickBooks();

  const { 
    settings, 
    updateSettings, 
    syncLogs, 
    clearSyncLogs,
    lastSyncAt,
    setLastSyncAt,
    addSyncLog,
  } = useQuickBooksStore();

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSave = () => {
    toast.success("Configurações do QuickBooks salvas com sucesso");
    onOpenChange(false);
  };

  const handleSync = async () => {
    if (!isConnected) return;
    
    setIsSyncing(true);
    try {
      // Sync customers
      const customers = await getCustomers();
      addSyncLog({
        type: "customer",
        action: "sync",
        status: "success",
        message: `${customers.length} clientes sincronizados`,
      });

      // Sync invoices
      const invoices = await getInvoices();
      addSyncLog({
        type: "invoice",
        action: "sync",
        status: "success",
        message: `${invoices.length} invoices sincronizados`,
      });

      // Sync employees
      const employees = await getEmployees();
      addSyncLog({
        type: "payroll",
        action: "sync",
        status: "success",
        message: `${employees.length} funcionários sincronizados`,
      });

      setLastSyncAt(new Date());
      toast.success("Sincronização concluída com sucesso!");
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Erro na sincronização");
      addSyncLog({
        type: "customer",
        action: "sync",
        status: "error",
        message,
      });
      toast.error("Erro na sincronização: " + message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Configurações do QuickBooks
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Connection Status */}
          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isConnected ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Unlink className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium text-foreground">
                    {isConnected ? "Conectado" : "Desconectado"}
                  </p>
                  {isConnected && companyName && (
                    <p className="text-sm text-muted-foreground">
                      {companyName}
                    </p>
                  )}
                  {lastSyncAt && (
                    <p className="text-xs text-muted-foreground">
                      Última sincronização: {format(new Date(lastSyncAt), "MM/dd/yyyy HH:mm")}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isConnected && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSync}
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Sincronizar
                  </Button>
                )}
                <Button
                  variant={isConnected ? "destructive" : "default"}
                  size="sm"
                  onClick={isConnected ? disconnect : connect}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : isConnected ? (
                    <>
                      <Unlink className="w-4 h-4 mr-2" />
                      Desconectar
                    </>
                  ) : (
                    <>
                      <Link className="w-4 h-4 mr-2" />
                      Conectar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Invoice Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Configurações de Invoice
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Sincronizar Invoices</Label>
                <p className="text-sm text-muted-foreground">
                  Sincronizar invoices automaticamente quando criados
                </p>
              </div>
              <Switch
                checked={settings.autoSyncInvoices}
                onCheckedChange={(checked) =>
                  updateSettings({ autoSyncInvoices: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Sincronizar Clientes</Label>
                <p className="text-sm text-muted-foreground">
                  Sincronizar clientes automaticamente quando criados
                </p>
              </div>
              <Switch
                checked={settings.autoSyncCustomers}
                onCheckedChange={(checked) =>
                  updateSettings({ autoSyncCustomers: checked })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prefixo do Invoice</Label>
                <Input
                  value={settings.invoicePrefix}
                  onChange={(e) =>
                    updateSettings({ invoicePrefix: e.target.value })
                  }
                  placeholder="INV-"
                />
              </div>

              <div className="space-y-2">
                <Label>Taxa de Imposto Padrão (%)</Label>
                <Input
                  type="number"
                  value={settings.defaultTaxRate}
                  onChange={(e) =>
                    updateSettings({ defaultTaxRate: Number(e.target.value) })
                  }
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Payroll Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Configurações de Payroll
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Sincronizar Payroll</Label>
                <p className="text-sm text-muted-foreground">
                  Sincronizar pagamentos de payroll com QuickBooks
                </p>
              </div>
              <Switch
                checked={settings.autoSyncPayroll}
                onCheckedChange={(checked) =>
                  updateSettings({ autoSyncPayroll: checked })
                }
              />
            </div>
          </div>

          <Separator />

          {/* Payment Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Configurações de Pagamento
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prazo de Pagamento Padrão</Label>
                <Select
                  value={settings.defaultPaymentTerms}
                  onValueChange={(value) =>
                    updateSettings({ defaultPaymentTerms: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="Due on Receipt">À Vista</SelectItem>
                    <SelectItem value="Net 15">Net 15</SelectItem>
                    <SelectItem value="Net 30">Net 30</SelectItem>
                    <SelectItem value="Net 45">Net 45</SelectItem>
                    <SelectItem value="Net 60">Net 60</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Frequência de Sincronização</Label>
                <Select
                  value={settings.syncFrequency}
                  onValueChange={(value: "manual" | "hourly" | "daily") =>
                    updateSettings({ syncFrequency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="hourly">A cada hora</SelectItem>
                    <SelectItem value="daily">Diariamente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Notifications */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notificações
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <Label>Pagamento Recebido</Label>
                <p className="text-sm text-muted-foreground">
                  Notificar quando um pagamento é recebido
                </p>
              </div>
              <Switch
                checked={settings.notifyOnPayment}
                onCheckedChange={(checked) =>
                  updateSettings({ notifyOnPayment: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Invoices Vencidos</Label>
                <p className="text-sm text-muted-foreground">
                  Notificar quando um invoice está vencido
                </p>
              </div>
              <Switch
                checked={settings.notifyOnOverdue}
                onCheckedChange={(checked) =>
                  updateSettings({ notifyOnOverdue: checked })
                }
              />
            </div>
          </div>

          {/* Sync History */}
          {syncLogs.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Histórico de Sincronização
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={clearSyncLogs}
                  >
                    Limpar
                  </Button>
                </div>
                <ScrollArea className="h-[150px] rounded-md border p-2">
                  <div className="space-y-2">
                    {syncLogs.slice(0, 10).map((log) => (
                      <div 
                        key={log.id} 
                        className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={log.status === "success" ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {log.type}
                          </Badge>
                          <span className="text-muted-foreground">{log.message}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.timestamp), "HH:mm")}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar Configurações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
