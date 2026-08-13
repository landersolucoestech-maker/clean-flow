import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSupportTickets, TicketPriority, TicketCategory } from "@/hooks/useSupportTickets";
import { useLanguage } from "@/contexts/LanguageContext";

interface CreateTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTicketModal({ open, onOpenChange }: CreateTicketModalProps) {
  const { t } = useLanguage();
  const { createTicket, isCreating } = useSupportTickets();
  
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [category, setCategory] = useState<TicketCategory>("general");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !description.trim()) return;

    createTicket(
      { subject, description, priority, category },
      {
        onSuccess: () => {
          setSubject("");
          setDescription("");
          setPriority("medium");
          setCategory("general");
          onOpenChange(false);
        },
      }
    );
  };

  const priorityOptions: { value: TicketPriority; label: string }[] = [
    { value: "low", label: t("support.priority.low") },
    { value: "medium", label: t("support.priority.medium") },
    { value: "high", label: t("support.priority.high") },
    { value: "urgent", label: t("support.priority.urgent") },
  ];

  const categoryOptions: { value: TicketCategory; label: string }[] = [
    { value: "general", label: t("support.category.general") },
    { value: "billing", label: t("support.category.billing") },
    { value: "technical", label: t("support.category.technical") },
    { value: "feature_request", label: t("support.category.feature_request") },
    { value: "account", label: t("support.category.account") },
    { value: "integration", label: t("support.category.integration") },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("support.new_ticket")}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">{t("support.subject")}</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("support.subject_placeholder")}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("support.category")}</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("support.priority")}</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("support.description_label")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("support.description_placeholder")}
              rows={5}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? t("common.creating") : t("support.create_ticket")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
