import { T } from "@/shared/components/i18n/T";
import { useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Users,
  DollarSign,
  Briefcase,
  Search,
  Trash2,
  Download,
  ArrowUpDown,
  Filter,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { useQuickBooksStore } from "@/stores/quickbooks.store";
import { useQuickBooks } from "@/hooks/useQuickBooks";
import { useQuickBooksSync } from "@/hooks/useQuickBooksSync";
import { format } from "date-fns";
import { toast } from "sonner";

export function SyncLogs() {
  const { syncLogs, clearSyncLogs, lastSyncAt } = useQuickBooksStore();
  const { isConnected, companyName, connect, isLoading } = useQuickBooks();
  const { retrySyncOperation } = useQuickBooksSync();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-success" />;
      case "error":
        return <XCircle className="w-4 h-4 text-destructive" />;
      case "pending":
        return <Clock className="w-4 h-4 text-warning" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-success/10 text-success border-success/20"><T k="literal.settings.success.42a8f651" /></Badge>;
      case "error":
        return <Badge variant="destructive"><T k="literal.settings.error.7f2f6a15" /></Badge>;
      case "pending":
        return <Badge className="bg-warning/10 text-warning border-warning/20"><T k="settings.pending" /></Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "invoice":
        return <FileText className="w-4 h-4 text-primary" />;
      case "customer":
        return <Users className="w-4 h-4 text-accent" />;
      case "payment":
        return <DollarSign className="w-4 h-4 text-success" />;
      case "payroll":
        return <Briefcase className="w-4 h-4 text-warning" />;
      default:
        return <RefreshCw className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "create":
        return "Created";
      case "update":
        return "Updated";
      case "sync":
        return "Synced";
      case "send":
        return "Sent";
      default:
        return action;
    }
  };

  // Filter and sort logs
  const filteredLogs = syncLogs
    .filter((log) => {
      const matchesSearch = 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.localId && log.localId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.qbId && log.qbId.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = typeFilter === "all" || log.type === typeFilter;
      const matchesStatus = statusFilter === "all" || log.status === statusFilter;
      
      return matchesSearch && matchesType && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

  // Stats
  const stats = {
    total: syncLogs.length,
    success: syncLogs.filter((l) => l.status === "success").length,
    error: syncLogs.filter((l) => l.status === "error").length,
    pending: syncLogs.filter((l) => l.status === "pending").length,
  };

  const handleExportLogs = () => {
    const csv = [
      ["Timestamp", "Type", "Action", "Status", "Message", "Local ID", "QB ID"].join(","),
      ...filteredLogs.map((log) =>
        [
          format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss"),
          log.type,
          log.action,
          log.status,
          `"${log.message.replace(/"/g, '""')}"`,
          log.localId || "",
          log.qbId || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quickbooks-sync-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Logs exported successfully");
  };

  const handleClearLogs = () => {
    clearSyncLogs();
    toast.success("Sync logs cleared");
  };

  const handleRetrySync = async (log: typeof syncLogs[0]) => {
    if (!log.localId) {
      toast.error("Cannot retry: No local ID available");
      return;
    }

    setRetryingLogId(log.id);
    try {
      await retrySyncOperation(log.id, log.type, log.action, log.localId);
    } finally {
      setRetryingLogId(null);
    }
  };

  return (
    <PageLayout>
      <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"><T k="literal.settings.sync_logs.a85e431b" /></h1>
              <p className="text-muted-foreground">
                <T k="literal.settings.monitor_quickbooks_synchronization_activity_.7a340d46" />
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {isConnected ? (
                <Badge className="bg-success/10 text-success border-success/20 px-3 py-1">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected to {companyName || "QuickBooks"}
                </Badge>
              ) : (
                <Badge variant="outline" className="px-3 py-1">
                  <XCircle className="w-3 h-3 mr-1" />
                  <T k="literal.settings.not_connected.62f4d557" />
                </Badge>
              )}
              {!isConnected && (
                <Button onClick={connect} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      <T k="literal.settings.connecting.b98e3f99" />
                    </>
                  ) : (
                    "Connect QuickBooks"
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-border/80 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground"><T k="literal.settings.total_syncs.ee787764" /></p>
                    <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  </div>
                  <RefreshCw className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground"><T k="literal.settings.successful.d7932a29" /></p>
                    <p className="text-2xl font-bold text-success">{stats.success}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground"><T k="literal.settings.errors.805e86a8" /></p>
                    <p className="text-2xl font-bold text-destructive">{stats.error}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-destructive" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground"><T k="literal.settings.last_sync.2072a8ad" /></p>
                    <p className="text-lg font-bold text-foreground">
                      {lastSyncAt 
                        ? format(new Date(lastSyncAt), "MMM d, h:mm a")
                        : "Never"
                      }
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Actions */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle className="text-lg"><T k="literal.settings.sync_history.1fb44e19" /></CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportLogs}>
                    <Download className="w-4 h-4 mr-1" />
                    <T k="literal.settings.export_csv.5755f9ac" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleClearLogs}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    <T k="literal.settings.clear_logs.7c3089dc" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filter Controls */}
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full lg:w-[150px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all"><T k="transactions.allTypes" /></SelectItem>
                    <SelectItem value="invoice"><T k="literal.settings.invoice.f9f38818" /></SelectItem>
                    <SelectItem value="customer"><T k="common.customer" /></SelectItem>
                    <SelectItem value="payment"><T k="literal.settings.payment.b41a92be" /></SelectItem>
                    <SelectItem value="payroll"><T k="sidebar.payroll" /></SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full lg:w-[150px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all"><T k="common.allStatus" /></SelectItem>
                    <SelectItem value="success"><T k="literal.settings.success.42a8f651" /></SelectItem>
                    <SelectItem value="error"><T k="literal.settings.error.7f2f6a15" /></SelectItem>
                    <SelectItem value="pending"><T k="settings.pending" /></SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                >
                  <ArrowUpDown className="w-4 h-4" />
                </Button>
              </div>

              {/* Logs Table */}
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <RefreshCw className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium"><T k="literal.settings.no_sync_logs_found.9902442d" /></p>
                  <p className="text-sm">
                    {syncLogs.length === 0 
                      ? "Sync activities will appear here once you start syncing with QuickBooks"
                      : "Try adjusting your filters"
                    }
                  </p>
                </div>
              ) : (
                <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]"><T k="admin.logs.timestamp" /></TableHead>
                        <TableHead className="w-[100px]"><T k="transactions.type" /></TableHead>
                        <TableHead className="w-[100px]"><T k="admin.logs.action" /></TableHead>
                        <TableHead className="w-[100px]"><T k="common.status" /></TableHead>
                        <TableHead><T k="literal.communications.message.68f4145f" /></TableHead>
                        <TableHead className="w-[100px]"><T k="literal.settings.local_id.40c363f7" /></TableHead>
                        <TableHead className="w-[100px]"><T k="literal.settings.qb_id.c108da54" /></TableHead>
                        <TableHead className="w-[80px]"><T k="common.actions" /></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-sm">
                            {format(new Date(log.timestamp), "MMM d, yyyy h:mm:ss a")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getTypeIcon(log.type)}
                              <span className="capitalize">{log.type}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {getActionLabel(log.action)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(log.status)}
                              {getStatusBadge(log.status)}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[250px] truncate" title={log.message}>
                            {log.message}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {log.localId ? log.localId.substring(0, 8) + "..." : "-"}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {log.qbId || "-"}
                          </TableCell>
                          <TableCell>
                            {log.status === "error" && log.localId && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleRetrySync(log)}
                                    disabled={retryingLogId === log.id || !isConnected}
                                  >
                                    {retryingLogId === log.id ? (
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <RotateCcw className="w-4 h-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p><T k="literal.settings.retry_sync_operation.6d3dc1c4" /></p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
              )}
            </CardContent>
          </Card>
      </div>
    </PageLayout>
  );
}
