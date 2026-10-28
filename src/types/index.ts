export type PhoneValidationStatus = 'valid' | 'invalid' | 'ambiguous';

export interface Contact {
  id: string;
  name: string;
  originalPhone: string;
  normalizedPhone: string; // E.164 digits without plus or with standard format
  internationalPhone: string; // e.g. +20 100 123 4567
  isValidPhone: boolean;
  phoneStatus: PhoneValidationStatus;
  phoneError?: string;
  countryCode?: string;
  company?: string;
  email?: string;
  category?: string; // e.g. 'عيادات', 'ملابس وأحذية', etc.
  customFields: Record<string, string>;
  isDuplicate?: boolean;
  duplicateOfId?: string;
  excludedFromSession?: boolean;
  messagingStatus?: 'unsent' | 'sent' | 'skipped';
  sentAt?: number;
  createdAt: number;
}

export interface RawRowData {
  [key: string]: any;
}

export interface ColumnMapping {
  nameColumn?: string;
  phoneColumn: string;
  companyColumn?: string;
  emailColumn?: string;
  categoryColumn?: string;
  customColumns: Record<string, string>; // customVarName -> spreadsheetColumnName
}

export type QueueItemStatus =
  | 'pending'
  | 'ready'
  | 'opened'
  | 'confirmed_sent'
  | 'skipped'
  | 'invalid'
  | 'failed';

export interface QueueItem {
  id: string;
  sessionId: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  renderedMessage: string;
  status: QueueItemStatus;
  lastAttemptAt?: number;
  errorMessage?: string;
  skipReason?: string;
  attemptCount: number;
}

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface CampaignSession {
  id: string;
  name: string;
  templateId?: string;
  templateContent: string;
  totalCount: number;
  currentIndex: number;
  status: 'draft' | 'running' | 'paused' | 'completed';
  createdAt: number;
  updatedAt: number;
}

export interface ImportPreviewStats {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  missingPhoneCount: number;
}

export interface AppSettings {
  language: 'ar' | 'en';
  theme: 'light' | 'dark' | 'system';
  defaultCountry: string; // e.g. "EG"
  mockMode: boolean; // useful for testing without actually launching popups
  maskPhoneInReports: boolean;
  googleAppsScriptUrl?: string; // Web App URL for sync to Google Sheets
}
