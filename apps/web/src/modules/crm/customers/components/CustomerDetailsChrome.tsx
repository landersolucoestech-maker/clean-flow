import { T } from "@/shared/components/i18n/T";
import { Badge } from "@/components/ui/badge";
import { DialogTitle } from "@/components/ui/dialog";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Customer } from "@/hooks/useCustomers";
import type { InactiveCustomerInfo } from "../utils/customerDetails";
import { formatCustomerDate } from "../utils/customerDetails";

interface CustomerDetailsHeaderProps {
  customer: Customer;
  inactiveInfo: InactiveCustomerInfo | null;
}

export function CustomerDetailsHeader({ customer, inactiveInfo }: CustomerDetailsHeaderProps) {
  const initials = customer.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="flex items-center gap-4">
      <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
        <span className="text-primary font-bold text-lg">{initials}</span>
      </div>
      <div>
        <DialogTitle className="text-xl">{customer.name}</DialogTitle>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={customer.status === "Active" ? "default" : "secondary"}>{customer.status}</Badge>
          {inactiveInfo?.date && (
            <span className="text-xs text-muted-foreground">
              since {formatCustomerDate(inactiveInfo.date)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function CustomerDetailsTabsList() {
  return (
    <TabsList className="grid w-full grid-cols-8 h-auto">
      <TabsTrigger value="overview" className="text-xs px-1 py-2"><T k="literal.crm.overview.0efc2e6b" /></TabsTrigger>
      <TabsTrigger value="timeline" className="text-xs px-1 py-2"><T k="literal.crm.timeline.018514a3" /></TabsTrigger>
      <TabsTrigger value="contact" className="text-xs px-1 py-2"><T k="common.contact" /></TabsTrigger>
      <TabsTrigger value="addresses" className="text-xs px-1 py-2"><T k="modal.addresses" /></TabsTrigger>
      <TabsTrigger value="jobs" className="text-xs px-1 py-2"><T k="audit.jobs" /></TabsTrigger>
      <TabsTrigger value="invoices" className="text-xs px-1 py-2"><T k="sidebar.invoices" /></TabsTrigger>
      <TabsTrigger value="chat" className="text-xs px-1 py-2"><T k="literal.crm.chat.2ced57f1" /></TabsTrigger>
      <TabsTrigger value="contract" className="text-xs px-1 py-2"><T k="literal.crm.contract.5a0ba3bb" /></TabsTrigger>
    </TabsList>
  );
}
