import { T } from "@/shared/components/i18n/T";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { loadGoogleCalendarPreferences } from "../hooks/useGoogleCalendarSync";
import { DialpadIntegrationPanel } from "./DialpadIntegrationPanel";
import { IntegrationsTab as IntegrationsTabContent } from "./IntegrationsTabContent";

export function IntegrationsTab() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    void loadGoogleCalendarPreferences()
      .catch((error) => {
        console.error("Failed to hydrate Google Calendar preferences:", error);
      })
      .finally(() => {
        if (active) setIsReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!isReady) {
    return (
      <div className="flex min-h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        <T k="literal.settings.carregando_integracoes.aba0c8cc" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <DialpadIntegrationPanel />
      <IntegrationsTabContent />
    </div>
  );
}
