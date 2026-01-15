import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Settings,
  Mail,
  Shield,
  Bell,
  Palette,
  Webhook,
  Key,
  Link,
  Save,
  Upload,
} from "lucide-react";

export function AdminSettings() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("geral");

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações Globais</h1>
          <p className="text-gray-500 mt-1">Configure todos os parâmetros do sistema</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-gray-100 p-1 rounded-lg inline-flex gap-1">
            <TabsTrigger 
              value="geral" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 text-sm"
            >
              <Settings className="w-4 h-4 mr-2" />
              Geral
            </TabsTrigger>
            <TabsTrigger 
              value="email"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 text-sm"
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </TabsTrigger>
            <TabsTrigger 
              value="seguranca"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 text-sm"
            >
              <Shield className="w-4 h-4 mr-2" />
              Segurança
            </TabsTrigger>
            <TabsTrigger 
              value="notificacoes"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 text-sm"
            >
              <Bell className="w-4 h-4 mr-2" />
              Notificações
            </TabsTrigger>
            <TabsTrigger 
              value="aparencia"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 text-sm"
            >
              <Palette className="w-4 h-4 mr-2" />
              Aparência
            </TabsTrigger>
            <TabsTrigger 
              value="webhooks"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 text-sm"
            >
              <Webhook className="w-4 h-4 mr-2" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger 
              value="api"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 text-sm"
            >
              <Key className="w-4 h-4 mr-2" />
              Chaves API
            </TabsTrigger>
            <TabsTrigger 
              value="integracoes"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 text-sm"
            >
              <Link className="w-4 h-4 mr-2" />
              Integrações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="mt-6">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Configurações Gerais
                </CardTitle>
                <p className="text-sm text-gray-500">Configurações básicas da conta e sistema</p>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-700">Nome da Conta/Organização</Label>
                    <Input 
                      defaultValue="Gestão 360" 
                      className="bg-white border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">Tipo de Conta</Label>
                    <Select defaultValue="admin">
                      <SelectTrigger className="bg-white border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Logo da Empresa</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-100 border border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                      <Upload className="w-6 h-6 text-gray-400" />
                    </div>
                    <Button variant="outline" className="text-gray-700 border-gray-300">
                      Upload Logo
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-700">Timezone</Label>
                    <Select defaultValue="sao_paulo">
                      <SelectTrigger className="bg-white border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="sao_paulo">São Paulo (GMT-3)</SelectItem>
                        <SelectItem value="new_york">New York (GMT-5)</SelectItem>
                        <SelectItem value="london">London (GMT+0)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">Moeda Padrão</Label>
                    <Select defaultValue="brl">
                      <SelectTrigger className="bg-white border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="brl">Real (BRL)</SelectItem>
                        <SelectItem value="usd">Dólar (USD)</SelectItem>
                        <SelectItem value="eur">Euro (EUR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-700">Formato de Data</Label>
                    <Select defaultValue="ddmmyyyy">
                      <SelectTrigger className="bg-white border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="ddmmyyyy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="mmddyyyy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="yyyymmdd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">Idioma Padrão</Label>
                    <Select defaultValue="pt_br">
                      <SelectTrigger className="bg-white border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="pt_br">Português (BR)</SelectItem>
                        <SelectItem value="en_us">English (US)</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-700">Status da Conta</Label>
                    <Select defaultValue="ativo">
                      <SelectTrigger className="bg-white border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                        <SelectItem value="suspenso">Suspenso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">Plano/Assinatura</Label>
                    <Input 
                      defaultValue="Enterprise" 
                      className="bg-gray-50 border-gray-200"
                      disabled
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <Button className="bg-red-500 hover:bg-red-600 text-white">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Configurações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="mt-6">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="p-8 text-center text-gray-500">
                Configurações de email em desenvolvimento
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seguranca" className="mt-6">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="p-8 text-center text-gray-500">
                Configurações de segurança em desenvolvimento
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notificacoes" className="mt-6">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="p-8 text-center text-gray-500">
                Configurações de notificações em desenvolvimento
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="aparencia" className="mt-6">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="p-8 text-center text-gray-500">
                Configurações de aparência em desenvolvimento
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks" className="mt-6">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="p-8 text-center text-gray-500">
                Configurações de webhooks em desenvolvimento
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="mt-6">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="p-8 text-center text-gray-500">
                Configurações de chaves API em desenvolvimento
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integracoes" className="mt-6">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="p-8 text-center text-gray-500">
                Configurações de integrações em desenvolvimento
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
