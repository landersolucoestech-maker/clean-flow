import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: ReactNode;
  className?: string;
}

export function StatsCard({ title, value, change, changeType, icon, className }: StatsCardProps) {
  return (
    <Card className={cn("transition-colors hover:border-foreground/15", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="mt-1.5 truncate text-xl font-semibold tracking-tight text-foreground">{value}</p>
            <p
              className={cn(
                "mt-1.5 text-[11px] font-medium",
                changeType === "positive" && "text-success",
                changeType === "negative" && "text-destructive",
                changeType === "neutral" && "text-muted-foreground",
              )}
            >
              {change}
            </p>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
