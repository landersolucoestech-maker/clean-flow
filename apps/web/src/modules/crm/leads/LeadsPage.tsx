import { Leads as LegacyLeads } from "../../leads/LeadsPage";
import { CrmLegacyPageBridge } from "../components/CrmLegacyPageBridge";

export function Leads() {
  return (
    <CrmLegacyPageBridge>
      <LegacyLeads />
    </CrmLegacyPageBridge>
  );
}
