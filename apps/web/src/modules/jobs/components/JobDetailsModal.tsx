import { T } from "@/shared/components/i18n/T";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Briefcase, 
  Calendar, 
  Clock, 
  DollarSign, 
  MapPin, 
  User, 
  Users,
  FileText,
  StickyNote,
  AlertTriangle,
  Pencil,
  Trash2
} from "lucide-react";

interface Job {
  id: string;
  customer: string;
  service: string;
  date: string;
  time: string;
  staff1: string;
  staff2: string;
  status: string;
  duration: string;
  amount: string;
  address: string;
  notes?: string;
  additionalNotes?: string[];
}

interface JobDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job | null;
  onEdit?: (job: Job) => void;
  onDelete?: (job: Job) => void;
}

export function JobDetailsModal({
  open,
  onOpenChange,
  job,
  onEdit,
  onDelete
}: JobDetailsModalProps) {
  if (!job) return null;

  const handleEdit = () => {
    onEdit?.(job);
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDelete?.(job);
    onOpenChange(false);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "in-progress":
        return "secondary";
      case "scheduled":
        return "outline";
      case "cancelled":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-start gap-3 sm:items-center sm:gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-light sm:h-9 sm:w-14">
              <Briefcase className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">{job.id}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={getStatusVariant(job.status)}>
                  {job.status.replace('-', ' ')}
                </Badge>
                <span className="text-sm text-muted-foreground">{job.service}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Customer Info */}
          <div className="p-4 rounded-lg bg-muted/30 space-y-3">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <User className="w-4 h-4" />
              <T k="estimate.customerInfo" />
            </h4>
            <div>
              <p className="text-xs text-muted-foreground"><T k="modal.customerName" /></p>
              <p className="text-sm font-medium">{job.customer}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <T k="common.address" />
              </p>
              <p className="text-sm font-medium">{job.address}</p>
            </div>
          </div>

          {/* Job Details */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="p-4 rounded-lg bg-muted/30 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="text-xs"><T k="common.date" /></span>
              </div>
              <p className="text-sm font-medium">{job.date}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-xs"><T k="common.time" /></span>
              </div>
              <p className="text-sm font-medium">{job.time}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-xs"><T k="jobs.duration" /></span>
              </div>
              <p className="text-sm font-medium">{job.duration}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs"><T k="jobs.amount" /></span>
              </div>
              <p className="text-sm font-medium">{job.amount}</p>
            </div>
          </div>

          {/* Service Info */}
          <div className="p-4 rounded-lg bg-muted/30 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span className="text-xs"><T k="modal.serviceType" /></span>
            </div>
            <p className="text-sm font-medium">{job.service}</p>
          </div>

          {/* Status */}
          <div className="p-4 rounded-lg bg-muted/30 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Briefcase className="w-4 h-4" />
              <span className="text-xs"><T k="common.status" /></span>
            </div>
            <Badge variant={getStatusVariant(job.status)}>
              {job.status.replace('-', ' ')}
            </Badge>
          </div>

          {/* Staff Assignment */}
          <div className="p-4 rounded-lg bg-muted/30 space-y-3">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              <T k="literal.jobs.assigned_staff.8f9aab8e" />
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold text-xs">
                    {job.staff1.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">{job.staff1}</p>
                  <p className="text-xs text-muted-foreground"><T k="modal.staffMember1" /></p>
                </div>
              </div>
              {job.staff2 && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-secondary/50 flex items-center justify-center">
                    <span className="text-foreground font-semibold text-xs">
                      {job.staff2.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{job.staff2}</p>
                    <p className="text-xs text-muted-foreground"><T k="modal.staffMember2" /></p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {job.notes && (
            <div className="p-4 rounded-lg bg-muted/30 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <StickyNote className="w-4 h-4" />
                <span className="text-xs"><T k="modal.notes" /></span>
              </div>
              <p className="text-sm">{job.notes}</p>
            </div>
          )}

          {/* Additional Notes */}
          {job.additionalNotes && job.additionalNotes.length > 0 && (
            <div className="p-4 rounded-lg bg-muted/30 space-y-3">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <T k="modal.additionalNotes" />
              </h4>
              <div className="space-y-2">
                {job.additionalNotes.map((note, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-sm shrink-0">⚠️</span>
                    <p className="text-sm">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleEdit} className="flex-1">
            <Pencil className="w-4 h-4 mr-2" />
            <T k="common.edit" />
          </Button>
          <Button variant="destructive" onClick={handleDelete} className="flex-1">
            <Trash2 className="w-4 h-4 mr-2" />
            <T k="common.delete" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
