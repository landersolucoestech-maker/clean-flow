import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  CreditCard,
  Edit,
  Plus,
  Trash2,
} from "lucide-react";

export function AdminSubscription() {
  const { t } = useLanguage();

  const plans = [
    {
      id: "start",
      name: "Start",
      description: "Para produtoras pequenas",
      priceMonthly: "R$ 149",
      priceYearly: "R$ 1490",
      trialDays: 14,
      limits: {
        artists: 5,
        projects: 10,
        users: 2,
      },
      features: ["Dashboard", "Artistas", "Projetos", "Agenda"],
    },
    {
      id: "pro",
      name: "Pro",
      description: "Registro Abramus + distribuição + NF + marketing",
      priceMonthly: "R$ 399",
      priceYearly: "R$ 3990",
      trialDays: 14,
      limits: {
        artists: 25,
        projects: 50,
        users: 10,
      },
      features: ["Tudo do Start", "Registro Abramus", "Distribuição", "NF-e", "Marketing", "CRM"],
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "Gravadoras, editoras e grandes catálogos",
      priceMonthly: "R$ 999",
      priceYearly: "R$ 9990",
      trialDays: 30,
      limits: {
        artists: "Ilimitado",
        projects: "Ilimitado",
        users: "Ilimitado",
      },
      features: ["Tudo do Pro", "Artistas ilimitados", "Projetos ilimitados", "Usuários ilimitados", "Suporte prioritário", "API"],
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assinaturas e Planos</h1>
            <p className="text-gray-500 mt-1">Gerencie os planos de assinatura</p>
          </div>
          <Button className="bg-red-500 hover:bg-red-600 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Novo Plano
          </Button>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="p-6">
                {/* Header with actions */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600 h-8 w-8">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-600 h-8 w-8">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-500 mb-4">{plan.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-red-500">{plan.priceMonthly}</span>
                    <span className="text-gray-500">/mês</span>
                  </div>
                  <p className="text-sm text-gray-400">ou {plan.priceYearly}/ano</p>
                </div>

                {/* Limits */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Período de teste:</span>
                    <span className="text-gray-900 font-medium">{plan.trialDays} dias</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Max. artistas:</span>
                    <span className="text-gray-900 font-medium">{plan.limits.artists}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Max. projetos:</span>
                    <span className="text-gray-900 font-medium">{plan.limits.projects}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Max. usuários:</span>
                    <span className="text-gray-900 font-medium">{plan.limits.users}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Recursos inclusos:</p>
                  <ul className="space-y-1">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
