import { AppointmentCard } from "./AppointmentCard";

interface CalendarDayProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  appointments: Array<{
    id: number;
    time: string;
    customer: string;
    address: string;
    service: string;
    staff: string;
    status: string;
    duration: string;
  }>;
}

export function CalendarDay({ date, isCurrentMonth, isToday, appointments }: CalendarDayProps) {
  return (
    <div className={`
      min-h-[120px] border border-border p-2 
      ${isCurrentMonth ? 'bg-background' : 'bg-muted/30'} 
      ${isToday ? 'bg-primary/5 border-primary' : ''}
      hover:bg-accent/20 transition-colors
    `}>
      <div className={`
        text-sm font-medium mb-2 
        ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
        ${isToday ? 'text-primary font-bold' : ''}
      `}>
        {date.getDate()}
      </div>
      
      <div className="space-y-1 max-h-24 overflow-y-auto">
        {appointments.map((appointment) => (
          <AppointmentCard key={appointment.id} appointment={appointment} />
        ))}
        
        {appointments.length > 2 && (
          <div className="text-xs text-muted-foreground text-center py-1">
            +{appointments.length - 2} more
          </div>
        )}
      </div>
    </div>
  );
}