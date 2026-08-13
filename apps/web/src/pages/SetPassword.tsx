import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/errors";

export function SetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 12) {
      toast.error("Use at least 12 characters.");
      return;
    }
    if (password !== confirmation) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password configured successfully.");
      navigate("/", { replace: true });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to configure password."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle>Set your password</CardTitle>
          <CardDescription>Finish activating your Clean Flow team account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                required
              />
            </div>
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save password
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
