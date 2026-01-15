import { Badge } from "@/components/ui/badge";
import { Clock, MapPin } from "lucide-react";

interface AppointmentCardProps {
  appointment: {
    id: number;
    time: string;
    customer: string;
    address: string;
    service: string;
    staff: string;
    status: string;
    duration: string;
  };
}

export function AppointmentCard({ appointment }: AppointmentCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "default";
      case "on-the-way":
        return "secondary";
      case "in-progress":
        return "secondary";
      case "completed":
        return "outline";
      default:
        return "default";
    }
  };

  return (
    <div className="bg-background border border-border rounded-md p-2 mb-1 text-xs hover:bg-accent/50 cursor-pointer">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-1">
          <Clock className="w-3 h-3 text-primary" />
          <span className="font-medium">{appointment.time}</span>
        </div>
        <Badge variant={getStatusColor(appointment.status)} className="text-xs px-1 py-0">
          {appointment.status === "in-progress"
            ? "Cleaning Now"
            : appointment.status === "on-the-way"
              ? "On The Way"
              : appointment.status}
        </Badge>
      </div>
      
      <div className="space-y-1">
        <p className="font-medium truncate">{appointment.customer}</p>
        <p className="text-muted-foreground truncate">{appointment.service}</p>
        <div className="flex items-center space-x-1">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground truncate">{appointment.address}</span>
        </div>
        <p className="text-muted-foreground">Staff: {appointment.staff}</p>
      </div>
    </div>
  );
}