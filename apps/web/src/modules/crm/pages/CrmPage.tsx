import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/shared";
import { CrmTabs } from "../components/CrmTabs";
import { Customers as CustomersContent } from "../customers/pages/CustomersPageContent";

export function CrmPage() {
  return (
    <PageLayout>
      <PageHeader title="CRM" description="Manage customers, leads and contacts from one unified workspace." />
      <CrmTabs />
      <CustomersContent />
    </PageLayout>
  );
}
