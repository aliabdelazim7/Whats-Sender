import { Contact } from '../../types';

export interface RenderTemplateResult {
  renderedText: string;
  missingVariables: string[];
  hasErrors: boolean;
}

export const STANDARD_VARS = ['name', 'phone', 'company', 'email'];

/**
 * Extracts all unique placeholder variable names inside {{variable}}
 */
export function extractTemplateVariables(template: string): string[] {
  const matches = template.match(/\{\{([a-zA-Z0-9_-]+)\}\}/g);
  if (!matches) return [];
  const vars = matches.map((m) => m.slice(2, -2).trim());
  return Array.from(new Set(vars));
}

/**
 * Renders a message template safely replacing {{variables}} with recipient contact data.
 * Does not execute code or HTML.
 */
export function renderTemplate(
  template: string,
  contact: Contact
): RenderTemplateResult {
  const missingVariables: string[] = [];
  const usedVars = extractTemplateVariables(template);

  let renderedText = template;

  for (const varName of usedVars) {
    let value: string | undefined = undefined;

    switch (varName.toLowerCase()) {
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
        // Check custom fields
        value = contact.customFields?.[varName] || undefined;
    }

    if (value === undefined || value === '') {
      missingVariables.push(varName);
    } else {
      // Replace all instances of {{varName}}
      const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'g');
      renderedText = renderedText.replace(regex, value);
    }
  }

  return {
    renderedText,
    missingVariables,
    hasErrors: missingVariables.length > 0,
  };
}
