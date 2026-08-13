// ============================================
// CENTRALIZED SERVICE TYPE & FREQUENCY ENUMS
// ============================================
// These enums are business-critical and enforced across:
// - Frontend forms & validation
// - Backend API validation
// - Database constraints
// - Automation rules

// ============================================
// TYPE OF SERVICE - ALLOWED VALUES
// ============================================
export const SERVICE_TYPES = [
  "Regular Cleaning",
  "Deep Cleaning",
  "First Cleaning",
  "One-Time Cleaning",
  "Move-In / Move-Out Cleaning",
  "Office Cleaning",
  "Commercial Cleaning",
  "Post-Construction Cleaning",
  "Cleaning for a Reason",
] as const;

export type ServiceType = typeof SERVICE_TYPES[number];

// ============================================
// FREQUENCY - ALLOWED VALUES
// ============================================
export const FREQUENCY_OPTIONS = [
  "Daily",
  "Weekly",
  "Regular Cleaning 2 Weeks",
  "Regular Cleaning 3 Weeks",
  "Regular Cleaning 4 Weeks",
  "One-Time",
] as const;

export type FrequencyType = typeof FREQUENCY_OPTIONS[number];

// ============================================
// DROPDOWN OPTIONS FOR UI SELECT COMPONENTS
// ============================================
export const SERVICE_TYPE_OPTIONS = SERVICE_TYPES.map(value => ({
  value,
  label: value,
}));

export const FREQUENCY_OPTIONS_UI = FREQUENCY_OPTIONS.map(value => ({
  value,
  label: value,
}));

// ============================================
// CROSS-FIELD VALIDATION RULES
// ============================================

// Services that REQUIRE recurring frequency (cannot be One-Time)
export const RECURRING_ONLY_SERVICES: readonly ServiceType[] = [
  "Regular Cleaning",
  "Office Cleaning",
  "Commercial Cleaning",
] as const;

// Services that REQUIRE One-Time frequency
export const ONE_TIME_ONLY_SERVICES: readonly ServiceType[] = [
  "One-Time Cleaning",
] as const;

// Services that CAN be either recurring or one-time
export const FLEXIBLE_SERVICES: readonly ServiceType[] = [
  "Deep Cleaning",
  "First Cleaning",
  "Move-In / Move-Out Cleaning",
  "Post-Construction Cleaning",
  "Cleaning for a Reason",
] as const;

// ============================================
// VALIDATION FUNCTIONS
// ============================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate if a service type value is allowed
 */
export function isValidServiceType(value: string | null | undefined): value is ServiceType {
  if (!value) return false;
  return SERVICE_TYPES.includes(value as ServiceType);
}

/**
 * Validate if a frequency value is allowed
 */
export function isValidFrequency(value: string | null | undefined): value is FrequencyType {
  if (!value) return false;
  return FREQUENCY_OPTIONS.includes(value as FrequencyType);
}

/**
 * Get allowed frequencies based on selected service type
 */
export function getAllowedFrequencies(serviceType: ServiceType | null | undefined): FrequencyType[] {
  if (!serviceType) return [...FREQUENCY_OPTIONS];

  // Rule A: One-Time Cleaning → Only One-Time frequency
  if (ONE_TIME_ONLY_SERVICES.includes(serviceType as typeof ONE_TIME_ONLY_SERVICES[number])) {
    return ["One-Time"];
  }

  // Rule C: Recurring-only services → All EXCEPT One-Time
  if (RECURRING_ONLY_SERVICES.includes(serviceType as typeof RECURRING_ONLY_SERVICES[number])) {
    return FREQUENCY_OPTIONS.filter(f => f !== "One-Time");
  }

  // Flexible services → All frequencies allowed
  return [...FREQUENCY_OPTIONS];
}

/**
 * Get allowed service types based on selected frequency
 */
export function getAllowedServiceTypes(frequency: FrequencyType | null | undefined): ServiceType[] {
  if (!frequency) return [...SERVICE_TYPES];

  // Rule B: If frequency is NOT One-Time → Cannot select One-Time Cleaning
  if (frequency !== "One-Time") {
    return SERVICE_TYPES.filter(s => !ONE_TIME_ONLY_SERVICES.includes(s as typeof ONE_TIME_ONLY_SERVICES[number]));
  }

  // Rule C: If frequency IS One-Time → Cannot select recurring-only services
  if (frequency === "One-Time") {
    return SERVICE_TYPES.filter(s => !RECURRING_ONLY_SERVICES.includes(s as typeof RECURRING_ONLY_SERVICES[number]));
  }

  return [...SERVICE_TYPES];
}

/**
 * Validate service type and frequency combination
 * Returns validation result with error message if invalid
 */
export function validateServiceFrequencyCombination(
  serviceType: string | null | undefined,
  frequency: string | null | undefined
): ValidationResult {
  // If both are empty, it's valid (fields are optional in some contexts)
  if (!serviceType && !frequency) {
    return { valid: true };
  }

  // Validate individual fields
  if (serviceType && !isValidServiceType(serviceType)) {
    return {
      valid: false,
      error: `Invalid service type: "${serviceType}". Allowed values: ${SERVICE_TYPES.join(", ")}`,
    };
  }

  if (frequency && !isValidFrequency(frequency)) {
    return {
      valid: false,
      error: `Invalid frequency: "${frequency}". Allowed values: ${FREQUENCY_OPTIONS.join(", ")}`,
    };
  }

  // If only one field is set, it's valid
  if (!serviceType || !frequency) {
    return { valid: true };
  }

  // Rule A: One-Time Cleaning MUST have One-Time frequency
  if (serviceType === "One-Time Cleaning" && frequency !== "One-Time") {
    return {
      valid: false,
      error: "One-Time Cleaning service requires One-Time frequency",
    };
  }

  // Rule B: Recurring frequency CANNOT have One-Time Cleaning
  if (frequency !== "One-Time" && serviceType === "One-Time Cleaning") {
    return {
      valid: false,
      error: "Recurring frequency cannot be used with One-Time Cleaning service",
    };
  }

  // Rule C: Recurring-only services CANNOT have One-Time frequency
  if (RECURRING_ONLY_SERVICES.includes(serviceType as typeof RECURRING_ONLY_SERVICES[number]) && frequency === "One-Time") {
    return {
      valid: false,
      error: `${serviceType} requires a recurring frequency (not One-Time)`,
    };
  }

  return { valid: true };
}

/**
 * Auto-correct frequency when service type changes
 * Returns the corrected frequency or null if no change needed
 */
export function getAutoFrequencyForService(serviceType: ServiceType): FrequencyType | null {
  // One-Time Cleaning → Auto-set to One-Time
  if (serviceType === "One-Time Cleaning") {
    return "One-Time";
  }
  return null;
}

/**
 * Check if frequency should be locked (read-only) based on service type
 */
export function isFrequencyLocked(serviceType: ServiceType | null | undefined): boolean {
  if (!serviceType) return false;
  return serviceType === "One-Time Cleaning";
}

// ============================================
// MIGRATION HELPERS - Map old values to new
// ============================================
export const SERVICE_TYPE_MIGRATION_MAP: Record<string, ServiceType> = {
  // Old values → New standardized values
  "first_cleaning": "First Cleaning",
  "First Cleaning": "First Cleaning",
  "regular": "Regular Cleaning",
  "Regular Cleaning": "Regular Cleaning",
  "Regular Clean": "Regular Cleaning",
  "Regular Cleaning weekly": "Regular Cleaning",
  "Regular Cleaning 2weeks": "Regular Cleaning",
  "Regular Cleaning 3weeks": "Regular Cleaning",
  "Regular Cleaning 4weeks": "Regular Cleaning",
  "Regular Cleaning 3times a week": "Regular Cleaning",
  "Regular Cleaning 8weeks": "Regular Cleaning",
  "deep_cleaning": "Deep Cleaning",
  "Deep Cleaning": "Deep Cleaning",
  "Deep Clean": "Deep Cleaning",
  "move_in_out": "Move-In / Move-Out Cleaning",
  "Move-In/Move-Out": "Move-In / Move-Out Cleaning",
  "Deep Move-in Cleaning": "Move-In / Move-Out Cleaning",
  "Deep Move-Out Cleaning": "Move-In / Move-Out Cleaning",
  "Move-out Clean": "Move-In / Move-Out Cleaning",
  "office": "Office Cleaning",
  "Office Cleaning": "Office Cleaning",
  "commercial": "Commercial Cleaning",
  "Commercial Cleaning": "Commercial Cleaning",
  "post_construction": "Post-Construction Cleaning",
  "Post-Construction": "Post-Construction Cleaning",
  "one_time": "One-Time Cleaning",
  "One-time Cleaning": "One-Time Cleaning",
  "One-Time Cleaning": "One-Time Cleaning",
  "Cleaning For Reason": "Cleaning for a Reason",
  "Cleaning for a Reason": "Cleaning for a Reason",
  "Clean Extra": "Deep Cleaning", // Map to closest equivalent
  "Once a Month": "Regular Cleaning", // This was incorrectly used as service, should be frequency
  "Once Every 2 Months": "Regular Cleaning", // This was incorrectly used as service
};

export const FREQUENCY_MIGRATION_MAP: Record<string, FrequencyType> = {
  // Old values → New standardized values
  "daily": "Daily",
  "Daily": "Daily",
  "weekly": "Weekly",
  "Weekly": "Weekly",
  "biweekly": "Regular Cleaning 2 Weeks",
  "Bi-Weekly": "Regular Cleaning 2 Weeks",
  "every_2_weeks": "Regular Cleaning 2 Weeks",
  "every_3_weeks": "Regular Cleaning 3 Weeks",
  "Every 3 Weeks": "Regular Cleaning 3 Weeks",
  "every_4_weeks": "Regular Cleaning 4 Weeks",
  "Every 4 Weeks": "Regular Cleaning 4 Weeks",
  "monthly": "Regular Cleaning 4 Weeks",
  "Monthly": "Regular Cleaning 4 Weeks",
  "Once a Month": "Regular Cleaning 4 Weeks",
  "once_a_month": "Regular Cleaning 4 Weeks",
  "one_time": "One-Time",
  "one-time": "One-Time",
  "One-time": "One-Time",
  "One-Time": "One-Time",
  "Once Every 2 Months": "Regular Cleaning 4 Weeks",
  "Regular Cleaning 2 Weeks": "Regular Cleaning 2 Weeks",
  "Regular Cleaning 3 Weeks": "Regular Cleaning 3 Weeks",
  "Regular Cleaning 4 Weeks": "Regular Cleaning 4 Weeks",
};

/**
 * Normalize a service type value to the standard enum
 */
export function normalizeServiceType(value: string | null | undefined): ServiceType | null {
  if (!value) return null;
  
  // Already a valid type
  if (isValidServiceType(value)) return value;
  
  // Try migration map
  const mapped = SERVICE_TYPE_MIGRATION_MAP[value];
  if (mapped) return mapped;
  
  // Try case-insensitive match
  const lowerValue = value.toLowerCase().trim();
  for (const type of SERVICE_TYPES) {
    if (type.toLowerCase() === lowerValue) return type;
  }
  
  return null; // Could not normalize
}

/**
 * Normalize a frequency value to the standard enum
 */
export function normalizeFrequency(value: string | null | undefined): FrequencyType | null {
  if (!value) return null;
  
  // Already a valid type
  if (isValidFrequency(value)) return value;
  
  // Try migration map
  const mapped = FREQUENCY_MIGRATION_MAP[value];
  if (mapped) return mapped;
  
  // Try case-insensitive match
  const lowerValue = value.toLowerCase().trim();
  for (const freq of FREQUENCY_OPTIONS) {
    if (freq.toLowerCase() === lowerValue) return freq;
  }
  
  return null; // Could not normalize
}

// ============================================
// REACT HOOK FOR CROSS-FIELD VALIDATION
// ============================================
export interface ServiceFrequencyState {
  serviceType: ServiceType | null;
  frequency: FrequencyType | null;
  allowedServiceTypes: ServiceType[];
  allowedFrequencies: FrequencyType[];
  isFrequencyLocked: boolean;
  validationError: string | null;
}

export function getServiceFrequencyState(
  serviceType: string | null | undefined,
  frequency: string | null | undefined
): ServiceFrequencyState {
  const normalizedService = normalizeServiceType(serviceType);
  const normalizedFrequency = normalizeFrequency(frequency);
  
  const allowedServices = getAllowedServiceTypes(normalizedFrequency);
  const allowedFreqs = getAllowedFrequencies(normalizedService);
  const locked = isFrequencyLocked(normalizedService);
  
  const validation = validateServiceFrequencyCombination(normalizedService, normalizedFrequency);
  
  return {
    serviceType: normalizedService,
    frequency: normalizedFrequency,
    allowedServiceTypes: allowedServices,
    allowedFrequencies: allowedFreqs,
    isFrequencyLocked: locked,
    validationError: validation.valid ? null : (validation.error || null),
  };
}
