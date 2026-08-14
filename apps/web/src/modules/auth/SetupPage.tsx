import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bootstrapFirstAdmin } from "./services/authService";
import { getErrorMessage } from "@/lib/errors";

export function Setup() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [staffName, setStaffName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!companyName.trim()) {
      toast.error("Informe o nome da empresa.");
      return;
    }

    setIsSubmitting(true);
    try {
      await bootstrapFirstAdmin(companyName.trim(), staffName.trim() || null);
      toast.success("Administrador inicial configurado.");
      navigate("/", { replace: true });
      window.location.reload();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Não foi possível concluir a configuração."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <CardTitle>Configuração inicial</CardTitle>
          <CardDescription>
            Crie a empresa e vincule sua conta como o primeiro administrador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="company-name">Nome da empresa</Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                autoComplete="organization"
                maxLength={120}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-name">Seu nome</Label>
              <Input
                id="staff-name"
                value={staffName}
                onChange={(event) => setStaffName(event.target.value)}
                autoComplete="name"
                maxLength={120}
              />
            </div>
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Concluir configuração
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
