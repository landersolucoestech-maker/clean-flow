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
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import {
  Search,
  Download,
} from "lucide-react";

export function AdminClients() {
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
      <Badge className="bg-success/10 text-success hover:bg-success/10 font-medium">
        Cadastrado
      </Badge>
    );
  };

  const handleExport = () => {
    const safeCell = (value: string) => {
      const protectedValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
      return `"${protectedValue.replace(/"/g, '""')}"`;
    };
    const rows = filteredClients.map((client) => [
      client.trade_name || client.legal_name,
      client.email || "",
      client.phone || "",
      client.country || "",
      client.currency || "",
      client.timezone || "",
      client.created_at ? format(new Date(client.created_at), "yyyy-MM-dd") : "",
    ]);
    const csv = [
      ["Empresa", "Email", "Telefone", "País", "Moeda", "Fuso horário", "Cadastro"],
      ...rows,
    ].map((row) => row.map(safeCell).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `empresas-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gerenciamento de Clientes</h1>
            <p className="text-muted-foreground mt-1">Consulte as empresas cadastradas no sistema</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="text-foreground border-border" onClick={handleExport} disabled={filteredClients.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Table Card */}
        <Card className="bg-card border border-border/80 shadow-sm">
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-foreground">
                Lista de Clientes
              </CardTitle>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/70 w-4 h-4" />
                <Input
                  placeholder="Buscar por nome ou ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-card border-border/80"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingCompanies ? (
              <div className="p-8 text-center text-muted-foreground">
                Carregando...
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhum cliente encontrado
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-background hover:bg-background">
                    <TableHead className="text-muted-foreground font-medium">Empresa</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Moeda</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Status</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Cadastro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id} className="hover:bg-background">
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">
                            {client.trade_name || client.legal_name}
                          </p>
                          <p className="text-sm text-muted-foreground">{client.email || "-"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {client.currency || "-"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {client.created_at ? format(new Date(client.created_at), "MM/dd/yyyy") : "-"}
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
