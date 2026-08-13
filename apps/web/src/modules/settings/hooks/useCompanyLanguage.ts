import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { useEffect } from "react";

/**
 * Hook to sync language between frontend context and database
 * - Syncs with company_settings.preferred_language for company default
 * - Can optionally sync customer language for communications
 */
export function useCompanyLanguage() {
  const { language, setLanguage } = useLanguage();
  const queryClient = useQueryClient();

  // Fetch company settings to get preferred_language
  const { data: companySettings, isLoading } = useQuery({
    queryKey: ["company-settings-language"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("id, preferred_language")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Sync language from database on initial load
  useEffect(() => {
    if (companySettings?.preferred_language) {
      const dbLang = companySettings.preferred_language as Language;
      if (["en", "pt", "es"].includes(dbLang) && dbLang !== language) {
        setLanguage(dbLang);
      }
    }
  }, [companySettings?.preferred_language, language, setLanguage]);

  // Mutation to update company language
  const updateCompanyLanguage = useMutation({
    mutationFn: async (newLanguage: Language) => {
      if (!companySettings?.id) {
        // Create company settings if none exists
        const { error } = await supabase
          .from("company_settings")
          .insert({
            trade_name: "My Company",
            legal_name: "My Company",
            preferred_language: newLanguage,
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("company_settings")
          .update({ preferred_language: newLanguage })
          .eq("id", companySettings.id);
        if (error) throw error;
      }
      return newLanguage;
    },
    onSuccess: (newLanguage) => {
      setLanguage(newLanguage);
      queryClient.invalidateQueries({ queryKey: ["company-settings-language"] });
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
    },
  });

  // Set language and persist to database
  const setAndPersistLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
    updateCompanyLanguage.mutate(newLanguage);
  };

  return {
    language,
    setLanguage: setAndPersistLanguage,
    isLoading,
    companyId: companySettings?.id,
  };
}

/**
 * Hook to get/set a customer's preferred language
 */
export function useCustomerLanguage(customerId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer-language", customerId],
    queryFn: async () => {
      if (!customerId) return null;
      const { data, error } = await supabase
        .from("customers")
        .select("id, preferred_language")
        .eq("id", customerId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });

  const updateCustomerLanguage = useMutation({
    mutationFn: async (newLanguage: Language | null) => {
      if (!customerId) throw new Error("No customer ID");
      const { error } = await supabase
        .from("customers")
        .update({ preferred_language: newLanguage })
        .eq("id", customerId);
      if (error) throw error;
      return newLanguage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-language", customerId] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  return {
    customerLanguage: customer?.preferred_language as Language | null,
    setCustomerLanguage: (lang: Language | null) => updateCustomerLanguage.mutate(lang),
    isLoading,
    isUpdating: updateCustomerLanguage.isPending,
  };
}

/**
 * Get locale string for date formatting based on language
 */
export function getLocaleFromLanguage(language: Language): string {
  switch (language) {
    case "pt":
      return "pt-BR";
    case "es":
      return "es-ES";
    case "en":
    default:
      return "en-US";
  }
}

/**
 * Format date based on language preference
 */
export function formatDateByLanguage(
  date: Date | string,
  language: Language,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  
  // Always use MM/DD/YYYY format as per application standard
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${month}/${day}/${year}`;
}

/**
 * Format currency based on language/locale
 */
export function formatCurrencyByLanguage(
  amount: number,
  language: Language,
  currency: string = "USD"
): string {
  const locale = getLocaleFromLanguage(language);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}
