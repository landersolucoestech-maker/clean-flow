import { Leads as LeadsPageContent } from "../pages/LeadsPageContent";
import { CrmPageBridge } from "../../components/CrmPageBridge";

export function Leads() {
  return (
    <CrmPageBridge>
      <LeadsPageContent />
    </CrmPageBridge>
  );
}
