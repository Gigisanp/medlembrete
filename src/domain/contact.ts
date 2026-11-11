import type { Validation } from './medication';

/**
 * Contato de ajuda (familiar, cuidador ou equipe de saúde): só nome e telefone.
 * Fica no aparelho e é usado para abrir o discador. O app não liga sozinho.
 */
export type HelpContact = {
  id: number;
  name: string;
  /** Só dígitos, com "+" opcional no começo. */
  phone: string;
};

export type HelpContactInput = Omit<HelpContact, 'id'>;

export type HelpContactErrors = { name?: string; phone?: string };

export const CONTACT_LIMITS = { name: 60, phoneMinDigits: 8, phoneMaxDigits: 15 } as const;

export const CONTACT_MESSAGES = {
  nameRequired: 'Digite o nome do contato.',
  nameTooLong: `O nome pode ter no máximo ${CONTACT_LIMITS.name} letras.`,
  phoneRequired: 'Digite o telefone.',
  phoneInvalid: 'Telefone inválido. Digite com DDD. Exemplo: (11) 90000-0000.',
} as const;

/** Tira espaços, parênteses e traços; mantém um "+" inicial. */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const plus = trimmed.startsWith('+') ? '+' : '';
  return plus + trimmed.replace(/\D/g, '');
}

export function validateContact(draft: { name: string; phone: string }): Validation<HelpContactInput, HelpContactErrors> {
  const errors: HelpContactErrors = {};
  const name = draft.name.trim();
  const phone = normalizePhone(draft.phone);
  const digits = phone.replace('+', '');

  if (!name) errors.name = CONTACT_MESSAGES.nameRequired;
  else if (name.length > CONTACT_LIMITS.name) errors.name = CONTACT_MESSAGES.nameTooLong;

  if (!draft.phone.trim()) errors.phone = CONTACT_MESSAGES.phoneRequired;
  else if (
    /[^\d\s()+\-.]/.test(draft.phone.trim()) ||
    digits.length < CONTACT_LIMITS.phoneMinDigits ||
    digits.length > CONTACT_LIMITS.phoneMaxDigits
  ) {
    errors.phone = CONTACT_MESSAGES.phoneInvalid;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, phone } };
}

/** Mostra o telefone de um jeito fácil de ler: "(11) 90000-0000". */
export function formatPhone(phone: string): string {
  if (phone.startsWith('+')) return phone;
  if (phone.length === 11) return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
  if (phone.length === 10) return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`;
  if (phone.length === 9) return `${phone.slice(0, 5)}-${phone.slice(5)}`;
  if (phone.length === 8) return `${phone.slice(0, 4)}-${phone.slice(4)}`;
  return phone;
}

/** Endereço que abre o discador com o número já preenchido. */
export function telUrl(phone: string): string {
  return `tel:${phone}`;
}
