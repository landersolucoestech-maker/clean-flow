import { Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconBubble } from "./AppointmentDetailsPrimitives";
import type { AppointmentTimeValues } from "../types/appointmentDetails";

interface AppointmentManualTimeEditorProps {
  cleaningTimeTotal: string;
  timeValues: AppointmentTimeValues;
  editingTime: string | null;
  tempTimeValue: string;
  onTempTimeChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: (key: string, currentValue: string) => void;
  onClear: (key: "onOurWay" | "jobStarted" | "jobFinished") => void;
}

export function AppointmentManualTimeEditor(props: AppointmentManualTimeEditorProps) {
  const rows = [
    { key: "onOurWay", icon: <span className="text-sm">🚗</span>, label: "On Our Way", editable: true },
    { key: "jobStarted", icon: <span className="text-sm">🏠</span>, label: "Cleaning Now", editable: true },
    { key: "jobFinished", icon: <span className="text-sm">✓</span>, label: "Cleaning Done", editable: true },
    { key: "total", icon: <span className="text-sm">🕐</span>, label: "Cleaning Time Total", editable: false },
  ] as const;

  return (
    <section aria-label="Job timeline" className="space-y-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">Manual Time Editing</span>
      </div>
      {rows.map((row) => {
        const timeValue = row.key === "total" ? props.cleaningTimeTotal : props.timeValues[row.key as keyof AppointmentTimeValues];
        const isEditing = props.editingTime === row.key;
        return (
          <div key={row.label} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <IconBubble>{row.icon}</IconBubble>
              <span className="truncate text-sm italic text-muted-foreground">{row.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Input value={props.tempTimeValue} onChange={(event) => props.onTempTimeChange(event.target.value)} className="h-7 w-24 text-sm" placeholder="e.g. 7:30 AM" autoFocus />
                  <Button variant="outline" size="icon" className="h-7 w-7 text-success shadow-none" onClick={props.onSave} aria-label={`Save ${row.label}`}>✓</Button>
                  <Button variant="outline" size="icon" className="h-7 w-7 text-destructive shadow-none" onClick={props.onCancel} aria-label={`Cancel ${row.label} edit`}><X className="h-4 w-4" /></Button>
                </>
              ) : (
                <>
                  <span className="text-sm text-foreground">{timeValue || "—"}</span>
                  {row.editable && (
                    <>
                      <Button variant="outline" size="icon" className="h-7 w-7 shadow-none" aria-label={`Edit ${row.label}`} onClick={() => props.onEdit(row.key, timeValue)}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                      {timeValue && <Button variant="outline" size="icon" className="h-7 w-7 text-destructive shadow-none hover:bg-destructive/10 hover:text-destructive" aria-label={`Clear ${row.label}`} onClick={() => props.onClear(row.key)}><Trash2 className="h-4 w-4" /></Button>}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
