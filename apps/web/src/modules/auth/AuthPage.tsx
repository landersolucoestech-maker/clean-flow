import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";

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
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
      if (error) throw error;
      toast({ title: "Welcome back!", description: "You have successfully logged in." });
      navigate("/");
    } catch (error: unknown) {
      toast({ title: "Error", description: getErrorMessage(error, "Failed to login"), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
      if (error) throw error;
    } catch (error: unknown) {
      toast({ title: "Error", description: getErrorMessage(error, "Failed to login with Google"), variant: "destructive" });
    }
  };

  const handlePasswordReset = async () => {
    if (!loginEmail) {
      toast({ title: "Email required", description: "Enter your login email first.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, { redirectTo: `${window.location.origin}/set-password` });
      if (error) throw error;
      toast({ title: "Check your email", description: "If the account exists, a recovery link was sent." });
    } catch (error: unknown) {
      toast({ title: "Unable to request reset", description: getErrorMessage(error, "Try again later."), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary-dark to-secondary relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" />
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-white">CleanPro</span>
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">Manage your cleaning business with ease</h1>
          <p className="text-xl text-white/80 mb-8 max-w-md">Streamline scheduling, billing, and customer management all in one powerful platform.</p>
          <div className="space-y-4">
            {["Smart scheduling & dispatch", "Automated invoicing & payments", "Real-time team tracking", "Customer relationship management"].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-white/90">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"><ArrowRight className="w-4 h-4" /></div>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/20 to-transparent" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-secondary/30 rounded-full blur-3xl" />
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center"><Sparkles className="w-6 h-6 text-white" /></div>
            <span className="text-2xl font-bold text-foreground">CleanPro</span>
          </div>

          <Card className="border-0 shadow-xl bg-card">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold">Welcome</CardTitle>
              <CardDescription>Sign in with an owner account or a team invitation</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="login-email" type="email" placeholder="you@company.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="login-password" type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11" disabled={isLoading}>{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}</Button>
                <Button type="button" variant="link" className="h-auto w-full p-0 text-sm" onClick={handlePasswordReset} disabled={isLoading}>Forgot your password?</Button>
              </form>
              <div className="relative my-6"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or continue with</span></div></div>
              <Button type="button" variant="outline" className="w-full h-11" onClick={handleGoogleLogin}>Continue with Google</Button>
              <p className="mt-6 text-center text-xs text-muted-foreground">New team members receive an invitation from an administrator.</p>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">Are you a platform admin? <button type="button" onClick={() => navigate("/admin/auth")} className="text-primary hover:underline font-medium">Sign in here</button></p>
        </div>
      </div>
    </div>
  );
}
