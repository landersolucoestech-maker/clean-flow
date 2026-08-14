import { Customers as CustomersPageContent } from "./pages/CustomersPageContent";
import { CrmLegacyPageBridge } from "../components/CrmLegacyPageBridge";

export function Customers() {
  return (
    <CrmLegacyPageBridge>
      <CustomersPageContent />
    </CrmLegacyPageBridge>
  );
}
