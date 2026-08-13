import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

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

export function useQuickBooks() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("quickbooks-auth", {
        body: { action: "status" },
      });
      if (error) throw error;
      setIsConnected(data?.connected === true);
      setCompanyName(data?.companyName || null);
    } catch {
      setIsConnected(false);
      setCompanyName(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkConnection();
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setIsConnected(false);
        setCompanyName(null);
        setIsLoading(false);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        queueMicrotask(() => void checkConnection());
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, [checkConnection]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.source !== popupRef.current || typeof event.data !== "object" || event.data == null) return;

      if (event.data.type === "quickbooks-callback") {
        const { code, realmId, state } = event.data;
        if (typeof code !== "string" || typeof realmId !== "string" || typeof state !== "string") return;

        setIsLoading(true);
        try {
          const { error } = await supabase.functions.invoke("quickbooks-auth", {
            body: { action: "exchange-token", code, realmId, state },
          });
          if (error) throw error;
          await checkConnection();
          toast.success("QuickBooks conectado com sucesso!");
        } catch (error: unknown) {
          toast.error(`Failed to exchange token: ${getErrorMessage(error, "Unknown error")}`);
        } finally {
          setIsLoading(false);
          popupRef.current = null;
        }
      } else if (event.data.type === "quickbooks-error") {
        toast.error(`QuickBooks: ${event.data.error}`);
        popupRef.current = null;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [checkConnection]);

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
      
      popupRef.current = window.open(
        data.authUrl,
        "QuickBooks Authorization",
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (error: unknown) {
      toast.error(`Failed to connect: ${getErrorMessage(error, "Unknown error")}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke("quickbooks-auth", {
        body: { action: "disconnect" },
      });
      if (error) throw error;
      setIsConnected(false);
      setCompanyName(null);
      toast.success("QuickBooks desconectado");
    } catch (error: unknown) {
      toast.error(`Failed to disconnect: ${getErrorMessage(error, "Unknown error")}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const callApi = useCallback(async (action: string, data?: Record<string, unknown>) => {
    if (!isConnected) throw new Error("Not connected to QuickBooks");

    const { data: result, error } = await supabase.functions.invoke("quickbooks-api", {
      body: { action, data },
    });

    if (error) throw error;
    return result;
  }, [isConnected]);

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

  return {
    isConnected,
    isLoading,
    companyName,
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
