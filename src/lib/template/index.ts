import { Contact } from '../../types';

export interface RenderTemplateResult {
  renderedText: string;
  missingVariables: string[];
  hasErrors: boolean;
}

export const STANDARD_VARS = ['name', 'phone', 'company', 'email'];

/**
 * Normalizes variable name aliases, including Arabic equivalents.
 */
function resolveStandardField(key: string): string {
  const normalized = key.trim().toLowerCase();
  if (['name', 'الاسم', 'اسم', 'العميل', 'عميل'].includes(normalized)) return 'name';
  if (['phone', 'هاتف', 'الهاتف', 'جوال', 'الجوال', 'موبايل', 'رقم'].includes(normalized)) return 'phone';
  if (['company', 'شركة', 'الشركة', 'المؤسسة', 'مؤسسة'].includes(normalized)) return 'company';
  if (['email', 'بريد', 'البريد', 'ايميل', 'الإيميل'].includes(normalized)) return 'email';
  return normalized;
}

/**
 * Extracts all unique placeholder variable names inside {{variable}}
 * Supports spaces e.g. {{ name }} and non-ASCII / Arabic characters e.g. {{الاسم}}
 */
export function extractTemplateVariables(template: string): string[] {
  const matches = Array.from(template.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g));
  if (!matches || matches.length === 0) return [];
  const vars = matches.map((m) => m[1].trim());
  return Array.from(new Set(vars));
}

/**
 * Renders a message template safely replacing {{variables}} with recipient contact data.
 * Supports spaces inside braces and Arabic variable aliases.
 */
export function renderTemplate(
  template: string,
  contact: Contact
): RenderTemplateResult {
  const missingVariables: string[] = [];
  const usedVars = extractTemplateVariables(template);

  let renderedText = template;

  for (const rawVar of usedVars) {
    const resolvedField = resolveStandardField(rawVar);
    let value: string | undefined = undefined;

    switch (resolvedField) {
      case 'name':
        value = contact.name || undefined;
        break;
      case 'phone':
        value = contact.internationalPhone || contact.originalPhone || undefined;
        break;
      case 'company':
        value = contact.company || undefined;
        break;
      case 'email':
        value = contact.email || undefined;
        break;
      default:
        // Check custom fields (exact or lowercase match)
        if (contact.customFields) {
          value =
            contact.customFields[rawVar] ||
            contact.customFields[rawVar.trim()] ||
            contact.customFields[resolvedField] ||
            undefined;
        }
    }

    if (value === undefined || value === '') {
      missingVariables.push(rawVar);
    } else {
      // Replace all instances of {{rawVar}} with optional internal spaces
      const escapedVar = rawVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\{\\{\\s*${escapedVar}\\s*\\}\\}`, 'g');
      renderedText = renderedText.replace(regex, value);
    }
  }

  return {
    renderedText,
    missingVariables,
    hasErrors: missingVariables.length > 0,
  };
}
