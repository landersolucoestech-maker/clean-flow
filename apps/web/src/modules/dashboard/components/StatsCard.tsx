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
    <Card className={cn("border-border/80 shadow-sm transition-shadow hover:shadow-md", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 truncate text-2xl font-bold tracking-tight text-foreground">{value}</p>
            <p
              className={cn(
                "mt-2 text-xs font-semibold",
                changeType === "positive" && "text-success",
                changeType === "negative" && "text-destructive",
                changeType === "neutral" && "text-muted-foreground",
              )}
            >
              {change}
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-light">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
