import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Edit, Trash2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { EditPlanModal, PlanData } from "./EditPlanModal";
import { useBillingStore, PricingPlanConfig } from "@/stores/billing.store";

export function PricingPlansCard() {
  const { t } = useLanguage();
  
  // Use store for persistence
  const pricingPlans = useBillingStore((state) => state.pricingPlans);
  const teamCounts = useBillingStore((state) => state.teamCounts);
  const updatePricingPlan = useBillingStore((state) => state.updatePricingPlan);
  const setTeamCount = useBillingStore((state) => state.setTeamCount);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlanConfig | null>(null);

  const handleTeamChange = (planId: string, delta: number) => {
    const plan = pricingPlans.find((p) => p.id === planId);
    if (!plan) return;

    const current = teamCounts[planId] || plan.baseTeams;
    const newCount = current + delta;
    
    if (newCount < 1) return;
    if (plan.maxTeams !== null && newCount > plan.maxTeams) return;
    
    setTeamCount(planId, newCount);
  };

  const calculatePrice = (plan: PricingPlanConfig, teams: number): number => {
    const extraTeams = Math.max(0, teams - plan.baseTeams);
    return plan.basePriceMonthly + (extraTeams * plan.pricePerTeam);
  };

  const calculateYearlyPrice = (plan: PricingPlanConfig, teams: number): number => {
    const extraTeams = Math.max(0, teams - plan.baseTeams);
    return plan.basePriceYearly + (extraTeams * plan.pricePerTeam * 10);
  };

  const handleSelectPlan = (planId: string) => {
    toast.info("Feature em desenvolvimento");
  };

  const handleEditPlan = (plan: PricingPlanConfig) => {
    setSelectedPlan(plan);
    setEditModalOpen(true);
  };

  const handleSavePlan = (updatedPlan: PlanData) => {
    updatePricingPlan(updatedPlan as PricingPlanConfig);
    toast.success("Plano atualizado com sucesso!");
  };

  const handleDeletePlan = (planId: string) => {
    toast.info("Feature em desenvolvimento");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {t("settings.currentPlan")}
          </CardTitle>
          <CardDescription>{t("settings.manageSubscription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pricingPlans.map((plan) => {
              const teams = teamCounts[plan.id] || plan.baseTeams;
              const monthlyPrice = calculatePrice(plan, teams);
              const yearlyPrice = calculateYearlyPrice(plan, teams);

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col border rounded-xl p-6 transition-all ${
                    plan.isCurrent
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/50 hover:shadow-sm"
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-muted-foreground" />
                      <h3 className="text-lg font-semibold">{plan.name}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditPlan(plan)}
                      >
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeletePlan(plan.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-4 min-h-[40px]">
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-primary">
                        ${monthlyPrice}
                      </span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      ou ${yearlyPrice}/ano
                    </p>
                  </div>

                  {/* Trial Period */}
                  <div className="flex items-center justify-between text-sm mb-4 pb-4 border-b border-border">
                    <span className="text-muted-foreground">Período de teste:</span>
                    <span className="font-medium">{plan.trialDays} dias</span>
                  </div>

                  {/* Teams Selector */}
                  <div className="flex items-center justify-between text-sm mb-4 pb-4 border-b border-border">
                    <span className="text-muted-foreground">Teams:</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="px-2 py-0.5 text-sm font-medium">
                        {plan.maxTeams === null ? "∞" : teams}
                      </Badge>
                      {plan.maxTeams !== null && (
                        <div className="flex items-center border border-border rounded-md">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-r-none"
                            onClick={() => handleTeamChange(plan.id, -1)}
                            disabled={teams <= 1}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-l-none"
                            onClick={() => handleTeamChange(plan.id, 1)}
                            disabled={plan.maxTeams !== null && teams >= plan.maxTeams}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Limits */}
                  <div className="space-y-2 mb-4 pb-4 border-b border-border">
                    {plan.limits.map((limit, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{limit.label}:</span>
                        <span className="font-medium">{limit.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Features */}
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-2">Recursos inclusos:</p>
                    <ul className="space-y-1.5">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Button */}
                  <div className="mt-6">
                    {plan.isCurrent ? (
                      <Badge variant="default" className="w-full justify-center py-2">
                        Plano Atual
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleSelectPlan(plan.id)}
                      >
                        Selecionar Plano
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <EditPlanModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        plan={selectedPlan}
        onSave={handleSavePlan}
      />
    </>
  );
}
