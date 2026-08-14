import { Customers as CustomersPageContent } from "./CustomersPageContent";
import { CrmPageBridge } from "../../components/CrmPageBridge";

export function Customers() {
  return (
    <CrmPageBridge>
      <CustomersPageContent />
    </CrmPageBridge>
  );
}
