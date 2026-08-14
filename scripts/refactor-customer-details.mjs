import fs from "node:fs";

const file = "apps/web/src/modules/crm/customers/components/CustomerDetailsModal.tsx";
let source = fs.readFileSync(file, "utf8");

const customerImport = 'import { Customer } from "@/hooks/useCustomers";';
if (!source.includes(customerImport)) throw new Error("Customer import missing");
source = source.replace(
  customerImport,
  `${customerImport}\nimport { CustomerDetailsHeader, CustomerDetailsTabsList } from "./CustomerDetailsChrome";\nimport { formatCustomerDate, getCustomerLastServiceDate, getCustomerStatusBadgeClass, getCustomerTotalRevenue, parseInactiveCustomerInfo } from "../utils/customerDetails";`,
);

const helperStart = source.indexOf('// Helper to format date');
const componentStart = source.indexOf('export function CustomerDetailsModal', helperStart);
if (helperStart < 0 || componentStart < 0) throw new Error('CustomerDetails helper block missing');
source = source.slice(0, helperStart) + source.slice(componentStart);

const derivedStart = source.indexOf('  // Calculate last service date from completed jobs');
const derivedEndMarker = '  const inactiveInfo = parseInactiveInfo();';
const derivedEnd = source.indexOf(derivedEndMarker, derivedStart);
if (derivedStart < 0 || derivedEnd < 0) throw new Error('CustomerDetails derived-data block missing');
const derivedReplacement = `  const lastServiceDate = getCustomerLastServiceDate(customerJobs, customer?.last_service);\n  const totalRevenue = getCustomerTotalRevenue(customerInvoices);\n  const inactiveInfo = parseInactiveCustomerInfo(customer);`;
source = source.slice(0, derivedStart) + derivedReplacement + source.slice(derivedEnd + derivedEndMarker.length);

const headerStart = source.indexOf('          <div className="flex items-center gap-4">');
const headerEnd = source.indexOf('          </div>\n        </DialogHeader>', headerStart);
if (headerStart < 0 || headerEnd < 0) throw new Error('CustomerDetails header markup missing');
source = source.slice(0, headerStart) + '          <CustomerDetailsHeader customer={customer} inactiveInfo={inactiveInfo} />\n' + source.slice(headerEnd + '          </div>\n'.length);

const tabsStart = source.indexOf('          <TabsList className="grid w-full grid-cols-8 h-auto">');
const tabsEndMarker = '          </TabsList>';
const tabsEnd = source.indexOf(tabsEndMarker, tabsStart);
if (tabsStart < 0 || tabsEnd < 0) throw new Error('CustomerDetails tabs list missing');
source = source.slice(0, tabsStart) + '          <CustomerDetailsTabsList />' + source.slice(tabsEnd + tabsEndMarker.length);

source = source.replaceAll('formatDate(', 'formatCustomerDate(');
source = source.replaceAll('getStatusBadgeClass(', 'getCustomerStatusBadgeClass(');

source = source.replace('Dialog, DialogContent, DialogHeader, DialogTitle', 'Dialog, DialogContent, DialogHeader');
source = source.replace('Tabs, TabsContent, TabsList, TabsTrigger', 'Tabs, TabsContent');

if (source.includes('const formatDate =')) throw new Error('Inline date formatter remains');
if (source.includes('const getStatusBadgeClass =')) throw new Error('Inline status formatter remains');
if (source.includes('parseInactiveInfo')) throw new Error('Inline inactive parser remains');
if (!source.includes('<CustomerDetailsHeader customer={customer} inactiveInfo={inactiveInfo} />')) throw new Error('Customer details header not wired');
if (!source.includes('<CustomerDetailsTabsList />')) throw new Error('Customer details tabs list not wired');

fs.writeFileSync(file, source);
