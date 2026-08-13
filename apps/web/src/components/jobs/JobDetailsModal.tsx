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
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
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
              Customer Information
            </h4>
            <div>
              <p className="text-xs text-muted-foreground">Customer Name</p>
              <p className="text-sm font-medium">{job.customer}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Address
              </p>
              <p className="text-sm font-medium">{job.address}</p>
            </div>
          </div>

          {/* Job Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/30 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="text-xs">Date</span>
              </div>
              <p className="text-sm font-medium">{job.date}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Time</span>
              </div>
              <p className="text-sm font-medium">{job.time}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Duration</span>
              </div>
              <p className="text-sm font-medium">{job.duration}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs">Amount</span>
              </div>
              <p className="text-sm font-medium">{job.amount}</p>
            </div>
          </div>

          {/* Service Info */}
          <div className="p-4 rounded-lg bg-muted/30 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span className="text-xs">Service Type</span>
            </div>
            <p className="text-sm font-medium">{job.service}</p>
          </div>

          {/* Status */}
          <div className="p-4 rounded-lg bg-muted/30 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Briefcase className="w-4 h-4" />
              <span className="text-xs">Status</span>
            </div>
            <Badge variant={getStatusVariant(job.status)}>
              {job.status.replace('-', ' ')}
            </Badge>
          </div>

          {/* Staff Assignment */}
          <div className="p-4 rounded-lg bg-muted/30 space-y-3">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Assigned Staff
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold text-xs">
                    {job.staff1.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">{job.staff1}</p>
                  <p className="text-xs text-muted-foreground">Staff Member 1</p>
                </div>
              </div>
              {job.staff2 && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center">
                    <span className="text-foreground font-semibold text-xs">
                      {job.staff2.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{job.staff2}</p>
                    <p className="text-xs text-muted-foreground">Staff Member 2</p>
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
                <span className="text-xs">Notes</span>
              </div>
              <p className="text-sm">{job.notes}</p>
            </div>
          )}

          {/* Additional Notes */}
          {job.additionalNotes && job.additionalNotes.length > 0 && (
            <div className="p-4 rounded-lg bg-muted/30 space-y-3">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Additional Notes
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

        <DialogFooter className="flex gap-2 mt-4">
          <Button variant="outline" onClick={handleEdit} className="flex-1">
            <Pencil className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button variant="destructive" onClick={handleDelete} className="flex-1">
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
