/**
 * Política de contraseñas de la plataforma, compartida entre la API y el
 * storefront para que la validación del cliente y del servidor coincidan.
 *
 * Estándar: mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 100;
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
export const PASSWORD_POLICY_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número';
export const PASSWORD_POLICY_HINT =
  'Mínimo 8 caracteres, con al menos una mayúscula, una minúscula y un número';

export function isValidPassword(value: string): boolean {
  return (
    value.length >= PASSWORD_MIN_LENGTH &&
    value.length <= PASSWORD_MAX_LENGTH &&
    PASSWORD_PATTERN.test(value)
  );
}

export interface PasswordRuleResult {
  id: 'length' | 'uppercase' | 'lowercase' | 'number';
  label: string;
  met: boolean;
}

/**
 * Resultado por regla para el checklist en vivo del formulario (registro/reset).
 * No incluye el máximo de longitud: se valida, pero no se muestra como regla.
 */
export function getPasswordRuleResults(value: string): PasswordRuleResult[] {
  return [
    { id: 'length', label: `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`, met: value.length >= PASSWORD_MIN_LENGTH },
    { id: 'uppercase', label: 'Una mayúscula', met: /[A-Z]/.test(value) },
    { id: 'lowercase', label: 'Una minúscula', met: /[a-z]/.test(value) },
    { id: 'number', label: 'Un número', met: /\d/.test(value) },
  ];
}
