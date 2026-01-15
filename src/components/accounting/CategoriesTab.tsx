import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Pencil,
  Trash2,
  Tag,
  Building,
  CreditCard,
  Wallet,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const categoriesData = [
  { id: 1, name: "Serviços de Limpeza", type: "income", color: "#22c55e", active: true },
  { id: 2, name: "Consultoria", type: "income", color: "#3b82f6", active: true },
  { id: 3, name: "Insurance", type: "expense", color: "#f59e0b", active: true },
  { id: 4, name: "Utilities", type: "expense", color: "#8b5cf6", active: true },
  { id: 5, name: "Employees / Freelancers", type: "expense", color: "#ec4899", active: true },
  { id: 6, name: "Taxes", type: "expense", color: "#ef4444", active: true },
  { id: 7, name: "Gas / Fuel", type: "expense", color: "#f97316", active: true },
  { id: 8, name: "Software", type: "expense", color: "#06b6d4", active: false },
];

const accountsData = [
  { id: 1, name: "Business Checking - Chase", type: "bank", balance: 45280.00, active: true },
  { id: 2, name: "Business Credit Card - Amex", type: "card", balance: -3240.00, active: true },
  { id: 3, name: "Petty Cash", type: "cash", balance: 500.00, active: true },
  { id: 4, name: "Stripe", type: "gateway", balance: 8920.00, active: true },
  { id: 5, name: "PayPal", type: "gateway", balance: 2150.00, active: true },
];

const accountTypeIcons = {
  bank: Building,
  card: CreditCard,
  cash: Wallet,
  gateway: CreditCard,
};

export function CategoriesTab() {
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: "",
    type: "expense",
    color: "#3b82f6",
    active: true,
  });
  const [newAccount, setNewAccount] = useState({
    name: "",
    type: "bank",
    balance: "",
    active: true,
  });

  const handleCreateCategory = () => {
    toast({
      title: "Categoria criada",
      description: `A categoria "${newCategory.name}" foi criada com sucesso.`,
    });
    setCategoryModalOpen(false);
    setNewCategory({ name: "", type: "expense", color: "#3b82f6", active: true });
  };

  const handleCreateAccount = () => {
    toast({
      title: "Conta criada",
      description: `A conta "${newAccount.name}" foi criada com sucesso.`,
    });
    setAccountModalOpen(false);
    setNewAccount({ name: "", type: "bank", balance: "", active: true });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="categories" className="space-y-6">
        <TabsList>
          <TabsTrigger value="categories">Categorias Financeiras</TabsTrigger>
          <TabsTrigger value="accounts">Contas Financeiras</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Categorias Financeiras</CardTitle>
                  <CardDescription>
                    Gerencie categorias de receitas, despesas e impostos
                  </CardDescription>
                </div>
                <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="hero" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Categoria
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nova Categoria</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input
                          placeholder="Nome da categoria"
                          value={newCategory.name}
                          onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select
                          value={newCategory.type}
                          onValueChange={(value) => setNewCategory({ ...newCategory, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="income">Income (Receita)</SelectItem>
                            <SelectItem value="expense">Expense (Despesa)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Cor</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={newCategory.color}
                            onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                            className="w-10 h-10 rounded cursor-pointer"
                          />
                          <Input
                            value={newCategory.color}
                            onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Ativa</Label>
                        <Switch
                          checked={newCategory.active}
                          onCheckedChange={(checked) => setNewCategory({ ...newCategory, active: checked })}
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setCategoryModalOpen(false)}>
                          Cancelar
                        </Button>
                        <Button variant="hero" onClick={handleCreateCategory}>
                          Criar Categoria
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoriesData.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-muted-foreground" />
                          {category.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={category.type === "income" ? "default" : "secondary"}>
                          {category.type === "income" ? "Receita" : "Despesa"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-sm text-muted-foreground">{category.color}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={category.active ? "default" : "outline"}>
                          {category.active ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Contas Financeiras</CardTitle>
                  <CardDescription>
                    Gerencie suas contas bancárias, cartões e gateways de pagamento
                  </CardDescription>
                </div>
                <Dialog open={accountModalOpen} onOpenChange={setAccountModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="hero" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Conta
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nova Conta Financeira</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input
                          placeholder="Nome da conta"
                          value={newAccount.name}
                          onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select
                          value={newAccount.type}
                          onValueChange={(value) => setNewAccount({ ...newAccount, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bank">Banco</SelectItem>
                            <SelectItem value="card">Cartão</SelectItem>
                            <SelectItem value="cash">Caixa</SelectItem>
                            <SelectItem value="gateway">Gateway (Stripe, Pix, etc.)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Saldo Inicial</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={newAccount.balance}
                          onChange={(e) => setNewAccount({ ...newAccount, balance: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Ativa</Label>
                        <Switch
                          checked={newAccount.active}
                          onCheckedChange={(checked) => setNewAccount({ ...newAccount, active: checked })}
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setAccountModalOpen(false)}>
                          Cancelar
                        </Button>
                        <Button variant="hero" onClick={handleCreateAccount}>
                          Criar Conta
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountsData.map((account) => {
                    const IconComponent = accountTypeIcons[account.type as keyof typeof accountTypeIcons];
                    return (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4 text-muted-foreground" />
                            {account.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {account.type === "bank" ? "Banco" :
                             account.type === "card" ? "Cartão" :
                             account.type === "cash" ? "Caixa" : "Gateway"}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${
                          account.balance >= 0 ? "text-success" : "text-destructive"
                        }`}>
                          ${Math.abs(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={account.active ? "default" : "outline"}>
                            {account.active ? "Ativa" : "Inativa"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
