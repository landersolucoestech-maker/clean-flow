import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconClassName?: string;
  valueClassName?: string;
}

export function KPICard({
  title,
  value,
  icon,
  iconClassName = "bg-primary/20 text-primary",
  valueClassName,
}: KPICardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn("text-2xl font-bold", valueClassName)}>{value}</p>
          </div>
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", iconClassName)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
