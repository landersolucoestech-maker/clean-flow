import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import type { FeedbackEntry, JobNote } from "../types/appointmentDetails";

interface AppointmentNotesSectionsProps {
  notes: JobNote[];
  additionalNotes: JobNote[];
  feedbackList: FeedbackEntry[];
  jobNotesExpanded: boolean;
  additionalNotesExpanded: boolean;
  feedbackExpanded: boolean;
  onToggleJobNotes: () => void;
  onToggleAdditionalNotes: () => void;
  onToggleFeedback: () => void;
  onAddJobNote: () => void;
  onAddAdditionalNote: () => void;
  onAddFeedback: () => void;
  onDeleteJobNote: (id: string) => void;
  onDeleteAdditionalNote: (id: string) => void;
  onDeleteFeedback: (id: string) => void;
}

function EntryList({ entries, emptyText, onDelete }: { entries: Array<JobNote | FeedbackEntry>; emptyText?: string; onDelete: (id: string) => void }) {
  if (entries.length === 0 && emptyText) return <p className="pl-5 text-xs italic text-muted-foreground">{emptyText}</p>;
  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <article key={entry.id} className="group flex items-start gap-3">
          <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/50" />
          <div className="min-w-0 flex-1">
            <p className="text-xs leading-relaxed text-foreground">{entry.text}</p>
            <p className="text-[10px] italic text-muted-foreground">
              &quot;{entry.author}&quot;{"date" in entry && entry.date ? ` - ${entry.date}` : ""}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive" onClick={() => onDelete(entry.id)} aria-label="Delete entry">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </article>
      ))}
    </div>
  );
}

function SectionHeader({ title, expanded, onToggle, onAdd, addLabel }: { title: string; expanded: boolean; onToggle: () => void; onAdd: () => void; addLabel: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-7 w-7 shadow-none" onClick={onToggle} aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}>
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "" : "-rotate-90"}`} />
        </Button>
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <Button variant="outline" size="icon" className="h-7 w-7 shadow-none" aria-label={addLabel} onClick={onAdd}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function AppointmentNotesSections(props: AppointmentNotesSectionsProps) {
  return (
    <>
      <section aria-label="Job notes" className="space-y-3">
        <SectionHeader title="Job Notes" expanded={props.jobNotesExpanded} onToggle={props.onToggleJobNotes} onAdd={props.onAddJobNote} addLabel="Add job note" />
        {props.jobNotesExpanded && <EntryList entries={props.notes} onDelete={props.onDeleteJobNote} />}
      </section>
      <Separator />
      <section aria-label="Additional notes" className="space-y-3">
        <SectionHeader title="Additional Notes" expanded={props.additionalNotesExpanded} onToggle={props.onToggleAdditionalNotes} onAdd={props.onAddAdditionalNote} addLabel="Add additional note" />
        {props.additionalNotesExpanded && <EntryList entries={props.additionalNotes} emptyText="No additional notes yet." onDelete={props.onDeleteAdditionalNote} />}
      </section>
      <Separator />
      <section aria-label="Feedback" className="space-y-3">
        <SectionHeader title="Feedback" expanded={props.feedbackExpanded} onToggle={props.onToggleFeedback} onAdd={props.onAddFeedback} addLabel="Add feedback" />
        {props.feedbackExpanded && <EntryList entries={props.feedbackList} emptyText="No feedback yet." onDelete={props.onDeleteFeedback} />}
      </section>
    </>
  );
}
