import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Upload,
  Download,
  Settings,
  Link,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { IncomeModal } from "./IncomeModal";
import { ExpenseModal } from "./ExpenseModal";

const transactionsData = [
  {
    id: "TRX-001",
    name: "Deep Clean Service - Sarah Johnson",
    date: "2024-01-15",
    amount: 180.00,
    type: "income" as const,
    category: "Serviços",
    status: "received",
  },
  {
    id: "TRX-002",
    name: "Liberty Mutual - Workers Comp",
    date: "2024-01-14",
    amount: 450.00,
    type: "expense" as const,
    category: "Insurance",
    status: "paid",
  },
  {
    id: "TRX-003",
    name: "Move-out Cleaning - Tech Startup",
    date: "2024-01-13",
    amount: 320.00,
    type: "income" as const,
    category: "Serviços",
    status: "pending",
  },
  {
    id: "TRX-004",
    name: "Verizon - Internet/Phone",
    date: "2024-01-12",
    amount: 189.99,
    type: "expense" as const,
    category: "Utilities",
    status: "paid",
  },
  {
    id: "TRX-005",
    name: "Gas - Fleet Vehicles",
    date: "2024-01-11",
    amount: 245.00,
    type: "expense" as const,
    category: "Gas / Fuel",
    status: "paid",
  },
  {
    id: "TRX-006",
    name: "Regular Cleaning - Miller Family",
    date: "2024-01-10",
    amount: 150.00,
    type: "income" as const,
    category: "Serviços",
    status: "received",
  },
];

export function TransactionsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [newTransactionType, setNewTransactionType] = useState<"income" | "expense" | null>(null);

  const totalRevenue = transactionsData
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactionsData
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const profitLoss = totalRevenue - totalExpenses;

  const filteredTransactions = transactionsData.filter(transaction => {
    const matchesSearch = transaction.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || transaction.type === typeFilter;
    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || transaction.category === categoryFilter;
    return matchesSearch && matchesType && matchesStatus && matchesCategory;
  });

  const categories = [...new Set(transactionsData.map(t => t.category))];

  const handleNewTransaction = (type: "income" | "expense") => {
    setNewTransactionType(type);
    if (type === "income") {
      setIncomeModalOpen(true);
    } else {
      setExpenseModalOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Receita Total (Mês)</p>
                <p className="text-2xl font-bold text-foreground">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                <p className="text-sm text-success flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> +12% vs mês anterior
                </p>
              </div>
              <div className="p-3 bg-success/10 rounded-lg">
                <ArrowUpRight className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Despesas Totais</p>
                <p className="text-2xl font-bold text-foreground">${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                <p className="text-sm text-warning flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> +5% vs mês anterior
                </p>
              </div>
              <div className="p-3 bg-destructive/10 rounded-lg">
                <ArrowDownLeft className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Lucro / Prejuízo</p>
                <p className={`text-2xl font-bold ${profitLoss >= 0 ? 'text-success' : 'text-destructive'}`}>
                  ${Math.abs(profitLoss).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-muted-foreground">
                  Margem: {((profitLoss / totalRevenue) * 100).toFixed(1)}%
                </p>
              </div>
              <div className={`p-3 rounded-lg ${profitLoss >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                <DollarSign className={`w-6 h-6 ${profitLoss >= 0 ? 'text-success' : 'text-destructive'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>Transações</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Importar OFX
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Regras
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              <Button variant="outline" size="sm">
                <Link className="w-4 h-4 mr-2" />
                Integração Bancária
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="hero" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Transação
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleNewTransaction("income")}>
                    <ArrowUpRight className="w-4 h-4 mr-2 text-success" />
                    Nova Receita
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNewTransaction("expense")}>
                    <ArrowDownLeft className="w-4 h-4 mr-2 text-destructive" />
                    Nova Despesa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar transação..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px] bg-background border-border">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] bg-background border-border">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="received">Recebido</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px] bg-background border-border">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {transaction.type === "income" ? (
                        <ArrowUpRight className="w-4 h-4 text-success" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4 text-destructive" />
                      )}
                      {transaction.name}
                    </div>
                  </TableCell>
                  <TableCell>{transaction.date}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{transaction.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        transaction.status === "received" || transaction.status === "paid" 
                          ? "default" 
                          : "secondary"
                      }
                    >
                      {transaction.status === "received" ? "Recebido" : 
                       transaction.status === "paid" ? "Pago" : "Pendente"}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${
                    transaction.type === "income" ? "text-success" : "text-destructive"
                  }`}>
                    {transaction.type === "income" ? "+" : "-"}
                    ${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <IncomeModal open={incomeModalOpen} onOpenChange={setIncomeModalOpen} />
      <ExpenseModal open={expenseModalOpen} onOpenChange={setExpenseModalOpen} />
    </div>
  );
}
