import { Contact } from '../../types';

export interface ValidationResult {
  canSend: boolean;
  reason?: string;
}

export interface MessagingAdapter {
  id: string;
  name: string;
  description: string;
  validateRecipient(contact: Contact): ValidationResult;
  createMessageLink(contact: Contact, message: string): string | null;
}

export class WhatsAppClickToChatAdapter implements MessagingAdapter {
  id = 'whatsapp-click-to-chat';
  name = 'WhatsApp (Click to Chat)';
  description = 'Opens official WhatsApp Web / App conversation in a browser tab with prepopulated message.';

  validateRecipient(contact: Contact): ValidationResult {
    if (!contact.isValidPhone || !contact.normalizedPhone) {
      return {
        canSend: false,
        reason: contact.phoneError || 'Invalid or missing international phone number',
      };
    }

    // Phone digits only check for WhatsApp
    const digitsOnly = contact.normalizedPhone.replace(/\D/g, '');
    if (digitsOnly.length < 8) {
      return {
        canSend: false,
        reason: 'Phone number too short for WhatsApp',
      };
    }

    return { canSend: true };
  }

  /**
   * Generates official WhatsApp Click to Chat URL.
   * Format: https://wa.me/<number>?text=<encoded_text>
   * Strictly uses encoded international digits (without plus, without dashes or spaces).
   */
  createMessageLink(contact: Contact, message: string): string | null {
    const validation = this.validateRecipient(contact);
    if (!validation.canSend) return null;

    const digitsOnly = contact.normalizedPhone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);

    return `https://wa.me/${digitsOnly}?text=${encodedMessage}`;
  }
}
