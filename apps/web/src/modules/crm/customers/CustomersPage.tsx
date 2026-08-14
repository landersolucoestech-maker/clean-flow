import { Customers as LegacyCustomers } from "../../customers/CustomersPage";
import { CrmLegacyPageBridge } from "../components/CrmLegacyPageBridge";

export function Customers() {
  return (
    <CrmLegacyPageBridge>
      <LegacyCustomers />
    </CrmLegacyPageBridge>
  );
}
