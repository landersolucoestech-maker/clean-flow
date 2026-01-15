import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Clock, 
  User, 
  Briefcase, 
  Calendar, 
  Users, 
  Phone,
  CheckCircle,
  PlayCircle,
  XCircle,
  Timer
} from "lucide-react";

type ActivityType = "job" | "booking" | "visit" | "appointment";
type ActivityStatus = "scheduled" | "in-progress" | "completed" | "cancelled";

interface AgendaItem {
  id: number;
  time: string;
  clientName: string;
  activityType: ActivityType;
  status: ActivityStatus;
  description?: string;
  assignedTo?: string;
}

const todaysAgenda: AgendaItem[] = [
  {
    id: 1,
    time: "08:30 AM",
    clientName: "Sarah Johnson",
    activityType: "job",
    status: "completed",
    description: "Deep Clean - Residential",
    assignedTo: "Maria Rodriguez"
  },
  {
    id: 2,
    time: "09:00 AM",
    clientName: "Michael Chen",
    activityType: "visit",
    status: "completed",
    description: "Estimate consultation",
    assignedTo: "John Smith"
  },
  {
    id: 3,
    time: "10:30 AM",
    clientName: "Tech Startup Inc.",
    activityType: "job",
    status: "in-progress",
    description: "Office Clean - Commercial",
    assignedTo: "Lisa Chen"
  },
  {
    id: 4,
    time: "11:00 AM",
    clientName: "Emma Williams",
    activityType: "booking",
    status: "scheduled",
    description: "New service inquiry",
    assignedTo: "Admin"
  },
  {
    id: 5,
    time: "02:00 PM",
    clientName: "Miller Family",
    activityType: "job",
    status: "scheduled",
    description: "Regular Clean - Residential",
    assignedTo: "Ana Garcia"
  },
  {
    id: 6,
    time: "03:30 PM",
    clientName: "Dr. Roberts Office",
    activityType: "appointment",
    status: "scheduled",
    description: "Contract renewal meeting",
    assignedTo: "Sales Team"
  },
  {
    id: 7,
    time: "04:00 PM",
    clientName: "Green Valley HOA",
    activityType: "visit",
    status: "cancelled",
    description: "Property assessment",
    assignedTo: "John Smith"
  }
];

export function TodaysAgenda() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  // Show only first 5 items
  const displayedItems = todaysAgenda.slice(0, 5);

  const handleViewAll = () => {
    navigate("/schedule");
  };

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case "job":
        return <Briefcase className="w-4 h-4" />;
      case "booking":
        return <Calendar className="w-4 h-4" />;
      case "visit":
        return <Users className="w-4 h-4" />;
      case "appointment":
        return <Phone className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: ActivityType) => {
    switch (type) {
      case "job":
        return "bg-primary/10 text-primary border-primary/20";
      case "booking":
        return "bg-accent/10 text-accent border-accent/20";
      case "visit":
        return "bg-warning/10 text-warning border-warning/20";
      case "appointment":
        return "bg-secondary/10 text-secondary border-secondary/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getActivityLabel = (type: ActivityType) => {
    switch (type) {
      case "job":
        return t("agenda.job");
      case "booking":
        return t("agenda.booking");
      case "visit":
        return t("agenda.visit");
      case "appointment":
        return t("agenda.appointment");
      default:
        return type;
    }
  };

  const getStatusIcon = (status: ActivityStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-3.5 h-3.5" />;
      case "in-progress":
        return <PlayCircle className="w-3.5 h-3.5" />;
      case "cancelled":
        return <XCircle className="w-3.5 h-3.5" />;
      case "scheduled":
        return <Timer className="w-3.5 h-3.5" />;
      default:
        return <Clock className="w-3.5 h-3.5" />;
    }
  };

  const getStatusColor = (status: ActivityStatus) => {
    switch (status) {
      case "completed":
        return "bg-success/10 text-success border-success/20";
      case "in-progress":
        return "bg-warning/10 text-warning border-warning/20";
      case "cancelled":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "scheduled":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: ActivityStatus) => {
    switch (status) {
      case "completed":
        return t("agenda.completed");
      case "in-progress":
        return t("agenda.inProgress");
      case "cancelled":
        return t("agenda.cancelled");
      case "scheduled":
        return t("agenda.scheduled");
      default:
        return status;
    }
  };

  const getTimelineColor = (status: ActivityStatus) => {
    switch (status) {
      case "completed":
        return "bg-success";
      case "in-progress":
        return "bg-warning";
      case "cancelled":
        return "bg-destructive";
      case "scheduled":
        return "bg-muted-foreground/30";
      default:
        return "bg-muted";
    }
  };

  return (
    <Card className="transition-all duration-200 hover:shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">{t("dashboard.todaysAgenda")}</CardTitle>
        <Button variant="outline" size="sm" onClick={handleViewAll}>
          {t("common.viewAll")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-1">
        {displayedItems.map((item, index) => (
          <div
            key={item.id}
            className={`relative flex items-start gap-4 p-3 rounded-lg transition-colors hover:bg-accent/5 ${
              item.status === "cancelled" ? "opacity-60" : ""
            }`}
          >
            {/* Timeline indicator */}
            <div className="flex flex-col items-center">
              <div className={`w-2.5 h-2.5 rounded-full ${getTimelineColor(item.status)}`} />
              {index < displayedItems.length - 1 && (
                <div className="w-0.5 h-full min-h-[40px] bg-border mt-1" />
              )}
            </div>

            {/* Time */}
            <div className="w-20 flex-shrink-0">
              <span className="text-sm font-medium text-foreground">{item.time}</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h4 className={`font-medium text-foreground ${item.status === "cancelled" ? "line-through" : ""}`}>
                  {item.clientName}
                </h4>
                
                {/* Activity Type Badge */}
                <Badge 
                  variant="outline" 
                  className={`text-xs px-2 py-0.5 flex items-center gap-1 ${getActivityColor(item.activityType)}`}
                >
                  {getActivityIcon(item.activityType)}
                  {getActivityLabel(item.activityType)}
                </Badge>
              </div>

              {item.description && (
                <p className="text-sm text-muted-foreground mb-1.5">{item.description}</p>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                {/* Status Badge */}
                <Badge 
                  variant="outline" 
                  className={`text-xs px-2 py-0.5 flex items-center gap-1 ${getStatusColor(item.status)}`}
                >
                  {getStatusIcon(item.status)}
                  {getStatusLabel(item.status)}
                </Badge>

                {item.assignedTo && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="w-3 h-3" />
                    <span>{item.assignedTo}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
