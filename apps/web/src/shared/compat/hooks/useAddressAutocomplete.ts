import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AddressSuggestion {
  formatted: string;
  street: string;
  housenumber: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  lat: number;
  lon: number;
}

export function useAddressAutocomplete() {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchAddress = useCallback(async (text: string) => {
    if (!text || text.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("address-autocomplete", {
        body: { text, limit: 5 },
      });

      if (error) {
        console.error("Address autocomplete error:", error);
        setSuggestions([]);
        return;
      }

      setSuggestions(data.results || []);
    } catch (err) {
      console.error("Failed to fetch address suggestions:", err);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    isLoading,
    searchAddress,
    clearSuggestions,
  };
}
