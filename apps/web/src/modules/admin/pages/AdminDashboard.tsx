import { T } from "@/shared/components/i18n/T";
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
          <h1 className="text-2xl font-bold text-foreground"><T k="literal.admin.dashboard_administrativo.b4e1f8b0" /></h1>
          <p className="mt-1 text-muted-foreground"><T k="literal.admin.contagens_operacionais_atuais_do_sistema.b160e024" /></p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map((card) => (
            <Card key={card.title} className="border-border/80 bg-card shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <card.icon className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold text-foreground">
                    {isLoadingStats ? "—" : card.value.toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">{card.title}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/80 bg-card shadow-sm">
          <CardContent className="p-6 text-sm text-muted-foreground">
            <T k="literal.admin.metricas_de_receita_assinatura_e_conversao_n.3227a8fa" />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
