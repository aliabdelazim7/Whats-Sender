import { Contact, RawRowData, ColumnMapping } from '../../types';
import { normalizePhoneNumber } from '../phone';

export function buildContactsFromRows(
  rows: RawRowData[],
  mapping: ColumnMapping,
  defaultCountry: string = 'EG',
  defaultCategory: string = 'عام'
): Contact[] {
  const seenPhones = new Map<string, string>(); // normalizedPhone -> firstContactId
  const contacts: Contact[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawPhone = row[mapping.phoneColumn] ?? '';
    const rawName = mapping.nameColumn ? (row[mapping.nameColumn] ?? '') : '';
    const rawCompany = mapping.companyColumn ? (row[mapping.companyColumn] ?? '') : '';
    const rawEmail = mapping.emailColumn ? (row[mapping.emailColumn] ?? '') : '';
    const rawCategory = mapping.categoryColumn && row[mapping.categoryColumn]
      ? String(row[mapping.categoryColumn]).trim()
      : defaultCategory;

    const customFields: Record<string, string> = {};
    for (const [varName, colName] of Object.entries(mapping.customColumns)) {
      if (colName && row[colName] !== undefined) {
        customFields[varName] = String(row[colName] ?? '').trim();
      }
    }

    const norm = normalizePhoneNumber(rawPhone, defaultCountry);
    const contactId = `contact_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`;

    let isDuplicate = false;
    let duplicateOfId: string | undefined = undefined;

    if (norm.isValid && norm.normalized) {
      if (seenPhones.has(norm.normalized)) {
        isDuplicate = true;
        duplicateOfId = seenPhones.get(norm.normalized);
      } else {
        seenPhones.set(norm.normalized, contactId);
      }
    }

    contacts.push({
      id: contactId,
      name: String(rawName).trim(),
      originalPhone: String(rawPhone).trim(),
      normalizedPhone: norm.normalized,
      internationalPhone: norm.international,
      isValidPhone: norm.isValid,
      phoneStatus: norm.status,
      phoneError: norm.error,
      countryCode: norm.country,
      company: String(rawCompany).trim(),
      email: String(rawEmail).trim(),
      category: rawCategory || defaultCategory,
      customFields,
      isDuplicate,
      duplicateOfId,
      excludedFromSession: false,
      createdAt: Date.now(),
    });
  }

  return contacts;
}
