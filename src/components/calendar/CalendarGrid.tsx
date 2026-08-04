import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";

export interface Appointment {
  id: string | number;
  time: string;
  customer: string;
  address: string;
  service: string;
  staff: string;
  status: string;
  duration: string;
  date?: string;
  team?: string;
  staffAssigned?: string[];
  onOurWayTime?: string;
  timeStarted?: string;
  timeFinished?: string;
  customerId?: string;
  customerPhone?: string;
  description?: string;
  title?: string;
  amount?: string | number | null;
  notes?: string;
  additionalNotes?: string;
  feedback?: string;
  paymentMethod?: string;
}

interface StaffMember {
  id: string;
  name: string;
  team?: string | null;
  is_driver: boolean;
}

// Get all unique team numbers from staff members + appointments
const useTeamOptions = (staffMembers: StaffMember[], appointments: Appointment[]) => {
  return useMemo(() => {
    const teamNumbers = new Set<string>();
    
    // Extract teams from staff members
    staffMembers.forEach((staff) => {
      if (staff.team && !isNaN(Number(staff.team))) {
        teamNumbers.add(staff.team);
      }
    });
    
    // Also extract from appointments
    appointments.forEach((apt) => {
      const members = apt.staffAssigned || (apt.staff ? apt.staff.split(",").map((s) => s.trim()) : []);
      members.forEach((teamNum) => {
        if (teamNum && !isNaN(Number(teamNum))) {
          teamNumbers.add(teamNum);
        }
      });
    });
    
    // Ensure we have at least teams 1-6 as base
    const baseTeams = ["1", "2", "3", "4", "5", "6"];
    baseTeams.forEach(t => teamNumbers.add(t));
    
    // Sort numerically
    return Array.from(teamNumbers).sort((a, b) => Number(a) - Number(b));
  }, [staffMembers, appointments]);
};

interface CalendarGridProps {
  appointments: Appointment[];
  staffMembers?: StaffMember[];
  onAppointmentClick?: (appointment: Appointment) => void;
  onEditClick?: (appointment: Appointment) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  selectionMode?: boolean;
}

const cleanerColors = [
  "bg-blue-600",
  "bg-purple-600",
  "bg-emerald-600",
  "bg-red-600",
  "bg-amber-600",
  "bg-cyan-600",
  "bg-pink-600",
  "bg-indigo-600",
  "bg-teal-600",
  "bg-orange-600",
];
const serviceStatuses = [{
  name: "Next cleaning",
  color: "bg-gray-400",
  icon: "🕐"
}, {
  name: "Cleaning done",
  color: "bg-green-400",
  icon: "✓"
}, {
  name: "Cleaning now",
  color: "bg-orange-400",
  icon: "🏠"
}, {
  name: "On the way",
  color: "bg-blue-400",
  icon: "🚗"
}];
const serviceTypeColors: Record<string, string> = {
  "Deep Cleaning": "bg-purple-500",
  "Regular Cleaning 2weeks": "bg-blue-500",
  "Regular Cleaning 3weeks": "bg-cyan-500",
  "Regular Cleaning 4weeks": "bg-teal-500",
  "Regular Cleaning weekly": "bg-green-500",
  "Regular Cleaning 3times a week": "bg-emerald-500",
  // "Once a Month" removed - use "Regular Cleaning 4 Weeks" (bg-teal-500)
  "Clean Extra": "bg-orange-500",
  "Cleaning For Reason": "bg-red-500",
  "Deep Move-in Cleaning": "bg-indigo-500",
  "Deep Move-Out Cleaning": "bg-violet-500",
  "Once Every 2 Months": "bg-pink-500",
  "Regular Cleaning 8weeks": "bg-rose-500"
};
const getServiceColor = (service: string): string => {
  return serviceTypeColors[service] || "bg-gray-500";
};

const teamColors: Record<string, string> = {
  "1": "bg-blue-600",
  "2": "bg-purple-600",
  "3": "bg-emerald-600",
  "4": "bg-red-600",
  "5": "bg-amber-600",
  "6": "bg-cyan-600",
  "7": "bg-pink-600",
  "8": "bg-indigo-600",
  "9": "bg-teal-600",
  "10": "bg-orange-600",
};

const getTeamColor = (team?: string): string => {
  if (!team) return "bg-gray-500";
  const teamNum = team.split(",")[0]?.trim();
  return teamColors[teamNum] || "bg-gray-500";
};
export function CalendarGrid({
  appointments,
  staffMembers,
  onAppointmentClick,
  onEditClick,
  selectedIds = new Set(),
  onSelectionChange,
  selectionMode = false,
}: CalendarGridProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const dbStaffMembers = staffMembers ?? [];
  const TEAM_OPTIONS = useTeamOptions(dbStaffMembers, appointments);

  const handleCheckboxChange = (appointmentId: string, checked: boolean) => {
    if (!onSelectionChange) return;
    const newSelection = new Set(selectedIds);
    if (checked) {
      newSelection.add(appointmentId);
    } else {
      newSelection.delete(appointmentId);
    }
    onSelectionChange(newSelection);
  };

  const handleSelectAllForDay = (date: Date, checked: boolean) => {
    if (!onSelectionChange) return;
    const dayAppointments = getAppointmentsForDate(date);
    const newSelection = new Set(selectedIds);
    dayAppointments.forEach((apt) => {
      const id = String(apt.id);
      if (checked) {
        newSelection.add(id);
      } else {
        newSelection.delete(id);
      }
    });
    onSelectionChange(newSelection);
  };

  // Get week date range for filtering jobs (using local dates consistently)
  const weekDays = useMemo(() => {
    const week = [];
    const startOfWeek = new Date(currentWeek);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0); // Normalize to midnight local time
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      week.push(d);
    }
    return week;
  }, [currentWeek]);

  // Get week date strings for filtering - format as YYYY-MM-DD in LOCAL timezone
  // This matches the database date format which is stored as date-only (no timezone)
  const weekDateStrings = useMemo(() => {
    return weekDays.map(d => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });
  }, [weekDays]);

  // Build teams list with job counts from selected week only
  const teams = useMemo(() => {
    // Filter appointments to only those in the current week
    const weekAppointments = appointments.filter(apt => 
      apt.date && weekDateStrings.includes(apt.date)
    );

    // Count jobs per team from week appointments only
    // staff_assigned stores team numbers like "1", "2", etc.
    const jobCountMap = new Map<string, number>();
    weekAppointments.forEach((apt) => {
      const members = apt.staffAssigned || (apt.staff ? apt.staff.split(",").map((s) => s.trim()) : []);
      members.forEach((teamNum) => {
        if (teamNum) {
          jobCountMap.set(teamNum, (jobCountMap.get(teamNum) || 0) + 1);
        }
      });
    });

    return TEAM_OPTIONS.map((teamNum, index) => ({
      id: teamNum,
      name: `Team ${teamNum}`,
      color: cleanerColors[index % cleanerColors.length],
      jobs: jobCountMap.get(teamNum) || 0,
    }));
  }, [appointments, weekDateStrings, TEAM_OPTIONS]);

  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentWeek(prev => {
      const newDate = new Date(prev);
      const days = direction === "prev" ? -7 : 7;
      newDate.setDate(prev.getDate() + days);
      return newDate;
    });
  };
  const monthYear = currentWeek.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });
  const getAppointmentsForDate = (date: Date) => {
    // Format date as YYYY-MM-DD in LOCAL timezone to match database format
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return appointments.filter(apt => apt.date === dateStr);
  };

  const getJobsCountForDate = (date: Date) => {
    return getAppointmentsForDate(date).length;
  };
  const getStatusIcon = (status: string, appointment?: Appointment) => {
    // If we have timeline times, prefer them over raw status (avoids mismatches)
    const onOurWay = appointment?.onOurWayTime?.trim() ?? "";
    const started = appointment?.timeStarted?.trim() ?? "";
    const finished = appointment?.timeFinished?.trim() ?? "";

    if (finished) return "✓";
    if (started) return "🏠";
    if (onOurWay) return "🚗";

    const statusMap: Record<string, string> = {
      scheduled: "🕐",
      completed: "✓",
      "in-progress": "🏠",
      "on-the-way": "🚗",
    };
    return statusMap[status] || "🕐";
  };
  const handleAppointmentClick = (appointment: Appointment) => {
    if (onAppointmentClick) {
      onAppointmentClick(appointment);
    }
  };

  const handleEditClick = (e: React.MouseEvent, appointment: Appointment) => {
    e.stopPropagation();
    if (onEditClick) {
      onEditClick(appointment);
    }
  };
  return <div className="flex h-full bg-background">
      {/* Left Sidebar */}
      <div className="w-48 bg-muted border-r border-border flex flex-col h-full">
        {/* Teams Header */}
        <div className="p-3 border-b border-border shrink-0">
          <span className="text-sm font-medium">TEAMS</span>
        </div>

        {/* Teams List with scrollbar - takes available space */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {teams.map(team => (
            <div key={team.id} className="p-3 border-b border-border/50 hover:bg-accent/20 cursor-pointer transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${team.color}`} />
                  <span className="text-sm font-medium truncate max-w-[100px]">{team.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {team.jobs} Jobs
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Service Status - fixed at bottom */}
        <div className="border-t border-border p-3 shrink-0 mt-auto">
          <div className="text-sm font-medium mb-2 text-muted-foreground">
            SERVICE STATUS
          </div>
          <div className="space-y-2">
            {serviceStatuses.map((status, index) => <div key={index} className="flex items-center space-x-2 text-xs">
                <span>{status.icon}</span>
                <span className="text-muted-foreground">{status.name}</span>
              </div>)}
          </div>
        </div>
      </div>

      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col">
        {/* Calendar Header */}
        <div className="flex items-center p-4 border-b border-border relative">
          <h2 className="text-xl font-bold text-foreground absolute left-1/2 -translate-x-1/2">{monthYear}</h2>
          <div className="flex items-center space-x-2 ml-auto">
            <Button variant="outline" size="icon" onClick={() => navigateWeek("prev")}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateWeek("next")}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Week Header */}
        <div className="grid grid-cols-7 border-b border-border">
          {weekDays.map((day, index) => {
            const dayAppointments = getAppointmentsForDate(day);
            const allSelected = dayAppointments.length > 0 && dayAppointments.every(apt => selectedIds.has(String(apt.id)));
            const someSelected = dayAppointments.some(apt => selectedIds.has(String(apt.id)));
            
            return (
              <div key={index} className="p-3 text-center border-r border-border last:border-r-0">
                {selectionMode && dayAppointments.length > 0 && (
                  <div className="flex justify-center mb-1">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked) => handleSelectAllForDay(day, !!checked)}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                )}
                <div className="font-medium text-foreground">{day.getDate()}</div>
                <div className="text-xs text-muted-foreground">
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {getJobsCountForDate(day)} Jobs
                </div>
              </div>
            );
          })}
        </div>

        {/* Calendar Grid - All appointments stacked per day */}
        <div className="flex-1 overflow-y-auto grid grid-cols-7">
          {weekDays.map((day, dayIndex) => <div key={dayIndex} className="border-r border-border/50 last:border-r-0 space-y-0.5">
              {getAppointmentsForDate(day).map((appointment, aptIndex) => {
                const appointmentId = String(appointment.id);
                const isSelected = selectedIds.has(appointmentId);
                
                return (
                  <div key={aptIndex} className={`
                      ${getTeamColor(appointment.team)} text-white text-xs cursor-pointer
                      hover:opacity-80 transition-opacity truncate flex items-center px-1 group relative
                      ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}
                    `} title={`${appointment.time} - ${appointment.customer} - Team ${appointment.team || 'N/A'}`} onClick={() => handleAppointmentClick(appointment)}>
                    {selectionMode && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleCheckboxChange(appointmentId, !!checked)}
                        onClick={(e) => e.stopPropagation()}
                        className="mr-1 h-3 w-3 border-white data-[state=checked]:bg-white data-[state=checked]:text-primary"
                      />
                    )}
                    <span className="mr-1">{getStatusIcon(appointment.status, appointment)}</span>
                    <span className="flex-1 truncate">{appointment.customer}</span>
                    {onEditClick && !selectionMode && (
                      <button
                        onClick={(e) => handleEditClick(e, appointment)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/20 rounded"
                        title="Edit Job"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>)}
        </div>
      </div>
    </div>;
}
