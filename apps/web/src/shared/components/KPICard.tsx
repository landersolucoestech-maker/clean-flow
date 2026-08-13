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
  iconClassName = "bg-primary-light text-primary-dark",
  valueClassName,
}: KPICardProps) {
  return (
    <Card className="border-border/80 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className={cn("mt-2 text-2xl font-bold tracking-tight text-foreground", valueClassName)}>{value}</p>
          </div>
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", iconClassName)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
