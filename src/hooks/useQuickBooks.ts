import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuickBooksTokens {
  accessToken: string;
  refreshToken: string;
  realmId: string;
  expiresAt: number;
}

interface QuickBooksCustomer {
  Id: string;
  DisplayName: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  Balance?: number;
}

interface QuickBooksInvoice {
  Id: string;
  DocNumber: string;
  CustomerRef: { value: string; name: string };
  TotalAmt: number;
  Balance: number;
  DueDate: string;
  TxnDate: string;
  EmailStatus: string;
}

interface QuickBooksEmployee {
  Id: string;
  DisplayName: string;
  GivenName: string;
  FamilyName: string;
  PrimaryEmailAddr?: { Address: string };
}

const STORAGE_KEY = "quickbooks_tokens";

export function useQuickBooks() {
  const [tokens, setTokens] = useState<QuickBooksTokens | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const refreshTokensRef = useRef<(refreshToken: string) => Promise<void>>();
  const exchangeTokenRef = useRef<(code: string, realmId: string) => Promise<void>>();

  // Load tokens from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as QuickBooksTokens;
      if (parsed.expiresAt > Date.now()) {
        setTokens(parsed);
        setIsConnected(true);
        fetchCompanyInfo(parsed);
      } else {
        // Try to refresh token
        void refreshTokensRef.current?.(parsed.refreshToken);
      }
    }
  }, []);

  // Listen for OAuth callback
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data.type === "quickbooks-callback") {
        const { code, realmId } = event.data;
        await exchangeTokenRef.current?.(code, realmId);
      } else if (event.data.type === "quickbooks-error") {
        toast.error(`QuickBooks: ${event.data.error}`);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const connect = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("quickbooks-auth", {
        body: { action: "get-auth-url" },
      });

      if (error) throw error;

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        data.authUrl,
        "QuickBooks Authorization",
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (error: any) {
      toast.error(`Failed to connect: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const exchangeToken = async (code: string, realmId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("quickbooks-auth", {
        body: { action: "exchange-token", code, realmId },
      });

      if (error) throw error;

      const newTokens: QuickBooksTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        realmId: data.realmId,
        expiresAt: Date.now() + data.expiresIn * 1000,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTokens));
      setTokens(newTokens);
      setIsConnected(true);
      await fetchCompanyInfo(newTokens);
      toast.success("QuickBooks conectado com sucesso!");
    } catch (error: any) {
      toast.error(`Failed to exchange token: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTokens = async (refreshToken: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("quickbooks-auth", {
        body: { action: "refresh-token", refreshToken },
      });

      if (error) throw error;

      const storedTokens = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const newTokens: QuickBooksTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        realmId: storedTokens.realmId,
        expiresAt: Date.now() + data.expiresIn * 1000,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTokens));
      setTokens(newTokens);
      setIsConnected(true);
    } catch (error) {
      // Token refresh failed, need to reconnect
      disconnect();
    }
  };

  refreshTokensRef.current = refreshTokens;
  exchangeTokenRef.current = exchangeToken;

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setTokens(null);
    setIsConnected(false);
    setCompanyName(null);
    toast.success("QuickBooks desconectado");
  }, []);

  const fetchCompanyInfo = async (tokenData: QuickBooksTokens) => {
    try {
      const { data, error } = await supabase.functions.invoke("quickbooks-api", {
        body: {
          action: "get-company-info",
          accessToken: tokenData.accessToken,
          realmId: tokenData.realmId,
        },
      });

      if (error) throw error;
      setCompanyName(data.CompanyInfo?.CompanyName || null);
    } catch (error) {
      console.error("Failed to fetch company info:", error);
    }
  };

  const callApi = useCallback(async (action: string, data?: any) => {
    if (!tokens) {
      throw new Error("Not connected to QuickBooks");
    }

    // Check if token needs refresh
    if (tokens.expiresAt < Date.now() + 60000) {
      await refreshTokensRef.current?.(tokens.refreshToken);
    }

    const { data: result, error } = await supabase.functions.invoke("quickbooks-api", {
      body: {
        action,
        accessToken: tokens.accessToken,
        realmId: tokens.realmId,
        data,
      },
    });

    if (error) throw error;
    return result;
  }, [tokens]);

  // ==================== CUSTOMERS ====================
  const getCustomers = useCallback(async (): Promise<QuickBooksCustomer[]> => {
    const result = await callApi("get-customers");
    return result.QueryResponse?.Customer || [];
  }, [callApi]);

  const createCustomer = useCallback(async (customer: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  }) => {
    const result = await callApi("create-customer", customer);
    return result.Customer;
  }, [callApi]);

  // ==================== INVOICES ====================
  const getInvoices = useCallback(async (): Promise<QuickBooksInvoice[]> => {
    const result = await callApi("get-invoices");
    return result.QueryResponse?.Invoice || [];
  }, [callApi]);

  const getInvoice = useCallback(async (invoiceId: string) => {
    const result = await callApi("get-invoice", { invoiceId });
    return result.Invoice;
  }, [callApi]);

  const createInvoice = useCallback(async (invoice: {
    customerId: string;
    lineItems: Array<{
      description: string;
      amount: number;
      quantity?: number;
      unitPrice?: number;
      itemId?: string;
    }>;
    dueDate?: string;
    invoiceNumber?: string;
    notes?: string;
    email?: string;
  }) => {
    const result = await callApi("create-invoice", invoice);
    return result.Invoice;
  }, [callApi]);

  const sendInvoice = useCallback(async (invoiceId: string, email: string) => {
    const result = await callApi("send-invoice", { invoiceId, email });
    return result.Invoice;
  }, [callApi]);

  const voidInvoice = useCallback(async (invoiceId: string) => {
    const result = await callApi("void-invoice", { invoiceId });
    return result.Invoice;
  }, [callApi]);

  // ==================== PAYMENTS ====================
  const getPayments = useCallback(async () => {
    const result = await callApi("get-payments");
    return result.QueryResponse?.Payment || [];
  }, [callApi]);

  const createPayment = useCallback(async (payment: {
    customerId: string;
    amount: number;
    invoiceId?: string;
  }) => {
    const result = await callApi("create-payment", payment);
    return result.Payment;
  }, [callApi]);

  // ==================== EMPLOYEES & PAYROLL ====================
  const getEmployees = useCallback(async (): Promise<QuickBooksEmployee[]> => {
    const result = await callApi("get-employees");
    return result.QueryResponse?.Employee || [];
  }, [callApi]);

  const createEmployee = useCallback(async (employee: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  }) => {
    const result = await callApi("create-employee", employee);
    return result.Employee;
  }, [callApi]);

  const getVendors = useCallback(async () => {
    const result = await callApi("get-vendors");
    return result.QueryResponse?.Vendor || [];
  }, [callApi]);

  const createVendor = useCallback(async (vendor: {
    name: string;
    email?: string;
    phone?: string;
  }) => {
    const result = await callApi("create-vendor", vendor);
    return result.Vendor;
  }, [callApi]);

  const createBill = useCallback(async (bill: {
    vendorId: string;
    amount: number;
    description?: string;
    dueDate?: string;
    accountId?: string;
  }) => {
    const result = await callApi("create-bill", bill);
    return result.Bill;
  }, [callApi]);

  // Get tokens for API calls
  const getTokens = useCallback(() => {
    return tokens;
  }, [tokens]);

  return {
    isConnected,
    isLoading,
    companyName,
    tokens,
    getTokens,
    connect,
    disconnect,
    // Customers
    getCustomers,
    createCustomer,
    // Invoices
    getInvoices,
    getInvoice,
    createInvoice,
    sendInvoice,
    voidInvoice,
    // Payments
    getPayments,
    createPayment,
    // Employees & Payroll
    getEmployees,
    createEmployee,
    getVendors,
    createVendor,
    createBill,
  };
}
