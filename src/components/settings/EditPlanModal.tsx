import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export interface PlanData {
  id: string;
  name: string;
  description: string;
  basePriceMonthly: number;
  basePriceYearly: number;
  pricePerTeam: number;
  trialDays: number;
  baseTeams: number;
  maxTeams: number | null;
  limits: { label: string; value: string | number }[];
  features: string[];
}

interface EditPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanData | null;
  onSave: (plan: PlanData) => void;
}

export function EditPlanModal({ open, onOpenChange, plan, onSave }: EditPlanModalProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<PlanData>({
    id: "",
    name: "",
    description: "",
    basePriceMonthly: 0,
    basePriceYearly: 0,
    pricePerTeam: 0,
    trialDays: 14,
    baseTeams: 1,
    maxTeams: null,
    limits: [],
    features: [],
  });

  const [newFeature, setNewFeature] = useState("");
  const [newLimitLabel, setNewLimitLabel] = useState("");
  const [newLimitValue, setNewLimitValue] = useState("");

  useEffect(() => {
    if (plan) {
      setFormData({ ...plan });
    }
  }, [plan]);

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("Nome do plano é obrigatório");
      return;
    }
    onSave(formData);
    onOpenChange(false);
    toast.success("Plano atualizado com sucesso!");
  };

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setFormData((prev) => ({
        ...prev,
        features: [...prev.features, newFeature.trim()],
      }));
      setNewFeature("");
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const handleAddLimit = () => {
    if (newLimitLabel.trim() && newLimitValue.trim()) {
      setFormData((prev) => ({
        ...prev,
        limits: [...prev.limits, { label: newLimitLabel.trim(), value: newLimitValue.trim() }],
      }));
      setNewLimitLabel("");
      setNewLimitValue("");
    }
  };

  const handleRemoveLimit = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      limits: prev.limits.filter((_, i) => i !== index),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Plano</DialogTitle>
          <DialogDescription>
            Atualize as informações do plano de assinatura.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Plano</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Professional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trialDays">Período de Teste (dias)</Label>
              <Input
                id="trialDays"
                type="number"
                value={formData.trialDays}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, trialDays: parseInt(e.target.value) || 0 }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Descrição do plano..."
              rows={2}
            />
          </div>

          {/* Pricing */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Preços</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priceMonthly" className="text-sm text-muted-foreground">
                  Preço Mensal ($)
                </Label>
                <Input
                  id="priceMonthly"
                  type="number"
                  value={formData.basePriceMonthly}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      basePriceMonthly: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceYearly" className="text-sm text-muted-foreground">
                  Preço Anual ($)
                </Label>
                <Input
                  id="priceYearly"
                  type="number"
                  value={formData.basePriceYearly}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      basePriceYearly: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pricePerTeam" className="text-sm text-muted-foreground">
                  Preço por Team Extra ($)
                </Label>
                <Input
                  id="pricePerTeam"
                  type="number"
                  value={formData.pricePerTeam}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      pricePerTeam: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Teams Config */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Configuração de Teams</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="baseTeams" className="text-sm text-muted-foreground">
                  Teams Base Incluídos
                </Label>
                <Input
                  id="baseTeams"
                  type="number"
                  value={formData.baseTeams}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, baseTeams: parseInt(e.target.value) || 1 }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxTeams" className="text-sm text-muted-foreground">
                  Max Teams (vazio = ilimitado)
                </Label>
                <Input
                  id="maxTeams"
                  type="number"
                  value={formData.maxTeams ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      maxTeams: e.target.value ? parseInt(e.target.value) : null,
                    }))
                  }
                  placeholder="Ilimitado"
                />
              </div>
            </div>
          </div>

          {/* Limits */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Limites</Label>
            <div className="space-y-2">
              {formData.limits.map((limit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={limit.label} disabled className="flex-1" />
                  <Input value={String(limit.value)} disabled className="w-32" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveLimit(index)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  value={newLimitLabel}
                  onChange={(e) => setNewLimitLabel(e.target.value)}
                  placeholder="Label (ex: Max. seats)"
                  className="flex-1"
                />
                <Input
                  value={newLimitValue}
                  onChange={(e) => setNewLimitValue(e.target.value)}
                  placeholder="Valor"
                  className="w-32"
                />
                <Button variant="outline" size="icon" onClick={handleAddLimit}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Recursos Inclusos</Label>
            <div className="space-y-2">
              {formData.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={feature} disabled className="flex-1" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveFeature(index)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  placeholder={t("common.newFeature")}
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleAddFeature()}
                />
                <Button variant="outline" size="icon" onClick={handleAddFeature}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="hero" onClick={handleSave}>
            {t("settings.saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
