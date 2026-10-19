/**
 * Kabul edilen özel karakter kümesi (boşluk hariç).
 * ! @ # $ % ^ & * ( ) _ + - = [ ] { } ; : ' " \ | , . < > / ? ` ~
 */
export const PASSWORD_SPECIAL_CHARS =
  "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?`~";

const SPECIAL_CHAR_SET = new Set(PASSWORD_SPECIAL_CHARS);

export interface PasswordRequirement {
  label: string;
  error: string;
  valid: boolean;
}

export function getPasswordRequirements(
  password: string
): PasswordRequirement[] {
  return [
    {
      label: 'En az 8 karakter',
      error: 'Şifre en az 8 karakter olmalı.',
      valid: Array.from(password).length >= 8,
    },
    {
      label: 'En az bir rakam',
      error: 'Şifre en az bir rakam içermeli.',
      valid: /[0-9]/.test(password),
    },
    {
      label: 'En az bir büyük harf (A-Z)',
      error: 'Şifre en az bir büyük harf (A-Z) içermeli.',
      valid: /[A-Z]/.test(password),
    },
    {
      label: 'En az bir özel karakter (!@#$…)',
      error:
        'Şifre en az bir özel karakter içermeli; boşluk özel karakter sayılmaz.',
      valid: Array.from(password).some((char) => SPECIAL_CHAR_SET.has(char)),
    },
  ];
}

export function getPasswordError(password: string): string | null {
  return (
    getPasswordRequirements(password).find((requirement) => !requirement.valid)
      ?.error ?? null
  );
}

export function isValidEmail(email: string): boolean {
  const normalizedEmail = email.trim();

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalizedEmail);
}