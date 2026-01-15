import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  DollarSign,
  Calendar,
  Users,
  UserPlus,
  TrendingUp,
  CreditCard,
  Percent,
  BarChart3,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const revenueData = [
  { month: "Jan", receita: 95000, assinaturas: 780 },
  { month: "Fev", receita: 102000, assinaturas: 820 },
  { month: "Mar", receita: 118000, assinaturas: 870 },
  { month: "Abr", receita: 125000, assinaturas: 890 },
  { month: "Mai", receita: 132000, assinaturas: 920 },
  { month: "Jun", receita: 138000, assinaturas: 940 },
  { month: "Jul", receita: 142000, assinaturas: 960 },
  { month: "Ago", receita: 148000, assinaturas: 980 },
  { month: "Set", receita: 150000, assinaturas: 1000 },
  { month: "Out", receita: 154000, assinaturas: 1020 },
  { month: "Nov", receita: 156000, assinaturas: 1040 },
  { month: "Dez", receita: 156890, assinaturas: 1000 },
];

const usersData = [
  { month: "Jan", total: 850, novos: 45, conversao: 58 },
  { month: "Fev", total: 920, novos: 52, conversao: 60 },
  { month: "Mar", total: 980, novos: 48, conversao: 62 },
  { month: "Abr", total: 1020, novos: 55, conversao: 65 },
  { month: "Mai", total: 1080, novos: 62, conversao: 64 },
  { month: "Jun", total: 1120, novos: 58, conversao: 66 },
  { month: "Jul", total: 1150, novos: 65, conversao: 67 },
  { month: "Ago", total: 1180, novos: 72, conversao: 68 },
  { month: "Set", total: 1200, novos: 68, conversao: 70 },
  { month: "Out", total: 1220, novos: 75, conversao: 72 },
  { month: "Nov", total: 1235, novos: 80, conversao: 74 },
  { month: "Dez", total: 1248, novos: 87, conversao: 76 },
];

export function AdminDashboard() {
  const { t } = useLanguage();
  const { stats, isLoadingStats } = usePlatformAdmin();

  const revenueStats = [
    {
      title: "Receita Mensal",
      value: "R$ 156.890",
      change: "+18%",
      icon: DollarSign,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      changeColor: "text-green-600",
    },
    {
      title: "Receita Anual",
      value: "R$ 1.882.680",
      change: "+15%",
      icon: Calendar,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      changeColor: "text-green-600",
    },
    {
      title: "ARPU",
      value: "R$ 186,32",
      change: "+4%",
      icon: TrendingUp,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      changeColor: "text-green-600",
    },
    {
      title: "Assinaturas Ativas",
      value: "842",
      change: "+5%",
      icon: CreditCard,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      changeColor: "text-green-600",
    },
  ];

  const usersStats = [
    {
      title: "Total de Usuários",
      value: "1.248",
      change: "+12%",
      icon: Users,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      changeColor: "text-green-600",
    },
    {
      title: "Novos Usuários (30 dias)",
      value: "87",
      change: "+8%",
      icon: UserPlus,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      changeColor: "text-green-600",
    },
    {
      title: "Taxa de Conversão",
      value: "67,5%",
      change: "+3%",
      icon: Percent,
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600",
      changeColor: "text-green-600",
    },
    {
      title: "Churn Rate",
      value: "2,4%",
      change: "-0.5%",
      icon: BarChart3,
      iconBg: "bg-rose-100",
      iconColor: "text-rose-600",
      changeColor: "text-rose-600",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Administrativo</h1>
          <p className="text-gray-500 mt-1">Visão geral do sistema</p>
        </div>

        {/* Revenue Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolução de Receita</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {revenueStats.map((stat) => (
              <Card key={stat.title} className="bg-white border border-gray-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={`p-2.5 rounded-full ${stat.iconBg}`}>
                      <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                    </div>
                    <span className={`text-sm font-medium ${stat.changeColor}`}>
                      {stat.change}
                    </span>
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-500 mt-1">{stat.title}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Users Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolução de Usuários</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {usersStats.map((stat) => (
              <Card key={stat.title} className="bg-white border border-gray-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={`p-2.5 rounded-full ${stat.iconBg}`}>
                      <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                    </div>
                    <span className={`text-sm font-medium ${stat.changeColor}`}>
                      {stat.change}
                    </span>
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-500 mt-1">{stat.title}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-900">
                Gráfico de Evolução
              </CardTitle>
              <p className="text-sm text-gray-500">Receita mensal e assinaturas ativas</p>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                    <YAxis yAxisId="left" stroke="#9ca3af" fontSize={12} />
                    <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="receita"
                      name="Receita Mensal"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ fill: "#ef4444", strokeWidth: 2 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="assinaturas"
                      name="Assinaturas Ativas"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ fill: "#22c55e", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Users Chart */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-900">
                Gráfico de Evolução
              </CardTitle>
              <p className="text-sm text-gray-500">Total de usuários, novos usuários e taxa de conversão</p>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={usersData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                    <YAxis yAxisId="left" stroke="#9ca3af" fontSize={12} />
                    <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="total"
                      name="Total de Usuários"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6", strokeWidth: 2 }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="novos"
                      name="Novos Usuários"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ fill: "#22c55e", strokeWidth: 2 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="conversao"
                      name="Taxa de Conversão"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={{ fill: "#f97316", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
