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
  iconClassName = "bg-primary/8 text-primary",
  valueClassName,
}: KPICardProps) {
  return (
    <Card className="border-border/90 bg-card shadow-none">
      <CardContent className="p-3.5 sm:p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md [&_svg]:h-4 [&_svg]:w-4", iconClassName)}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium leading-4 text-muted-foreground">{title}</p>
            <p className={cn("mt-0.5 truncate text-lg font-semibold leading-6 tracking-tight text-foreground", valueClassName)}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
