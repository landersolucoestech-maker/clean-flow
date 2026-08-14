import { T } from "@/shared/components/i18n/T";
import { useState } from "react";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useLanguage } from "@/contexts/useLanguage";
import { Search, FileText, AlertTriangle } from "lucide-react";

export function AdminLogs() {
  const { t } = useLanguage();
  const { logs, isLoadingLogs } = usePlatformAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("auditoria");

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === "all" || log.action === typeFilter;

    return matchesSearch && matchesType;
  });

  const uniqueTypes = [...new Set(logs.map((log) => log.action))];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground"><T k="literal.admin.logs_e_auditoria.d63c3548" /></h1>
          <p className="text-muted-foreground mt-1"><T k="literal.admin.monitore_atividades_e_erros_do_sistema.3b744ac1" /></p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-muted p-1 rounded-lg">
            <TabsTrigger 
              value="auditoria" 
              className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-md px-4"
            >
              <FileText className="w-4 h-4 mr-2" />
              <T k="audit.title" />
            </TabsTrigger>
            <TabsTrigger 
              value="erros"
              className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-md px-4"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              <T k="literal.admin.erros.009530ba" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="auditoria" className="mt-6">
            <Card className="bg-card border border-border/80 shadow-sm">
              <CardHeader className="border-b border-border/60 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold text-foreground">
                    <T k="literal.admin.log_de_auditoria.2fd3e612" />
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-40 bg-card border-border/80">
                        <SelectValue placeholder="Todos os tipos" />
                      </SelectTrigger>
                      <SelectContent className="bg-card">
                        <SelectItem value="all"><T k="literal.admin.todos_os_tipos.067ff0b5" /></SelectItem>
                        {uniqueTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="relative w-56">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/70 w-4 h-4" />
                      <Input
                        placeholder="Buscar..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-card border-border/80"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingLogs ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <T k="common.loading" />
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <T k="admin.logs.no_logs" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-background hover:bg-background">
                        <TableHead className="text-muted-foreground font-medium"><T k="admin.logs.timestamp" /></TableHead>
                        <TableHead className="text-muted-foreground font-medium"><T k="admin.logs.action" /></TableHead>
                        <TableHead className="text-muted-foreground font-medium"><T k="transactions.type" /></TableHead>
                        <TableHead className="text-muted-foreground font-medium"><T k="literal.admin.alvo.58a82deb" /></TableHead>
                        <TableHead className="text-muted-foreground font-medium"><T k="admin.logs.details" /></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => (
                        <TableRow key={log.id} className="hover:bg-background">
                          <TableCell className="text-muted-foreground font-mono text-sm">
                            {format(new Date(log.created_at), "MM/dd/yyyy HH:mm:ss")}
                          </TableCell>
                          <TableCell className="text-foreground">{log.action}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-muted-foreground border-border">
                              {log.entity_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {log.entity_id ? log.entity_id.slice(0, 8) + "..." : "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-xs truncate">
                            {Object.keys(log.details).length > 0
                              ? JSON.stringify(log.details).slice(0, 40) + "..."
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="erros" className="mt-6">
            <Card className="bg-card border border-border/80 shadow-sm">
              <CardContent className="p-8 text-center text-muted-foreground">
                <T k="literal.admin.nenhum_erro_registrado.673463c1" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
