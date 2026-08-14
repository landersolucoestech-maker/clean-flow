import { AlertCircle, CheckCircle, Clock, Navigation, Timer } from "lucide-react";

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
