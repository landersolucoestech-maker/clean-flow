import { T } from "@/shared/components/i18n/T";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { verifyPlatformAdminCredentials } from "@/modules/auth/services/authService";
import { Shield, Mail, Lock, Loader2, ArrowLeft, KeyRound } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";

export function AdminAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await verifyPlatformAdminCredentials(email, password);
      toast({
        title: "Welcome, Admin!",
        description: "You have successfully logged in to the admin panel.",
      });
      navigate("/admin");
    } catch (error: unknown) {
      toast({
        title: "Access Denied",
        description: getErrorMessage(error, "Failed to login"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-slate-950" />

      <div className="hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]" />
      </div>

      <div
        className="hidden"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 flex w-full flex-col items-center justify-center p-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/auth")}
          className="absolute left-4 top-4 text-slate-400 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <T k="literal.admin.back_to_user_login.842948de" />
        </Button>

        <div className="w-full max-w-md">
          <div className="mb-5 flex flex-col items-center">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-violet-500/15">
              <Shield className="h-4 w-4 text-violet-300" />
            </div>
            <h1 className="text-lg font-semibold text-white"><T k="literal.admin.admin_portal.c864d803" /></h1>
            <p className="mt-1 text-xs text-slate-400"><T k="literal.admin.platform_administration_access.c480ca44" /></p>
          </div>

          <Card className="border border-slate-800 bg-slate-900 shadow-none">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-base text-white"><T k="literal.admin.secure_login.c09bb040" /></CardTitle>
              <CardDescription className="text-slate-400">
                <T k="literal.admin.enter_your_administrator_credentials.03a9f580" />
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleLogin} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300"><T k="leads.form.emailAddress" /></Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@platform.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-9 pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-300"><T k="literal.admin.password.8be3c943" /></Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-9 pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-violet-600 text-white hover:bg-violet-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="w-5 h-5 mr-2" />
                      <T k="literal.admin.access_admin_panel.11737e16" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-4 border-t pt-3 border-slate-800">
                <div className="flex items-center justify-center text-slate-500">
                  <div className="flex items-center gap-2 text-xs">
                    <Shield className="w-4 h-4" />
                    <span><T k="literal.admin.secure_platform_authentication.010e0a68" /></span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="mt-4 text-center text-xs text-slate-500">
            <T k="literal.admin.only_authorized_platform_administrators_can_.6acbe0ef" />
          </p>
        </div>
      </div>
    </div>
  );
}
