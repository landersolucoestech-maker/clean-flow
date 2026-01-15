import { useState, useCallback, useMemo } from "react";
import {
  SERVICE_TYPES,
  FREQUENCY_OPTIONS,
  ServiceType,
  FrequencyType,
  getAllowedFrequencies,
  getAllowedServiceTypes,
  isFrequencyLocked,
  getAutoFrequencyForService,
  normalizeServiceType,
  normalizeFrequency,
  validateServiceFrequencyCombination,
} from "@/lib/serviceEnums";

interface UseServiceFrequencyValidationProps {
  initialServiceType?: string | null;
  initialFrequency?: string | null;
}

interface UseServiceFrequencyValidationReturn {
  // Normalized values
  serviceType: ServiceType | null;
  frequency: FrequencyType | null;
  
  // Available options (filtered based on cross-field rules)
  allowedServiceTypes: ServiceType[];
  allowedFrequencies: FrequencyType[];
  
  // UI controls
  isFrequencyLocked: boolean;
  validationError: string | null;
  
  // Handlers
  handleServiceTypeChange: (value: string) => void;
  handleFrequencyChange: (value: string) => void;
  
  // For resetting
  reset: () => void;
  
  // For direct setting (e.g., when loading from DB)
  setServiceType: (value: string | null) => void;
  setFrequency: (value: string | null) => void;
}

export function useServiceFrequencyValidation({
  initialServiceType = null,
  initialFrequency = null,
}: UseServiceFrequencyValidationProps = {}): UseServiceFrequencyValidationReturn {
  const [serviceType, setServiceTypeState] = useState<ServiceType | null>(
    () => normalizeServiceType(initialServiceType)
  );
  const [frequency, setFrequencyState] = useState<FrequencyType | null>(
    () => normalizeFrequency(initialFrequency)
  );

  // Calculate allowed options based on current selections
  const allowedServiceTypes = useMemo(
    () => getAllowedServiceTypes(frequency),
    [frequency]
  );

  const allowedFrequencies = useMemo(
    () => getAllowedFrequencies(serviceType),
    [serviceType]
  );

  const frequencyLocked = useMemo(
    () => isFrequencyLocked(serviceType),
    [serviceType]
  );

  const validationError = useMemo(() => {
    const result = validateServiceFrequencyCombination(serviceType, frequency);
    return result.valid ? null : (result.error || null);
  }, [serviceType, frequency]);

  // Handle service type change with auto-frequency logic
  const handleServiceTypeChange = useCallback((value: string) => {
    const normalizedValue = normalizeServiceType(value);
    setServiceTypeState(normalizedValue);

    if (normalizedValue) {
      // Auto-set frequency for One-Time Cleaning
      const autoFrequency = getAutoFrequencyForService(normalizedValue);
      if (autoFrequency) {
        setFrequencyState(autoFrequency);
      } else {
        // Check if current frequency is still allowed
        const allowed = getAllowedFrequencies(normalizedValue);
        if (frequency && !allowed.includes(frequency)) {
          // Reset frequency if not allowed
          setFrequencyState(null);
        }
      }
    }
  }, [frequency]);

  // Handle frequency change
  const handleFrequencyChange = useCallback((value: string) => {
    const normalizedValue = normalizeFrequency(value);
    setFrequencyState(normalizedValue);

    // Check if current service type is still allowed
    if (normalizedValue) {
      const allowed = getAllowedServiceTypes(normalizedValue);
      if (serviceType && !allowed.includes(serviceType)) {
        // Reset service type if not allowed
        setServiceTypeState(null);
      }
    }
  }, [serviceType]);

  // Direct setters for loading from DB
  const setServiceType = useCallback((value: string | null) => {
    setServiceTypeState(normalizeServiceType(value));
  }, []);

  const setFrequency = useCallback((value: string | null) => {
    setFrequencyState(normalizeFrequency(value));
  }, []);

  // Reset to initial values
  const reset = useCallback(() => {
    setServiceTypeState(normalizeServiceType(initialServiceType));
    setFrequencyState(normalizeFrequency(initialFrequency));
  }, [initialServiceType, initialFrequency]);

  return {
    serviceType,
    frequency,
    allowedServiceTypes,
    allowedFrequencies,
    isFrequencyLocked: frequencyLocked,
    validationError,
    handleServiceTypeChange,
    handleFrequencyChange,
    reset,
    setServiceType,
    setFrequency,
  };
}

// Export the types and constants for convenience
export { SERVICE_TYPES, FREQUENCY_OPTIONS, type ServiceType, type FrequencyType } from "@/lib/serviceEnums";
