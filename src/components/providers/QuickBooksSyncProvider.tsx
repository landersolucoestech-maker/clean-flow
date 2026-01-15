import { useEffect } from "react";
import { useQuickBooksSync } from "@/hooks/useQuickBooksSync";
import { useQuickBooksStore } from "@/stores/quickbooks.store";

interface JobCompletedEvent extends CustomEvent {
  detail: {
    jobId: string;
    job: {
      id: string;
      customer_id: string;
      title: string;
      amount: number | null;
      customer?: {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
      };
    };
  };
}

export function QuickBooksSyncProvider({ children }: { children: React.ReactNode }) {
  const { syncJobCompletionInvoice, isConnected } = useQuickBooksSync();
  const { settings } = useQuickBooksStore();

  useEffect(() => {
    const handleJobCompleted = async (event: Event) => {
      const customEvent = event as JobCompletedEvent;
      const { jobId } = customEvent.detail;

      // Only auto-sync if enabled and connected
      if (!isConnected || !settings.autoSyncInvoices) {
        console.log("Auto-sync disabled or not connected to QuickBooks");
        return;
      }

      console.log("Job completed, triggering auto-sync for job:", jobId);
      
      // Small delay to ensure database is updated
      setTimeout(async () => {
        await syncJobCompletionInvoice(jobId);
      }, 500);
    };

    window.addEventListener("job-completed", handleJobCompleted);
    
    return () => {
      window.removeEventListener("job-completed", handleJobCompleted);
    };
  }, [syncJobCompletionInvoice, isConnected, settings.autoSyncInvoices]);

  return <>{children}</>;
}
