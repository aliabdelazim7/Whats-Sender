import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';
import { PhoneValidationStatus } from '../../types';

export interface PhoneNormalizationResult {
  isValid: boolean;
  status: PhoneValidationStatus;
  original: string;
  normalized: string; // digits only with international prefix (e.g. 201012345678)
  international: string; // formatted e.g. +20 101 234 5678
  country?: string;
  error?: string;
}

/**
 * Clean input by removing non-numeric characters except leading '+'
 * and safely handling spreadsheet number string artifacts.
 */
export function cleanRawPhone(input: any): string {
  if (input === null || input === undefined) return '';
  let str = String(input).trim();

  // If exponential scientific notation happened from Excel (e.g. 2.01E+11)
  if (/^[0-9]+(\.[0-9]+)?e\+[0-9]+$/i.test(str)) {
    try {
      const num = Number(str);
      if (!isNaN(num)) {
        str = BigInt(Math.round(num)).toString();
      }
    } catch {
      // keep original
    }
  }

  // Remove common whitespace and trailing .0 from Excel numeric imports
  str = str.replace(/\.0+$/, '');
  return str;
}

/**
 * Normalizes and validates a phone number.
 * Defaults to Egypt ('EG') if no country specified, but handles international formats (+...).
 * Rejects or flags ambiguous/invalid formats.
 */
export function normalizePhoneNumber(
  rawPhone: any,
  defaultCountry: string = 'EG'
): PhoneNormalizationResult {
  const cleaned = cleanRawPhone(rawPhone);

  if (!cleaned) {
    return {
      isValid: false,
      status: 'invalid',
      original: '',
      normalized: '',
      international: '',
      error: 'Empty phone number',
    };
  }

  // Try parsing with libphonenumber-js
  try {
    const defaultCountryCode = (defaultCountry.toUpperCase() as CountryCode) || 'EG';
    
    // First try parsing directly with default country
    let parsed = parsePhoneNumberFromString(cleaned, defaultCountryCode);

    // If it started with 00, replace with +
    if (!parsed && cleaned.startsWith('00')) {
      parsed = parsePhoneNumberFromString('+' + cleaned.slice(2), defaultCountryCode);
    }

    // If still not parsed and doesn't start with +, try prepending +
    if (!parsed && !cleaned.startsWith('+') && cleaned.length >= 10) {
      parsed = parsePhoneNumberFromString('+' + cleaned);
    }

    if (parsed && parsed.isValid()) {
      const countryCallingCode = parsed.countryCallingCode;
      const nationalNumber = parsed.nationalNumber;
      const e164Digits = `${countryCallingCode}${nationalNumber}`;

      return {
        isValid: true,
        status: 'valid',
        original: cleaned,
        normalized: e164Digits,
        international: parsed.formatInternational(),
        country: parsed.country,
      };
    }

    // If parsed is possible but not strictly valid
    if (parsed && parsed.isPossible()) {
      return {
        isValid: false,
        status: 'ambiguous',
        original: cleaned,
        normalized: parsed.number ? parsed.number.replace(/\D/g, '') : cleaned.replace(/\D/g, ''),
        international: parsed.formatInternational ? parsed.formatInternational() : cleaned,
        country: parsed.country,
        error: 'Ambiguous or incomplete number',
      };
    }

    return {
      isValid: false,
      status: 'invalid',
      original: cleaned,
      normalized: cleaned.replace(/\D/g, ''),
      international: cleaned,
      error: 'Invalid phone number format',
    };
  } catch (err: any) {
    return {
      isValid: false,
      status: 'invalid',
      original: cleaned,
      normalized: cleaned.replace(/\D/g, ''),
      international: cleaned,
      error: err?.message || 'Parsing error',
    };
  }
}

/**
 * Mask phone numbers for safe privacy-preserving reports.
 * Example: +20 100 123 4567 -> +20 100 *** *567
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '***';
  const visiblePrefix = digits.slice(0, 4);
  const visibleSuffix = digits.slice(-2);
  return `+${visiblePrefix}******${visibleSuffix}`;
}
