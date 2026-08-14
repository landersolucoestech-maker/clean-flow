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
    <section aria-label="Billing summary" className="relative">
      <div className="pointer-events-none absolute -left-8 -top-10 h-24 w-24 rounded-full bg-success/12" />
      <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-warning/14" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground"><T k="literal.schedule.cleaning_rate.eb967784" /></span>
            <span className="text-sm font-semibold text-foreground">{formattedAmount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground"><T k="invoice.total" /></span>
            <span className="text-sm font-semibold text-foreground">{formattedAmount}</span>
          </div>
          <div className="pt-1">
            <span className="text-sm text-muted-foreground"><T k="literal.schedule.invoice_status.a5a0bffa" /></span>
            <div className="mt-2 flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full px-3 text-xs shadow-none" onClick={onSendInvoice}>
                <Send className="h-4 w-4" />
                <T k="literal.schedule.send_invoice.326bdd9f" />
              </Button>
              <Badge className="border-transparent bg-secondary px-2.5 py-1 text-[10px] font-semibold text-secondary-foreground shadow-none"><T k="invoice.sent" /></Badge>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground"><T k="literal.schedule.payment_status.9dfea404" /></span>
            <Badge className="border-transparent bg-secondary px-3 py-1 text-[10px] font-semibold text-secondary-foreground shadow-none"><T k="leads.pending" /></Badge>
          </div>
        </div>
      </div>
    </section>
  );
}
