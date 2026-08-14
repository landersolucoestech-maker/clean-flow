import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, Navigation, Timer } from "lucide-react";
import { useStaffByTeam } from "@/hooks/useStaff";

export function IconBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
      {children}
    </div>
  );
}

export function InfoCell({ icon, label, value, value2 }: { icon: ReactNode; label: string; value: ReactNode; value2?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <IconBubble>{icon}</IconBubble>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-words text-sm font-semibold text-foreground">{value}</p>
        {value2 ? <p className="break-words text-sm font-semibold text-foreground">{value2}</p> : null}
      </div>
    </div>
  );
}

export function Dot({ className }: { className: string }) {
  return <div className={`h-2.5 w-2.5 rounded-full ${className}`} />;
}

export function TeamWithMembers({ teamNum, color }: { teamNum: string; color: string }) {
  const { data: staffMembers, isLoading } = useStaffByTeam(teamNum);
  const uniqueStaffMembers = (() => {
    if (!staffMembers) return [];
    const seen = new Set<string>();
    return staffMembers.filter((staff) => {
      if (seen.has(staff.id)) return false;
      seen.add(staff.id);
      return true;
    });
  })();

  return (
    <div className="space-y-1">
      <Badge className={`${color} border-transparent px-3 py-1 text-[11px] font-semibold text-white shadow-none`}>
        Team {teamNum}
      </Badge>
      <div className="pl-1 text-xs text-muted-foreground">
        {isLoading ? <span>Loading...</span> : uniqueStaffMembers.length > 0 ? uniqueStaffMembers.map((staff) => staff.name).join(", ") : <span className="italic">No members assigned</span>}
      </div>
    </div>
  );
}

export function getAppointmentStatusConfig(status: string) {
  switch (status.toLowerCase()) {
    case "completed":
      return { icon: CheckCircle, colorClass: "bg-success/10 text-success border-success/20", label: "Cleaning Done" };
    case "in-progress":
      return { icon: Timer, colorClass: "bg-amber-500/10 text-amber-600 border-amber-500/20", label: "Cleaning Now" };
    case "on-the-way":
      return { icon: Navigation, colorClass: "bg-sky-500/10 text-sky-700 border-sky-500/20", label: "On Our Way" };
    case "cancelled":
      return { icon: AlertCircle, colorClass: "bg-destructive/10 text-destructive border-destructive/20", label: "Cancelled" };
    default:
      return { icon: Clock, colorClass: "bg-primary-light text-primary-dark border-primary/20", label: "Scheduled" };
  }
}
