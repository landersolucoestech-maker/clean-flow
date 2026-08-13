import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { Building2, CalendarCheck, FileText, HeadphonesIcon, Users } from "lucide-react";

export function AdminDashboard() {
  const { stats, isLoadingStats } = usePlatformAdmin();
  const cards = [
    { title: "Empresas", value: stats?.totalCompanies ?? 0, icon: Building2 },
    { title: "Clientes", value: stats?.totalCustomers ?? 0, icon: Users },
    { title: "Serviços", value: stats?.totalJobs ?? 0, icon: CalendarCheck },
    { title: "Faturas", value: stats?.totalInvoices ?? 0, icon: FileText },
    { title: "Tickets de suporte", value: stats?.totalTickets ?? 0, icon: HeadphonesIcon },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard administrativo</h1>
          <p className="mt-1 text-gray-500">Contagens operacionais atuais do sistema</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map((card) => (
            <Card key={card.title} className="border-gray-200 bg-white shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <card.icon className="h-5 w-5 text-orange-600" />
                  <span className="text-2xl font-bold text-gray-900">
                    {isLoadingStats ? "—" : card.value.toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="mt-4 text-sm text-gray-500">{card.title}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-gray-200 bg-white shadow-sm">
          <CardContent className="p-6 text-sm text-gray-600">
            Métricas de receita, assinatura e conversão não são exibidas porque o projeto ainda não possui um provedor de pagamentos configurado.
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
