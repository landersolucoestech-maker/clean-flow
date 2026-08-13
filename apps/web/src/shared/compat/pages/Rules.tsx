import { useState, useMemo } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader, KPICard, SearchInput, FilterSelect, ActionDropdown } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Settings2,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  useTransactionRules,
  useCreateTransactionRule,
  useUpdateTransactionRule,
  useDeleteTransactionRule,
  useToggleTransactionRule,
  TransactionRule,
} from "@/hooks/useTransactionRules";

const typeOptions = [
  { value: "all", label: "Todos os Tipos" },
  { value: "receita", label: "Receita" },
  { value: "despesa", label: "Despesa" },
];

const statusOptions = [
  { value: "all", label: "Todos Status" },
  { value: "active", label: "Ativas" },
  { value: "inactive", label: "Inativas" },
];

export function Rules() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState<TransactionRule | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCondition, setFormCondition] = useState("");
  const [formType, setFormType] = useState<"receita" | "despesa">("receita");
  const [formCategory, setFormCategory] = useState("");

  const { data: rulesData = [], isLoading } = useTransactionRules();
  const createRule = useCreateTransactionRule();
  const updateRule = useUpdateTransactionRule();
  const deleteRule = useDeleteTransactionRule();
  const toggleRule = useToggleTransactionRule();

  // Calculate stats
  const { totalRules, activeRules, inactiveRules } = useMemo(() => ({
    totalRules: rulesData.length,
    activeRules: rulesData.filter((r) => r.is_active).length,
    inactiveRules: rulesData.filter((r) => !r.is_active).length,
  }), [rulesData]);

  // Filter rules
  const filteredRules = useMemo(() => {
    return rulesData.filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.condition.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || r.type === typeFilter;
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" && r.is_active) ||
        (statusFilter === "inactive" && !r.is_active);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [rulesData, searchTerm, typeFilter, statusFilter]);

  const handleView = (rule: TransactionRule) => {
    setSelectedRule(rule);
    setShowViewModal(true);
  };

  const handleEdit = (rule: TransactionRule) => {
    setSelectedRule(rule);
    setFormName(rule.name);
    setFormCondition(rule.condition);
    setFormType(rule.type);
    setFormCategory(rule.category);
    setShowEditModal(true);
  };

  const handleDelete = (id: string) => {
    deleteRule.mutate(id);
  };

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    toggleRule.mutate({ id, is_active: !currentStatus });
  };

  const handleCreateRule = () => {
    if (!formName || !formCondition || !formCategory) return;
    
    createRule.mutate({
      name: formName,
      condition: formCondition,
      type: formType,
      category: formCategory,
    }, {
      onSuccess: () => {
        setShowCreateModal(false);
        resetForm();
      },
    });
  };

  const handleUpdateRule = () => {
    if (!selectedRule || !formName || !formCondition || !formCategory) return;
    
    updateRule.mutate({
      id: selectedRule.id,
      name: formName,
      condition: formCondition,
      type: formType,
      category: formCategory,
    }, {
      onSuccess: () => {
        setShowEditModal(false);
        resetForm();
      },
    });
  };

  const resetForm = () => {
    setFormName("");
    setFormCondition("");
    setFormType("receita");
    setFormCategory("");
    setSelectedRule(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "receita":
        return <Badge className="bg-green-500/20 text-green-600 hover:bg-green-500/30">Receita</Badge>;
      case "despesa":
        return <Badge className="bg-red-500/20 text-red-600 hover:bg-red-500/30">Despesa</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* Page Header */}
      <PageHeader
        title="Regras de Categorização"
        description="Gerencie regras automáticas para categorizar transações"
        backTo="/transactions"
        actions={
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Regra
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard
          title="Total de Regras"
          value={totalRules}
          iconClassName="bg-primary/20"
          icon={<Settings2 className="w-6 h-6 text-primary" />}
        />
        <KPICard
          title="Regras Ativas"
          value={activeRules}
          valueClassName="text-green-600"
          iconClassName="bg-green-500/20"
          icon={<CheckCircle className="w-6 h-6 text-green-600" />}
        />
        <KPICard
          title="Regras Inativas"
          value={inactiveRules}
          valueClassName="text-muted-foreground"
          iconClassName="bg-muted"
          icon={<XCircle className="w-6 h-6 text-muted-foreground" />}
        />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <SearchInput
          placeholder="Buscar regras..."
          value={searchTerm}
          onChange={setSearchTerm}
        />
        <FilterSelect value={typeFilter} onValueChange={setTypeFilter} options={typeOptions} />
        <FilterSelect value={statusFilter} onValueChange={setStatusFilter} options={statusOptions} />
      </div>

      {/* Rules Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Nome</TableHead>
                <TableHead>Condição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma regra encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {rule.condition}
                    </TableCell>
                    <TableCell>{rule.category}</TableCell>
                    <TableCell>{getTypeBadge(rule.type)}</TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={() => handleToggleStatus(rule.id, rule.is_active)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <ActionDropdown
                        onView={() => handleView(rule)}
                        onEdit={() => handleEdit(rule)}
                        onDelete={() => handleDelete(rule.id)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Rule Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Regra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da Regra</label>
              <Input 
                placeholder="Ex: Combustível" 
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Condição</label>
              <Input 
                placeholder="Ex: Descrição contém 'posto'" 
                value={formCondition}
                onChange={(e) => setFormCondition(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={formType} onValueChange={(v) => setFormType(v as "receita" | "despesa")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border">
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <Input 
                placeholder="Ex: Transporte" 
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateRule} disabled={createRule.isPending}>
                {createRule.isPending ? "Criando..." : "Criar Regra"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Rule Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da Regra</DialogTitle>
          </DialogHeader>
          {selectedRule && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{selectedRule.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  {getTypeBadge(selectedRule.type)}
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Condição</p>
                  <p className="font-medium">{selectedRule.condition}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Categoria</p>
                  <p className="font-medium">{selectedRule.category}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">{selectedRule.is_active ? "Ativa" : "Inativa"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Criada em</p>
                  <p className="font-medium">
                    {new Date(selectedRule.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setShowViewModal(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Rule Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Regra</DialogTitle>
          </DialogHeader>
          {selectedRule && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome da Regra</label>
                <Input 
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Condição</label>
                <Input 
                  value={formCondition}
                  onChange={(e) => setFormCondition(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo</label>
                <Select value={formType} onValueChange={(v) => setFormType(v as "receita" | "despesa")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border">
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="despesa">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoria</label>
                <Input 
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateRule} disabled={updateRule.isPending}>
                  {updateRule.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
