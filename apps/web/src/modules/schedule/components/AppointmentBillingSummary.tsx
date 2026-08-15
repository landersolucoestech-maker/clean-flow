import { T } from "@/shared/components/i18n/T";
import { Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AppointmentBillingSummaryProps {
  amount?: number | string;
  onSendInvoice: () => void;
}

function formatAmount(amount?: number | string) {
  return amount != null && amount !== "" ? `$${Number(amount).toFixed(2)}` : "Not set";
}

export function AppointmentBillingSummary({ amount, onSendInvoice }: AppointmentBillingSummaryProps) {
  const formattedAmount = formatAmount(amount);
  return (
    <section aria-label="Billing summary">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground"><T k="literal.schedule.cleaning_rate.eb967784" /></span>
            <span className="text-xs font-semibold text-foreground">{formattedAmount}</span>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-2.5">
            <span className="text-xs font-semibold text-foreground"><T k="invoice.total" /></span>
            <span className="text-sm font-semibold text-foreground">{formattedAmount}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-2.5">
            <span className="text-xs text-muted-foreground"><T k="literal.schedule.invoice_status.a5a0bffa" /></span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs shadow-none" onClick={onSendInvoice}>
                <Send className="h-3.5 w-3.5" />
                <T k="literal.schedule.send_invoice.326bdd9f" />
              </Button>
              <Badge variant="secondary" className="text-[10px]"><T k="invoice.sent" /></Badge>
            </div>
          </div>
        </div>
        <div className="flex items-start justify-between gap-3 sm:border-l sm:border-border/70 sm:pl-4">
          <span className="text-xs text-muted-foreground"><T k="literal.schedule.payment_status.9dfea404" /></span>
          <Badge variant="secondary" className="text-[10px]"><T k="leads.pending" /></Badge>
        </div>
      </div>
    </section>
  );
}
