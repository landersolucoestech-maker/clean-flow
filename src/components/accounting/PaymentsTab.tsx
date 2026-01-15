import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Download,
  Eye,
} from "lucide-react";

const receivedPayments = [
  {
    id: "PAY-001",
    invoice: "INV-001",
    customer: "Sarah Johnson",
    amount: 180.00,
    date: "2024-01-15",
    method: "Credit Card",
    status: "completed",
  },
  {
    id: "PAY-002",
    invoice: "INV-005",
    customer: "Green Valley Apartments",
    amount: 325.00,
    date: "2024-01-22",
    method: "Credit Card",
    status: "completed",
  },
  {
    id: "PAY-003",
    invoice: "INV-002",
    customer: "Tech Startup Inc.",
    amount: 120.00,
    date: "2024-01-18",
    method: "ACH",
    status: "pending",
  },
];

const madePayments = [
  {
    id: "EXP-001",
    expense: "Liberty Mutual - Workers Comp",
    vendor: "Liberty Mutual",
    amount: 450.00,
    date: "2024-01-14",
    account: "Business Checking - Chase",
    hasReceipt: true,
    status: "completed",
  },
  {
    id: "EXP-002",
    expense: "Verizon - Internet/Phone",
    vendor: "Verizon",
    amount: 189.99,
    date: "2024-01-12",
    account: "Business Credit Card - Amex",
    hasReceipt: true,
    status: "completed",
  },
  {
    id: "EXP-003",
    expense: "Gas - Fleet Vehicles",
    vendor: "Shell",
    amount: 245.00,
    date: "2024-01-11",
    account: "Business Credit Card - Amex",
    hasReceipt: false,
    status: "pending",
  },
];

export function PaymentsTab() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="received" className="space-y-6">
        <TabsList>
          <TabsTrigger value="received" className="flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4" />
            Pagamentos Recebidos
          </TabsTrigger>
          <TabsTrigger value="made" className="flex items-center gap-2">
            <ArrowDownLeft className="w-4 h-4" />
            Pagamentos Realizados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pagamentos Recebidos</CardTitle>
              <CardDescription>
                Histórico de pagamentos recebidos de clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivedPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-sm">{payment.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          {payment.invoice}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{payment.customer}</TableCell>
                      <TableCell className="text-right font-semibold text-success">
                        +${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>{payment.date}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.method}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={payment.status === "completed" ? "default" : "secondary"}>
                          {payment.status === "completed" ? "Concluído" : "Pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Total Recebido (Mês)</p>
                <p className="text-2xl font-bold text-success">$12,450.00</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Pagamentos Pendentes</p>
                <p className="text-2xl font-bold text-warning">$1,950.00</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Método Mais Usado</p>
                <p className="text-2xl font-bold text-foreground">Credit Card</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="made" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pagamentos Realizados</CardTitle>
              <CardDescription>
                Histórico de pagamentos de despesas e fornecedores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Despesa</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Comprovante</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {madePayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-sm">{payment.id}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {payment.expense}
                      </TableCell>
                      <TableCell>{payment.vendor}</TableCell>
                      <TableCell className="text-right font-semibold text-destructive">
                        -${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>{payment.date}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{payment.account}</span>
                      </TableCell>
                      <TableCell>
                        {payment.hasReceipt ? (
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={payment.status === "completed" ? "default" : "secondary"}>
                          {payment.status === "completed" ? "Pago" : "Pendente"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Total Pago (Mês)</p>
                <p className="text-2xl font-bold text-destructive">$8,240.00</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Pagamentos Pendentes</p>
                <p className="text-2xl font-bold text-warning">$1,245.00</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Sem Comprovante</p>
                <p className="text-2xl font-bold text-foreground">3</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
