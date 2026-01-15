import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Clock,
  CreditCard,
} from "lucide-react";

const reports = [
  {
    id: "cash-flow",
    name: "Fluxo de Caixa",
    description: "Entradas e saídas de dinheiro por período",
    icon: TrendingUp,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    id: "dre",
    name: "DRE (Demonstrativo de Resultados)",
    description: "Receitas, custos e lucro líquido",
    icon: FileText,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    id: "revenue-period",
    name: "Receita por Período",
    description: "Análise de receitas mensal, trimestral e anual",
    icon: DollarSign,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    id: "expense-category",
    name: "Despesa por Categoria",
    description: "Breakdown de despesas por categoria",
    icon: PieChart,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    id: "overdue-invoices",
    name: "Invoices Vencidas",
    description: "Lista de invoices em atraso",
    icon: Clock,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
  {
    id: "payments-method",
    name: "Pagamentos por Método",
    description: "Distribuição de pagamentos por forma de pagamento",
    icon: CreditCard,
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
];

export function ReportsTab() {
  const [period, setPeriod] = useState("month");
  const [exportFormat, setExportFormat] = useState("pdf");

  const handleGenerateReport = (reportId: string) => {
    console.log(`Generating ${reportId} report in ${exportFormat} format for ${period}`);
  };

  const handleExport = (reportId: string) => {
    console.log(`Exporting ${reportId} as ${exportFormat}`);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Relatório</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Esta Semana</SelectItem>
                  <SelectItem value="month">Este Mês</SelectItem>
                  <SelectItem value="quarter">Este Trimestre</SelectItem>
                  <SelectItem value="year">Este Ano</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Formato de Exportação</label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Card key={report.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-lg ${report.bgColor}`}>
                  <report.icon className={`w-6 h-6 ${report.color}`} />
                </div>
              </div>
              <CardTitle className="text-lg">{report.name}</CardTitle>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleGenerateReport(report.id)}
                >
                  Visualizar
                </Button>
                <Button 
                  variant="hero" 
                  size="sm"
                  onClick={() => handleExport(report.id)}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Exportar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo do Período</CardTitle>
          <CardDescription>
            Visão geral das métricas financeiras para o período selecionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-4 bg-success/10 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-success" />
                <span className="text-sm font-medium text-muted-foreground">Receita Total</span>
              </div>
              <p className="text-2xl font-bold text-success">$128,400</p>
            </div>
            <div className="p-4 bg-destructive/10 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-5 h-5 text-destructive" />
                <span className="text-sm font-medium text-muted-foreground">Despesa Total</span>
              </div>
              <p className="text-2xl font-bold text-destructive">$94,200</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Lucro Líquido</span>
              </div>
              <p className="text-2xl font-bold text-primary">$34,200</p>
            </div>
            <div className="p-4 bg-warning/10 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-warning" />
                <span className="text-sm font-medium text-muted-foreground">Invoices Vencidas</span>
              </div>
              <p className="text-2xl font-bold text-warning">$2,840</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
