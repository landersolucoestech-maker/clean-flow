import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Clock, 
  Calendar, 
  Star,
  ChevronLeft,
  ChevronRight,
  Pencil,
  FileText,
  Send,
  Repeat
} from "lucide-react";

interface Job {
  id: number;
  customer: string;
  address: string;
  time: string;
  date: string;
  cleaner: string;
  type: string;
  priority: string;
}

interface JobDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job | null;
}

// Job notes will be loaded from the database
const jobNotes: { id: number; text: string; author: string }[] = [];

export function JobDetailsModal({ open, onOpenChange, job }: JobDetailsModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 4;

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden max-h-[90vh] overflow-y-auto border-0 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-xl font-bold text-foreground">{job.customer}</h2>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Address and Payment Type Row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Address Type</p>
                <p className="text-sm font-medium text-foreground">{job.address}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-5 h-5 rounded bg-muted flex items-center justify-center">
                <span className="text-[10px] font-bold text-muted-foreground">$1</span>
              </div>
              <p className="text-xs text-muted-foreground">Payment Type: "Zelle"</p>
            </div>
          </div>

          {/* Cleaning Type and Frequency Row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileText className="w-3.5 h-3.5 text-cyan-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cleaning Type</p>
                <p className="text-sm font-medium text-foreground">{job.type}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Repeat className="w-3.5 h-3.5 text-cyan-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cleaning frequency</p>
                <p className="text-sm font-medium text-foreground">Regular Cleaning 2 Weeks</p>
              </div>
            </div>
          </div>

          {/* Date/Time and Cleaners Row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cleaning Day and Time</p>
                <p className="text-sm font-medium text-foreground">{job.date}</p>
                <p className="text-sm font-medium text-foreground">{job.time}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Cleaners</p>
                <div className="flex gap-1">
                  <Badge className="bg-cyan-500 hover:bg-cyan-600 text-white text-[10px] px-2 py-0.5 font-medium">
                    Maria Silva
                  </Badge>
                  <Badge className="bg-cyan-500 hover:bg-cyan-600 text-white text-[10px] px-2 py-0.5 font-medium">
                    Maria Silva
                  </Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5 mt-1">
                <Star className="w-3 h-3" />
                Request Review
              </Button>
            </div>
          </div>

          {/* Pagination and Job Notes Header */}
          <div className="flex items-center gap-4 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-6 w-6 rounded"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <span className="text-xs text-muted-foreground w-4 text-center">{currentPage}</span>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-6 w-6 rounded"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
            <span className="text-sm font-medium text-foreground">Job Notes</span>
          </div>

          {/* Notes List */}
          <div className="space-y-3 max-h-28 overflow-y-auto">
            {jobNotes.map((note) => (
              <div key={note.id} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 mt-2 flex-shrink-0" />
                <div>
                  <p className="text-xs text-foreground leading-relaxed">{note.text}</p>
                  <p className="text-[10px] text-muted-foreground italic">"{note.author}"</p>
                </div>
              </div>
            ))}
          </div>

          {/* Timeline Section */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-cyan-500" />
                <span className="text-sm text-muted-foreground italic">On Our Way</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm text-foreground">7:00 AM</span>
                <Button variant="ghost" size="icon" className="h-5 w-5">
                  <Pencil className="w-3 h-3 text-muted-foreground" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-cyan-500" />
                <span className="text-sm text-muted-foreground italic">Job Started</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm text-foreground">7:00 AM</span>
                <Button variant="ghost" size="icon" className="h-5 w-5">
                  <Pencil className="w-3 h-3 text-muted-foreground" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-cyan-500" />
                <span className="text-sm text-muted-foreground italic">Job Finished</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm text-foreground">7:00 AM</span>
                <Button variant="ghost" size="icon" className="h-5 w-5">
                  <Pencil className="w-3 h-3 text-muted-foreground" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full border border-muted-foreground/50" />
                <span className="text-sm text-muted-foreground italic">Cleaning Time Total</span>
              </div>
              <span className="text-sm text-foreground">2h 24min</span>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="space-y-3 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-sm text-muted-foreground">Cleaning Rate</span>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-sm font-medium text-foreground">$170.00</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs text-muted-foreground">Payment status</span>
                  <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] px-2 py-0.5 font-medium">
                    Pending
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-semibold text-foreground">Total</span>
              <span className="text-base font-bold text-foreground">$170.00</span>
            </div>
          </div>

          {/* Invoice Section */}
          <div className="space-y-2 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm text-muted-foreground">Invoice status</span>
            </div>
            <div className="flex items-center gap-2 pl-4">
              <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5">
                <Send className="w-3 h-3" />
                Send Invoice
              </Button>
              <Badge className="bg-cyan-500 hover:bg-cyan-600 text-white text-[10px] px-2.5 py-0.5 font-medium">
                Sent
              </Badge>
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-3 border-t border-border/50">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
