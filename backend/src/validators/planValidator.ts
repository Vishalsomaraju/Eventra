import { GeneratePlanInput, SupportedEventType } from '../types/plan';

export const MIN_GUEST_COUNT = 1;
export const MAX_GUEST_COUNT = 100_000;
export const MIN_BUDGET_INR = 1;
export const MAX_BUDGET_INR = 100_000_000; // 10 Crore INR
export const MAX_STRING_LENGTH_SHORT = 120; // For eventName, eventLocation
export const MAX_PREFERENCES_LENGTH = 1_000;

const SUPPORTED_EVENT_TYPES: ReadonlySet<string> = new Set<SupportedEventType>([
  'wedding',
  'birthday',
  'community',
]);

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Checks if a year is a leap year in the Gregorian calendar.
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Validates calendar date accuracy including variable days per month and leap years.
 */
export function isValidCalendarDate(dateStr: string): boolean {
  if (!ISO_DATE_REGEX.test(dateStr)) {
    return false;
  }

  const parts = dateStr.split('-').map((p) => parseInt(p, 10));
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  if (year === undefined || month === undefined || day === undefined) {
    return false;
  }

  if (year < 2000 || year > 2100) {
    return false;
  }

  if (month < 1 || month > 12) {
    return false;
  }

  const daysInMonths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maxDays = daysInMonths[month - 1];

  if (maxDays === undefined || day < 1 || day > maxDays) {
    return false;
  }

  return true;
}

export interface ValidationResult {
  valid: boolean;
  data?: GeneratePlanInput;
  errors: string[];
}

/**
 * Validates untrusted request body for POST /api/plans/generate.
 */
export function validatePlanInput(body: unknown): ValidationResult {
  const errors: string[] = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      valid: false,
      errors: ['Request body must be a valid non-empty JSON object.'],
    };
  }

  const record = body as Record<string, unknown>;

  // Security check: reject prototype-related properties
  if (
    Object.prototype.hasOwnProperty.call(record, '__proto__') ||
    Object.prototype.hasOwnProperty.call(record, 'constructor') ||
    Object.prototype.hasOwnProperty.call(record, 'prototype')
  ) {
    return {
      valid: false,
      errors: ['Request body contains disallowed prototype keys.'],
    };
  }

  // 1. Event Type Validation
  const rawEventType = record.eventType;
  let eventType: SupportedEventType | undefined;

  if (rawEventType === undefined || rawEventType === null || rawEventType === '') {
    errors.push('eventType is required and must be one of: wedding, birthday, community.');
  } else if (typeof rawEventType !== 'string') {
    errors.push('eventType must be a string.');
  } else {
    const normalizedType = rawEventType.trim().toLowerCase();
    if (!SUPPORTED_EVENT_TYPES.has(normalizedType)) {
      errors.push(`Invalid eventType "${rawEventType}". Supported types: wedding, birthday, community.`);
    } else {
      eventType = normalizedType as SupportedEventType;
    }
  }

  // 2. Guest Count Validation
  const rawGuestCount = record.guestCount;
  let guestCount: number | undefined;

  if (rawGuestCount === undefined || rawGuestCount === null) {
    errors.push('guestCount is required and must be a positive integer.');
  } else if (typeof rawGuestCount !== 'number' || isNaN(rawGuestCount) || !Number.isFinite(rawGuestCount)) {
    errors.push('guestCount must be a valid finite number.');
  } else if (!Number.isInteger(rawGuestCount)) {
    errors.push('guestCount must be a whole integer, not a decimal value.');
  } else if (rawGuestCount < MIN_GUEST_COUNT) {
    errors.push(`guestCount must be at least ${MIN_GUEST_COUNT}.`);
  } else if (rawGuestCount > MAX_GUEST_COUNT) {
    errors.push(`guestCount exceeds maximum allowable limit of ${MAX_GUEST_COUNT.toLocaleString()}.`);
  } else {
    guestCount = rawGuestCount;
  }

  // 3. Budget INR Validation (supports canonical budgetInr, with fallback to totalBudget for frontend alignment)
  const rawBudget = record.budgetInr !== undefined ? record.budgetInr : record.totalBudget;
  let budgetInr: number | undefined;

  if (rawBudget === undefined || rawBudget === null) {
    errors.push('budgetInr is required and must be a positive number in Indian Rupees.');
  } else if (typeof rawBudget !== 'number' || isNaN(rawBudget) || !Number.isFinite(rawBudget)) {
    errors.push('budgetInr must be a valid finite number.');
  } else if (rawBudget < MIN_BUDGET_INR) {
    errors.push(`budgetInr must be greater than or equal to ${MIN_BUDGET_INR} INR.`);
  } else if (rawBudget > MAX_BUDGET_INR) {
    errors.push(`budgetInr exceeds maximum allowable limit of ${MAX_BUDGET_INR.toLocaleString()} INR.`);
  } else {
    // Normalization: round to 2 decimal places (paise precision) to prevent floating-point anomalies
    budgetInr = Math.round(rawBudget * 100) / 100;
  }

  // 4. Event Name Validation (optional)
  let eventName: string | undefined;
  if (record.eventName !== undefined && record.eventName !== null) {
    if (typeof record.eventName !== 'string') {
      errors.push('eventName must be a string.');
    } else {
      const trimmed = record.eventName.trim();
      if (trimmed.length > MAX_STRING_LENGTH_SHORT) {
        errors.push(`eventName cannot exceed ${MAX_STRING_LENGTH_SHORT} characters.`);
      } else if (trimmed.length > 0) {
        eventName = trimmed;
      }
    }
  }

  // 5. Event Date Validation (optional YYYY-MM-DD)
  let eventDate: string | undefined;
  if (record.eventDate !== undefined && record.eventDate !== null) {
    if (typeof record.eventDate !== 'string') {
      errors.push('eventDate must be a string in YYYY-MM-DD format.');
    } else {
      const trimmedDate = record.eventDate.trim();
      if (trimmedDate.length > 0) {
        if (!isValidCalendarDate(trimmedDate)) {
          errors.push(
            `eventDate "${trimmedDate}" is not a valid calendar date in YYYY-MM-DD format (year must be between 2000 and 2100).`
          );
        } else {
          eventDate = trimmedDate;
        }
      }
    }
  }

  // 6. Event Location Validation (optional)
  let eventLocation: string | undefined;
  if (record.eventLocation !== undefined && record.eventLocation !== null) {
    if (typeof record.eventLocation !== 'string') {
      errors.push('eventLocation must be a string.');
    } else {
      const trimmed = record.eventLocation.trim();
      if (trimmed.length > MAX_STRING_LENGTH_SHORT) {
        errors.push(`eventLocation cannot exceed ${MAX_STRING_LENGTH_SHORT} characters.`);
      } else if (trimmed.length > 0) {
        eventLocation = trimmed;
      }
    }
  }

  // 7. Preferences Validation (optional, supports canonical preferences or eventPreferences alias)
  const rawPreferences = record.preferences !== undefined ? record.preferences : record.eventPreferences;
  let preferences: string | undefined;
  if (rawPreferences !== undefined && rawPreferences !== null) {
    if (typeof rawPreferences !== 'string') {
      errors.push('preferences must be a string.');
    } else {
      const trimmed = rawPreferences.trim();
      if (trimmed.length > MAX_PREFERENCES_LENGTH) {
        errors.push(`preferences cannot exceed 1,000 characters.`);
      } else if (trimmed.length > 0) {
        preferences = trimmed;
      }
    }
  }

  if (errors.length > 0 || !eventType || guestCount === undefined || budgetInr === undefined) {
    return {
      valid: false,
      errors,
    };
  }

  return {
    valid: true,
    errors: [],
    data: {
      eventType,
      guestCount,
      budgetInr,
      eventName,
      eventDate,
      eventLocation,
      preferences,
    },
  };
}
