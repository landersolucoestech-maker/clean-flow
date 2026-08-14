import { T } from "@/shared/components/i18n/T";
import type { Dispatch, SetStateAction } from "react";
import { Calendar, MessageSquare, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { INTERACTION_TYPES, PREFERRED_DAYS, PREFERRED_TIMES } from "../constants/leadFormOptions";
import type { LeadInteractionEntry } from "../types/leadForm";
import type { LeadFormData } from "../hooks/useLeadFormState";

interface LeadPreferencesHistorySectionsProps {
  formData: LeadFormData;
  setFormData: Dispatch<SetStateAction<LeadFormData>>;
  interactions: LeadInteractionEntry[];
  isIntegrationLead: boolean;
  interactionLabel?: string;
  togglePreferredDay: (day: string) => void;
  handleAmountBlur: (value: string) => void;
  addInteraction: () => void;
  removeInteraction: (id: string) => void;
  updateInteraction: (id: string, field: keyof Omit<LeadInteractionEntry, "id">, value: string) => void;
}

export function LeadPreferencesHistorySections({
  formData,
  setFormData,
  interactions,
  isIntegrationLead,
  interactionLabel = "Interaction",
  togglePreferredDay,
  handleAmountBlur,
  addInteraction,
  removeInteraction,
  updateInteraction,
}: LeadPreferencesHistorySectionsProps) {
  return (
    <>
      <section className="space-y-4">
        <h3 className="border-b pb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          7. Customer Preferences & Visit/Estimate
        </h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label><T k="leads.form.preferredDays" /></Label>
              <Select
                value={formData.preferredDays.length > 0 ? formData.preferredDays[0] : "none"}
                onValueChange={(value) => value === "none" ? setFormData({ ...formData, preferredDays: [] }) : togglePreferredDay(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select days">
                    {formData.preferredDays.length > 0 ? formData.preferredDays.join(", ") : "Select days..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-50 border-border bg-popover">
                  {PREFERRED_DAYS.map((day) => (
                    <div
                      key={day}
                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        togglePreferredDay(day);
                      }}
                    >
                      <Checkbox checked={formData.preferredDays.includes(day)} onCheckedChange={() => togglePreferredDay(day)} />
                      <span className="text-sm">{day}</span>
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label><T k="leads.form.preferredTime" /></Label>
              <Select
                value={formData.preferredTime || "none"}
                onValueChange={(value) => setFormData({ ...formData, preferredTime: value === "none" ? "" : value })}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Select time" /></SelectTrigger>
                <SelectContent className="z-50 border-border bg-popover">
                  <SelectItem value="none"><T k="literal.crm.select_time.ce9f119c" /></SelectItem>
                  {PREFERRED_TIMES.map((time) => <SelectItem key={time.value} value={time.value}>{time.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="visitDate">
                Visit Date
                {isIntegrationLead && <span className="ml-1 text-destructive">*</span>}
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="visitDate"
                  type="date"
                  value={formData.visitDate}
                  onChange={(event) => setFormData({ ...formData, visitDate: event.target.value })}
                  className="pl-10"
                />
              </div>
              {isIntegrationLead && !formData.visitDate && <p className="text-xs text-destructive"><T k="literal.crm.required_for_integration_leads.230e6826" /></p>}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="agreedAmount"><T k="literal.crm.agreed_amount.d7655e5d" /></Label>
                <Input
                  id="agreedAmount"
                  value={formData.agreedAmount}
                  onChange={(event) => setFormData({ ...formData, agreedAmount: event.target.value })}
                  onBlur={(event) => handleAmountBlur(event.target.value)}
                  placeholder="$0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validUntil"><T k="leads.validUntil" /></Label>
                <Input id="validUntil" type="date" value={formData.validUntil} onChange={(event) => setFormData({ ...formData, validUntil: event.target.value })} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="border-b pb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">8. Notes</h3>
        <div className="grid grid-cols-1 gap-4">
          {[
            ["notes", "Notes", "General notes..."],
            ["additionalNotes", "Additional Notes", "Additional notes..."],
            ["specialInstructions", "Special Instructions", "Special instructions for this lead..."],
          ].map(([field, label, placeholder]) => (
            <div key={field} className="space-y-2">
              <Label htmlFor={field}>{label}</Label>
              <Textarea
                id={field}
                value={formData[field as "notes" | "additionalNotes" | "specialInstructions"]}
                onChange={(event) => setFormData({ ...formData, [field]: event.target.value })}
                placeholder={placeholder}
                rows={3}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">9. {interactionLabel} History</h3>
          <Button variant="outline" size="sm" onClick={addInteraction}>
            <Plus className="mr-1 h-4 w-4" />
            Add {interactionLabel}
          </Button>
        </div>
        {interactions.length === 0 ? (
          <p className="rounded-lg bg-muted/30 py-4 text-center text-sm text-muted-foreground">
            No interactions recorded. Click &quot;Add {interactionLabel}&quot; to log a contact.
          </p>
        ) : (
          <div className="space-y-4">
            {interactions.map((interaction, index) => (
              <div key={interaction.id} className="space-y-4 rounded-lg border border-border/50 bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    {interactionLabel} {index + 1}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeInteraction(interaction.id)} className="h-8 w-8 text-destructive hover:text-destructive" aria-label={`Remove ${interactionLabel.toLowerCase()} ${index + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label><T k="transactions.type" /></Label>
                    <Select value={interaction.type} onValueChange={(value) => updateInteraction(interaction.id, "type", value)}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent className="z-50 border-border bg-popover">
                        {INTERACTION_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label><T k="common.date" /></Label><Input type="date" value={interaction.date} onChange={(event) => updateInteraction(interaction.id, "date", event.target.value)} /></div>
                  <div className="space-y-2"><Label><T k="common.time" /></Label><Input type="time" value={interaction.time} onChange={(event) => updateInteraction(interaction.id, "time", event.target.value)} /></div>
                </div>
                <div className="space-y-2">
                  <Label><T k="invoice.description" /></Label>
                  <Textarea value={interaction.description} onChange={(event) => updateInteraction(interaction.id, "description", event.target.value)} placeholder="Describe the interaction..." rows={2} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
