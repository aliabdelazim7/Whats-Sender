import { describe, it, expect } from 'vitest';
import { buildContactsFromRows } from '../lib/spreadsheet/mapper';
import { RawRowData, ColumnMapping } from '../types';

describe('Contact Mapping & Duplicate Detection', () => {
  it('maps raw spreadsheet rows to typed Contact models and identifies duplicates', () => {
    const rows: RawRowData[] = [
      { 'Client Name': 'خالد عمر', 'Mobile': '01012345678', 'Org': 'Acme' },
      { 'Client Name': 'أحمد إبراهيم', 'Mobile': '+201012345678', 'Org': 'Beta' }, // Duplicate normalized phone!
      { 'Client Name': 'سارة محمد', 'Mobile': '01123456789', 'Org': 'Gamma' },
      { 'Client Name': 'مجهول', 'Mobile': 'invalid-phone-xyz', 'Org': 'None' },
    ];

    const mapping: ColumnMapping = {
      phoneColumn: 'Mobile',
      nameColumn: 'Client Name',
      companyColumn: 'Org',
      customColumns: {},
    };

    const contacts = buildContactsFromRows(rows, mapping, 'EG');

    expect(contacts.length).toBe(4);
    // First contact
    expect(contacts[0].isValidPhone).toBe(true);
    expect(contacts[0].isDuplicate).toBe(false);

    // Second contact is duplicate of first
    expect(contacts[1].isValidPhone).toBe(true);
    expect(contacts[1].isDuplicate).toBe(true);
    expect(contacts[1].duplicateOfId).toBe(contacts[0].id);

    // Third contact
    expect(contacts[2].isValidPhone).toBe(true);
    expect(contacts[2].isDuplicate).toBe(false);

    // Fourth contact has invalid phone
    expect(contacts[3].isValidPhone).toBe(false);
  });
});
