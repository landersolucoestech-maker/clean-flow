import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, XCircle, Calendar, ChevronLeft, ChevronRight, Loader2, DollarSign } from "lucide-react";
import { useJobs } from "@/hooks/useJobs";
import { useInvoices } from "@/hooks/useInvoices";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR, es, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";

interface Activity {
  id: string;
  type: "completed" | "scheduled" | "pending" | "cancelled" | "paid";
  descriptionKey: string;
  customerName: string;
  createdBy: string | null;
  time: string;
  statusKey: string;
  icon: typeof CheckCircle;
  color: string;
  timestamp: Date;
}

const ITEMS_PER_PAGE = 4;

export function RecentActivity({ includeInvoices = true }: { includeInvoices?: boolean }) {
  const [currentPage, setCurrentPage] = useState(1);
  const { data: jobs = [], isLoading: isLoadingJobs } = useJobs();
  const { data: invoices = [], isLoading: isLoadingInvoices } = useInvoices(includeInvoices);
  const { t, language } = useLanguage();

  const isLoading = isLoadingJobs || (includeInvoices && isLoadingInvoices);
  
  const locale = (() => {
    switch (language) {
      case 'pt': return ptBR;
      case 'es': return es;
      default: return enUS;
    }
  })();

  const getDateFormat = () => {
    switch (language) {
      case 'pt': return "MM/dd/yyyy 'às' HH:mm";
      case 'es': return "MM/dd/yyyy 'a las' HH:mm";
      default: return "MM/dd/yyyy 'at' h:mm a";
    }
  };

  // Build activities from real data
  const activities: Activity[] = useMemo(() => {
    const allActivities: Activity[] = [];

    // Add job activities
    jobs.forEach(job => {
      const customerName = job.customer?.name || 'Unknown';
      const updatedAt = new Date(job.updated_at);
      const createdBy = job.created_by ?? null;

      if (job.status === 'completed') {
        allActivities.push({
          id: `job-completed-${job.id}`,
          type: 'completed',
          descriptionKey: 'activity.cleaningCompleted',
          customerName,
          createdBy,
          time: formatDistanceToNow(updatedAt, { addSuffix: true, locale }),
          statusKey: 'activity.completed',
          icon: CheckCircle,
          color: 'text-success',
          timestamp: updatedAt,
        });
      } else if (job.status === 'cancelled') {
        allActivities.push({
          id: `job-cancelled-${job.id}`,
          type: 'cancelled',
          descriptionKey: 'activity.appointmentCancelled',
          customerName,
          createdBy,
          time: formatDistanceToNow(updatedAt, { addSuffix: true, locale }),
          statusKey: 'activity.cancelled',
          icon: XCircle,
          color: 'text-destructive',
          timestamp: updatedAt,
        });
      } else if (job.status === 'scheduled') {
        const createdAt = new Date(job.created_at);
        allActivities.push({
          id: `job-scheduled-${job.id}`,
          type: 'scheduled',
          descriptionKey: 'activity.newAppointmentScheduled',
          customerName,
          createdBy,
          time: formatDistanceToNow(createdAt, { addSuffix: true, locale }),
          statusKey: 'activity.scheduled',
          icon: Calendar,
          color: 'text-primary',
          timestamp: createdAt,
        });
      }
    });

    // Add invoice activities
    invoices.forEach(invoice => {
      const customerName = invoice.customer?.name || 'Unknown';
      const updatedAt = new Date(invoice.updated_at);
      const createdBy = invoice.created_by ?? null;

      if (invoice.status === 'paid') {
        allActivities.push({
          id: `invoice-paid-${invoice.id}`,
          type: 'paid',
          descriptionKey: 'activity.paymentReceived',
          customerName,
          createdBy,
          time: formatDistanceToNow(updatedAt, { addSuffix: true, locale }),
          statusKey: 'activity.paid',
          icon: DollarSign,
          color: 'text-success',
          timestamp: updatedAt,
        });
      } else if (invoice.status === 'sent' || invoice.status === 'open') {
        allActivities.push({
          id: `invoice-pending-${invoice.id}`,
          type: 'pending',
          descriptionKey: 'activity.invoicePending',
          customerName,
          createdBy,
          time: formatDistanceToNow(updatedAt, { addSuffix: true, locale }),
          statusKey: 'activity.pending',
          icon: Clock,
          color: 'text-warning',
          timestamp: updatedAt,
        });
      }
    });

    // Sort by timestamp descending (most recent first)
    return allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [jobs, invoices, locale]);

  const totalPages = Math.max(1, Math.ceil(activities.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedActivities = activities.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (isLoading) {
    return (
      <Card className="transition-all duration-200 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t("activity.recentActivity")}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="transition-all duration-200 hover:shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{t("activity.recentActivity")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {paginatedActivities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t("activity.noRecentActivity")}</p>
          </div>
        ) : (
          paginatedActivities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className={`p-2 rounded-lg bg-surface-muted ${activity.color}`}>
                <activity.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {t(activity.descriptionKey)} {activity.customerName}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p className="text-xs text-muted-foreground">
                    {format(activity.timestamp, getDateFormat(), { locale })}
                  </p>
                  <span className="text-xs text-muted-foreground/60">•</span>
                  <p className="text-xs text-muted-foreground/60">
                    {activity.time}
                  </p>
                  {activity.createdBy && (
                    <>
                      <span className="text-xs text-muted-foreground/60">•</span>
                      <p className="text-xs text-muted-foreground">
                        {t("activity.createdBy")}: <span className="font-medium">{activity.createdBy}</span>
                      </p>
                    </>
                  )}
                </div>
              </div>
              <Badge
                variant={
                  activity.type === "completed" || activity.type === "paid"
                    ? "default"
                    : activity.type === "cancelled"
                    ? "destructive"
                    : "secondary"
                }
                className="text-xs"
              >
                {t(activity.statusKey)}
              </Badge>
            </div>
          ))
        )}
        
        {/* Pagination at bottom */}
        {activities.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-center gap-1 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              {currentPage}/{totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
