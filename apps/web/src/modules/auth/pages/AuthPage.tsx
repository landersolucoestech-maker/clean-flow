import { T } from "@/shared/components/i18n/T";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useToast } from "@/shared/hooks/use-toast";
import { requestPasswordReset, signIn, signInWithGoogle } from "../services/authService";
import { Sparkles, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { getErrorMessage } from "@/shared/lib/errors";

export function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signIn(loginEmail, loginPassword);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      navigate("/");
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to login"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle(window.location.origin);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to login with Google"),
        variant: "destructive",
      });
    }
  };

  const handlePasswordReset = async () => {
    if (!loginEmail) {
      toast({ title: "Email required", description: "Enter your login email first.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await requestPasswordReset(loginEmail, `${window.location.origin}/set-password`);
      toast({ title: "Check your email", description: "If the account exists, a recovery link was sent." });
    } catch (error: unknown) {
      toast({
        title: "Unable to request reset",
        description: getErrorMessage(error, "Try again later."),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="relative hidden border-r border-border bg-sidebar-background lg:flex lg:w-[42%]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cud3MzLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48ZyBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiPjxwYXRoIGQ9Ik0zNiAzNHY2aDZ2LTZoLTZ6bTAtMzB2Nmg2di02aC02em0wIDEwdjZoNnYtNmgtNnptMCAxMHY2aDZ2LTZoLTZ6bS0xMC0xMHY2aDZ2LTZoLTZ6bTAgMTB2Nmg2di02aC02em0wLTIwdjZoNnYtNmgtNnptMCAzMHY2aDZ2LTZoLTZ6bS0xMC0xMHY2aDZ2LTZoLTZ6bTAgMTB2Nmg2di02aC02em0wLTIwdjZoNnYtNmgtNnptMC0xMHY2aDZ2LTZoLTZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />

        <div className="relative z-10 flex flex-col justify-center px-10 xl:px-14">
          <div className="mb-6 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-accent">
              <Sparkles className="h-4 w-4 text-sidebar-primary" />
            </div>
            <span className="text-base font-semibold tracking-wide text-sidebar-foreground">Clean Flow</span>
          </div>

          <h1 className="mb-3 max-w-md text-2xl font-semibold leading-tight text-sidebar-foreground">
            <T k="literal.auth.manage_your_cleaning_business_with_ease.23eb0f28" />
          </h1>

          <p className="mb-6 max-w-md text-sm leading-6 text-sidebar-foreground/70">
            <T k="literal.auth.streamline_scheduling_billing_and_customer_m.fe8a8bef" />
          </p>

          <div className="space-y-2.5">
            {[
              "Smart scheduling & dispatch",
              "Automated invoicing & payments",
              "Real-time team tracking",
              "Customer relationship management",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2.5 text-sm text-sidebar-foreground/80">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-sidebar-accent">
                  <ArrowRight className="w-4 h-4" />
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden" />
        <div className="hidden" />
        <div className="hidden" />
      </div>

      <div className="flex w-full items-center justify-center bg-background p-4 lg:w-[58%]">
        <div className="w-full max-w-md">
          <div className="mb-5 flex items-center justify-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span className="text-base font-semibold text-foreground">Clean Flow</span>
          </div>

          <Card className="border border-border bg-card shadow-none">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg font-semibold"><T k="literal.auth.welcome.ca4f9dcf" /></CardTitle>
              <CardDescription><T k="literal.auth.sign_in_with_an_owner_account_or_a_team_invi.2ad5795c" /></CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full">
                <form onSubmit={handleLogin} className="space-y-2.5">
                  <div className="space-y-2">
                    <Label htmlFor="login-email"><T k="common.email" /></Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@company.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password"><T k="literal.admin.password.8be3c943" /></Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto w-full p-0 text-sm"
                    onClick={handlePasswordReset}
                    disabled={isLoading}
                  >
                    <T k="literal.auth.forgot_your_password.a2f060b7" />
                  </Button>
                </form>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground"><T k="literal.auth.or_continue_with.ef46e9b6" /></span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleLogin}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 0 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <T k="literal.auth.continue_with_google.ccc5b0ed" />
                </Button>
                <p className="mt-6 text-center text-xs text-muted-foreground">
                  <T k="literal.auth.new_team_members_receive_an_invitation_from_.cc26a858" />
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Are you a platform admin?{" "}
            <button
              type="button"
              onClick={() => navigate("/admin/auth")}
              className="text-primary hover:underline font-medium"
            >
              <T k="literal.auth.sign_in_here.3b04d69d" />
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
