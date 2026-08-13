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
          <h1 className="text-2xl font-bold text-gray-900">Logs e Auditoria</h1>
          <p className="text-gray-500 mt-1">Monitore atividades e erros do sistema</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-gray-100 p-1 rounded-lg">
            <TabsTrigger 
              value="auditoria" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4"
            >
              <FileText className="w-4 h-4 mr-2" />
              Auditoria
            </TabsTrigger>
            <TabsTrigger 
              value="erros"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Erros
            </TabsTrigger>
          </TabsList>

          <TabsContent value="auditoria" className="mt-6">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-100 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold text-gray-900">
                    Log de Auditoria
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-40 bg-white border-gray-200">
                        <SelectValue placeholder="Todos os tipos" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        {uniqueTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="relative w-56">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Buscar..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-white border-gray-200"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingLogs ? (
                  <div className="p-8 text-center text-gray-500">
                    Carregando...
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    Nenhum log encontrado
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 hover:bg-gray-50">
                        <TableHead className="text-gray-600 font-medium">Data/Hora</TableHead>
                        <TableHead className="text-gray-600 font-medium">Ação</TableHead>
                        <TableHead className="text-gray-600 font-medium">Tipo</TableHead>
                        <TableHead className="text-gray-600 font-medium">Alvo</TableHead>
                        <TableHead className="text-gray-600 font-medium">Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => (
                        <TableRow key={log.id} className="hover:bg-gray-50">
                          <TableCell className="text-gray-500 font-mono text-sm">
                            {format(new Date(log.created_at), "MM/dd/yyyy HH:mm:ss")}
                          </TableCell>
                          <TableCell className="text-gray-900">{log.action}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-gray-600 border-gray-300">
                              {log.entity_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-500">
                            {log.entity_id ? log.entity_id.slice(0, 8) + "..." : "-"}
                          </TableCell>
                          <TableCell className="text-gray-500 max-w-xs truncate">
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
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="p-8 text-center text-gray-500">
                Nenhum erro registrado
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
