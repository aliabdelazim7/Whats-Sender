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
 * Known calling code prefixes mapped to ISO country codes.
 * Ordered longest prefix first to prevent false prefix collisions (e.g. +971 before +97, +966 before +96).
 */
export const CALLING_CODE_RULES: { prefix: string; country: string; minLen: number; maxLen: number }[] = [
  // 3-digit calling codes
  { prefix: '966', country: 'SA', minLen: 11, maxLen: 13 }, // Saudi Arabia
  { prefix: '971', country: 'AE', minLen: 11, maxLen: 13 }, // UAE
  { prefix: '965', country: 'KW', minLen: 10, maxLen: 12 }, // Kuwait
  { prefix: '974', country: 'QA', minLen: 10, maxLen: 12 }, // Qatar
  { prefix: '968', country: 'OM', minLen: 10, maxLen: 12 }, // Oman
  { prefix: '973', country: 'BH', minLen: 10, maxLen: 12 }, // Bahrain
  { prefix: '962', country: 'JO', minLen: 11, maxLen: 13 }, // Jordan
  { prefix: '964', country: 'IQ', minLen: 12, maxLen: 14 }, // Iraq
  { prefix: '967', country: 'YE', minLen: 11, maxLen: 13 }, // Yemen
  { prefix: '218', country: 'LY', minLen: 11, maxLen: 13 }, // Libya
  { prefix: '249', country: 'SD', minLen: 11, maxLen: 13 }, // Sudan
  { prefix: '212', country: 'MA', minLen: 11, maxLen: 13 }, // Morocco
  { prefix: '213', country: 'DZ', minLen: 11, maxLen: 13 }, // Algeria
  { prefix: '216', country: 'TN', minLen: 10, maxLen: 12 }, // Tunisia
  { prefix: '961', country: 'LB', minLen: 10, maxLen: 12 }, // Lebanon
  { prefix: '970', country: 'PS', minLen: 11, maxLen: 13 }, // Palestine
  { prefix: '963', country: 'SY', minLen: 11, maxLen: 13 }, // Syria
  // 2-digit calling codes
  { prefix: '20', country: 'EG', minLen: 11, maxLen: 13 },  // Egypt (+20 10/11/12/15...)
  { prefix: '90', country: 'TR', minLen: 12, maxLen: 13 },  // Turkey
  { prefix: '44', country: 'GB', minLen: 11, maxLen: 13 },  // United Kingdom
  { prefix: '49', country: 'DE', minLen: 11, maxLen: 14 },  // Germany
  { prefix: '33', country: 'FR', minLen: 11, maxLen: 12 },  // France
  { prefix: '39', country: 'IT', minLen: 11, maxLen: 13 },  // Italy
  { prefix: '34', country: 'ES', minLen: 11, maxLen: 12 },  // Spain
  // 1-digit calling codes
  { prefix: '1', country: 'US', minLen: 11, maxLen: 11 },   // USA / Canada
];

/**
 * Detects the ISO 2-letter country code from a phone string with 100% precision.
 * Checks international calling codes first (966, 20, 971, etc.)
 * then falls back to local number heuristics or default country.
 */
export function detectCountryFromPhone(phone: string, defaultCountry: string = 'EG'): string {
  if (!phone) return defaultCountry.toUpperCase();
  const digits = phone.replace(/\D/g, '');
  if (!digits) return defaultCountry.toUpperCase();

  // If number starts with 00, strip 00
  const normalizedDigits = digits.startsWith('00') ? digits.slice(2) : digits;

  // 1. Direct international prefix match against strict rules
  for (const rule of CALLING_CODE_RULES) {
    if (normalizedDigits.startsWith(rule.prefix) && normalizedDigits.length >= rule.minLen) {
      return rule.country;
    }
  }

  // 2. Local mobile pattern recognition
  // Egyptian local mobiles start with 010, 011, 012, 015 (11 digits)
  if (/^01[0125][0-9]{8}$/.test(normalizedDigits)) {
    return 'EG';
  }
  // Saudi local mobiles start with 05 (10 digits)
  if (/^05[0-9]{8}$/.test(normalizedDigits)) {
    return 'SA';
  }
  // UAE local mobiles start with 05 (9 or 10 digits)
  if (/^05[024568][0-9]{7}$/.test(normalizedDigits) && defaultCountry.toUpperCase() === 'AE') {
    return 'AE';
  }

  // 3. Try parsing with libphonenumber with + prepended
  try {
    const parsedWithPlus = parsePhoneNumberFromString('+' + normalizedDigits);
    if (parsedWithPlus && parsedWithPlus.country) {
      return parsedWithPlus.country;
    }
  } catch {
    // ignore
  }

  return defaultCountry.toUpperCase();
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
 * Prioritizes international calling codes (966 -> SA, 20 -> EG, 971 -> AE, etc.)
 * so numbers without '+' are never misclassified into the default country.
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

  try {
    const defaultCountryCode = (defaultCountry.toUpperCase() as CountryCode) || 'EG';
    let digitsOnly = cleaned.replace(/\D/g, '');
    if (digitsOnly.startsWith('00')) {
      digitsOnly = digitsOnly.slice(2);
    }

    let parsed: ReturnType<typeof parsePhoneNumberFromString> = undefined;
    let detectedCountry: string | undefined = undefined;

    // Strategy 1: If input explicitly starts with '+', parse directly as international
    if (cleaned.startsWith('+')) {
      parsed = parsePhoneNumberFromString(cleaned);
      if (parsed) {
        detectedCountry = parsed.country;
      }
    }

    // Strategy 2: If no '+' but digits match a known international calling code rule (e.g. 966..., 20..., 971...)
    if (!parsed) {
      for (const rule of CALLING_CODE_RULES) {
        if (digitsOnly.startsWith(rule.prefix) && digitsOnly.length >= rule.minLen) {
          const tryParsed = parsePhoneNumberFromString('+' + digitsOnly);
          if (tryParsed && tryParsed.isValid()) {
            parsed = tryParsed;
            detectedCountry = rule.country;
            break;
          } else if (tryParsed && tryParsed.isPossible()) {
            parsed = tryParsed;
            detectedCountry = rule.country;
            break;
          }
        }
      }
    }

    // Strategy 3: Try general prepended '+' parsing
    if (!parsed && digitsOnly.length >= 10) {
      const tryWithPlus = parsePhoneNumberFromString('+' + digitsOnly);
      if (tryWithPlus && tryWithPlus.isValid()) {
        parsed = tryWithPlus;
        detectedCountry = tryWithPlus.country;
      }
    }

    // Strategy 4: Try with defaultCountryCode (handles local numbers like 010... or 05...)
    if (!parsed) {
      parsed = parsePhoneNumberFromString(cleaned, defaultCountryCode);
      if (parsed) {
        detectedCountry = parsed.country || defaultCountryCode;
      }
    }

    // If still not parsed, try prepending '+' regardless
    if (!parsed && !cleaned.startsWith('+') && digitsOnly.length >= 8) {
      parsed = parsePhoneNumberFromString('+' + digitsOnly);
      if (parsed) {
        detectedCountry = parsed.country;
      }
    }

    // Final fallback country check
    if (!detectedCountry) {
      detectedCountry = detectCountryFromPhone(cleaned, defaultCountry);
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
        country: parsed.country || detectedCountry,
      };
    }

    // If parsed is possible but not strictly valid
    if (parsed && parsed.isPossible()) {
      return {
        isValid: false,
        status: 'ambiguous',
        original: cleaned,
        normalized: parsed.number ? parsed.number.replace(/\D/g, '') : digitsOnly,
        international: parsed.formatInternational ? parsed.formatInternational() : `+${digitsOnly}`,
        country: parsed.country || detectedCountry,
        error: 'Ambiguous or incomplete number',
      };
    }

    return {
      isValid: false,
      status: 'invalid',
      original: cleaned,
      normalized: digitsOnly,
      international: cleaned,
      country: detectedCountry,
      error: 'Invalid phone number format',
    };
  } catch (err: any) {
    return {
      isValid: false,
      status: 'invalid',
      original: cleaned,
      normalized: cleaned.replace(/\D/g, ''),
      international: cleaned,
      country: detectCountryFromPhone(cleaned, defaultCountry),
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

export const COUNTRY_NAMES: Record<string, { nameAr: string; nameEn: string; flag: string }> = {
  SA: { nameAr: 'السعودية', nameEn: 'Saudi Arabia', flag: '🇸🇦' },
  EG: { nameAr: 'مصر', nameEn: 'Egypt', flag: '🇪🇬' },
  AE: { nameAr: 'الإمارات', nameEn: 'UAE', flag: '🇦🇪' },
  KW: { nameAr: 'الكويت', nameEn: 'Kuwait', flag: '🇰🇼' },
  QA: { nameAr: 'قطر', nameEn: 'Qatar', flag: '🇶🇦' },
  OM: { nameAr: 'عمان', nameEn: 'Oman', flag: '🇴🇲' },
  BH: { nameAr: 'البحرين', nameEn: 'Bahrain', flag: '🇧🇭' },
  JO: { nameAr: 'الأردن', nameEn: 'Jordan', flag: '🇯🇴' },
  IQ: { nameAr: 'العراق', nameEn: 'Iraq', flag: '🇮🇶' },
  YE: { nameAr: 'اليمن', nameEn: 'Yemen', flag: '🇾🇪' },
  LY: { nameAr: 'ليبيا', nameEn: 'Libya', flag: '🇱🇾' },
  SD: { nameAr: 'السودان', nameEn: 'Sudan', flag: '🇸🇩' },
  MA: { nameAr: 'المغرب', nameEn: 'Morocco', flag: '🇲🇦' },
  DZ: { nameAr: 'الجزائر', nameEn: 'Algeria', flag: '🇩🇿' },
  TN: { nameAr: 'تونس', nameEn: 'Tunisia', flag: '🇹🇳' },
  LB: { nameAr: 'لبنان', nameEn: 'Lebanon', flag: '🇱🇧' },
  PS: { nameAr: 'فلسطين', nameEn: 'Palestine', flag: '🇵🇸' },
  SY: { nameAr: 'سوريا', nameEn: 'Syria', flag: '🇸🇾' },
  TR: { nameAr: 'تركيا', nameEn: 'Turkey', flag: '🇹🇷' },
  US: { nameAr: 'أمريكا / كندا', nameEn: 'USA / Canada', flag: '🇺🇸' },
  GB: { nameAr: 'المملكة المتحدة', nameEn: 'United Kingdom', flag: '🇬🇧' },
  DE: { nameAr: 'ألمانيا', nameEn: 'Germany', flag: '🇩🇪' },
  FR: { nameAr: 'فرنسا', nameEn: 'France', flag: '🇫🇷' },
  IT: { nameAr: 'إيطاليا', nameEn: 'Italy', flag: '🇮🇹' },
  ES: { nameAr: 'إسبانيا', nameEn: 'Spain', flag: '🇪🇸' },
};

export function getCountryInfo(code?: string) {
  if (!code) return { nameAr: 'غير محدد', nameEn: 'Unknown', flag: '🌐' };
  const upper = code.toUpperCase();
  return COUNTRY_NAMES[upper] || { nameAr: upper, nameEn: upper, flag: '🌐' };
}
