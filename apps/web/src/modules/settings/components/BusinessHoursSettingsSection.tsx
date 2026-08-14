import type { BusinessHours } from "@/hooks/useCompanySettings";
import { Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type Translate = (key: string) => string;

interface BusinessHoursSettingsSectionProps {
  t: Translate;
  businessHours: BusinessHours[];
  onUpdate: (index: number, field: keyof BusinessHours, value: string | boolean) => void;
}

export function BusinessHoursSettingsSection({ t, businessHours, onUpdate }: BusinessHoursSettingsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t("settings.businessHours")}
        </CardTitle>
        <CardDescription>{t("settings.setOperatingHours")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {businessHours.map((schedule, index) => (
            <div key={schedule.day} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex flex-1 items-center gap-4">
                <Switch checked={schedule.isOpen} onCheckedChange={(checked) => onUpdate(index, "isOpen", checked)} />
                <span className="w-24 font-medium">{schedule.day}</span>
                {schedule.isOpen ? (
                  <div className="flex items-center gap-2">
                    <Input type="time" value={schedule.open} onChange={(event) => onUpdate(index, "open", event.target.value)} className="w-32" />
                    <span className="text-muted-foreground">{t("settings.to")}</span>
                    <Input type="time" value={schedule.close} onChange={(event) => onUpdate(index, "close", event.target.value)} className="w-32" />
                  </div>
                ) : (
                  <span className="text-muted-foreground">{t("settings.closed")}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
