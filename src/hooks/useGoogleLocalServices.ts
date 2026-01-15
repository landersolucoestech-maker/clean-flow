import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { googleState } from "@/lib/googleState";
import { toast } from "sonner";

interface LocalServicesLead {
  leadId: string;
  accountId?: string;
  businessName?: string;
  leadType?: string;
  chargeStatus?: string;
  currencyCode?: string;
  disputeStatus?: string;
  leadCategory?: string;
  leadCreationTimestamp?: string;
  leadPrice?: number;
  messageLead?: {
    customerName?: string;
    customerPhoneNumber?: string;
    jobType?: string;
    postalCode?: string;
  };
  phoneLead?: {
    chargedCallTimestamp?: string;
    chargedConnectedCallDurationSeconds?: string;
    consumerPhoneNumber?: string;
  };
}

interface AccountReport {
  accountId?: string;
  averageFiveStarRating?: number;
  averageWeeklyBudget?: number;
  businessName?: string;
  currentPeriodChargedLeads?: number;
  currentPeriodConnectedPhoneCalls?: number;
  currentPeriodPhoneCalls?: number;
  currentPeriodTotalCost?: number;
  impressionsLastTwoDays?: number;
  phoneLeadResponsiveness?: number;
  previousPeriodChargedLeads?: number;
  previousPeriodConnectedPhoneCalls?: number;
  previousPeriodPhoneCalls?: number;
  previousPeriodTotalCost?: number;
  totalReview?: number;
}

interface LocalServicesResponse {
  detailedLeadReports?: LocalServicesLead[];
  accountReports?: AccountReport[];
  nextPageToken?: string;
  newAccessToken?: string;
  error?: string;
}

export const useGoogleLocalServices = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [leads, setLeads] = useState<LocalServicesLead[]>([]);
  const [accountReport, setAccountReport] = useState<AccountReport | null>(null);

  const hasLocalServicesAccess = useCallback(() => {
    const tokens = googleState.getTokens();
    if (!tokens?.scope) return false;
    return tokens.scope.includes("localservices");
  }, []);

  const callLocalServicesApi = useCallback(async (
    action: string,
    data?: Record<string, unknown>
  ): Promise<LocalServicesResponse | null> => {
    const tokens = googleState.getTokens();
    if (!tokens) {
      toast.error("Não conectado ao Google");
      return null;
    }

    try {
      const { data: response, error } = await supabase.functions.invoke("google-local-services", {
        body: {
          action,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          ...data,
        },
      });

      if (error) throw error;

      // Update token if refreshed
      if (response?.newAccessToken) {
        googleState.setTokens({
          ...tokens,
          accessToken: response.newAccessToken,
          expiresAt: Date.now() + 3600 * 1000,
        });
      }

      if (response?.error) {
        throw new Error(response.error);
      }

      return response;
    } catch (error: unknown) {
      console.error("Local Services API error:", error);
      const message = error instanceof Error ? error.message : "Erro ao acessar Local Services";
      toast.error(message);
      return null;
    }
  }, []);

  const fetchLeads = useCallback(async (startDate?: string, endDate?: string, pageSize = 100) => {
    setIsLoading(true);
    try {
      const response = await callLocalServicesApi("list-leads", {
        startDate,
        endDate,
        pageSize,
      });

      if (response?.detailedLeadReports) {
        setLeads(response.detailedLeadReports);
        return response.detailedLeadReports;
      }
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [callLocalServicesApi]);

  const fetchAccountReport = useCallback(async (startDate?: string, endDate?: string) => {
    setIsLoading(true);
    try {
      const response = await callLocalServicesApi("get-report", {
        startDate,
        endDate,
      });

      if (response?.accountReports && response.accountReports.length > 0) {
        setAccountReport(response.accountReports[0]);
        return response.accountReports[0];
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [callLocalServicesApi]);

  const importLeadsToDatabase = useCallback(async (leadsToImport: LocalServicesLead[]) => {
    const imported: string[] = [];
    const failed: string[] = [];

    for (const lead of leadsToImport) {
      try {
        // First, create or find customer
        const customerName = lead.messageLead?.customerName || lead.phoneLead?.consumerPhoneNumber || "Google Local Services Lead";
        const phone = lead.messageLead?.customerPhoneNumber || lead.phoneLead?.consumerPhoneNumber;

        // Check if customer exists by phone
        let customerId: string;
        if (phone) {
          const { data: existingCustomer } = await supabase
            .from("customers")
            .select("id")
            .eq("phone", phone)
            .maybeSingle();

          if (existingCustomer) {
            customerId = existingCustomer.id;
          } else {
            const { data: newCustomer, error: customerError } = await supabase
              .from("customers")
              .insert({
                name: customerName,
                phone,
                source: "Google Local Services",
                status: "active",
              })
              .select("id")
              .single();

            if (customerError) throw customerError;
            customerId = newCustomer.id;
          }
        } else {
          const { data: newCustomer, error: customerError } = await supabase
            .from("customers")
            .insert({
              name: customerName,
              source: "Google Local Services",
              status: "active",
            })
            .select("id")
            .single();

          if (customerError) throw customerError;
          customerId = newCustomer.id;
        }

        // Generate estimate number
        const { count } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true });
        
        const estimateNumber = `EST-${String((count || 0) + 1).padStart(5, "0")}`;

        // Create lead
        const { error: leadError } = await supabase
          .from("leads")
          .insert({
            customer_id: customerId,
            estimate_number: estimateNumber,
            title: lead.leadCategory || lead.messageLead?.jobType || "Google Local Services Lead",
            status: "new",
            origin: "Google Local Services",
            service_type: lead.messageLead?.jobType || lead.leadCategory,
            address: lead.messageLead?.postalCode ? `Postal Code: ${lead.messageLead.postalCode}` : null,
            notes: `Lead ID: ${lead.leadId}\nLead Type: ${lead.leadType || "N/A"}\nCharge Status: ${lead.chargeStatus || "N/A"}`,
          });

        if (leadError) throw leadError;
        imported.push(lead.leadId);
      } catch (error) {
        console.error("Error importing lead:", lead.leadId, error);
        failed.push(lead.leadId);
      }
    }

    if (imported.length > 0) {
      toast.success(`${imported.length} leads importados com sucesso`);
    }
    if (failed.length > 0) {
      toast.error(`${failed.length} leads falharam ao importar`);
    }

    return { imported, failed };
  }, []);

  return {
    isLoading,
    leads,
    accountReport,
    hasLocalServicesAccess,
    fetchLeads,
    fetchAccountReport,
    importLeadsToDatabase,
  };
};
