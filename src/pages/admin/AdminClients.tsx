import { useState } from "react";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Ban,
  Download,
} from "lucide-react";

export function AdminClients() {
  const { t } = useLanguage();
  const { companies, isLoadingCompanies } = usePlatformAdmin();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredClients = companies.filter((client) => {
    const searchLower = searchQuery.toLowerCase();
    const name = client.trade_name || client.legal_name || "";
    const email = client.email || "";
    return (
      name.toLowerCase().includes(searchLower) ||
      email.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = () => {
    return (
      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 font-medium">
        Cadastrado
      </Badge>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Clientes</h1>
            <p className="text-gray-500 mt-1">Gerencie todos os usuários do sistema</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="text-gray-700 border-gray-300">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button className="bg-red-500 hover:bg-red-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </div>
        </div>

        {/* Table Card */}
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-900">
                Lista de Clientes
              </CardTitle>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por nome ou ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white border-gray-200"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingCompanies ? (
              <div className="p-8 text-center text-gray-500">
                Carregando...
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nenhum cliente encontrado
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="text-gray-600 font-medium">Usuário</TableHead>
                    <TableHead className="text-gray-600 font-medium">Plano</TableHead>
                    <TableHead className="text-gray-600 font-medium">Status</TableHead>
                    <TableHead className="text-gray-600 font-medium">Cadastro</TableHead>
                    <TableHead className="text-gray-600 font-medium text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">
                            {client.trade_name || client.legal_name}
                          </p>
                          <p className="text-sm text-gray-500">{client.email || "-"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {client.currency || "-"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge()}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {client.created_at ? format(new Date(client.created_at), "MM/dd/yyyy") : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white">
                            <DropdownMenuItem className="text-gray-700">
                              <Eye className="w-4 h-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-gray-700">
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Ban className="w-4 h-4 mr-2" />
                              Suspender
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
