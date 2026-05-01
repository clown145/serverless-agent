export const SECRET_BINDING_NAME_PATTERN = /^[A-Z_][A-Z0-9_]*$/;

export function isSecretBindingName(value: string): boolean {
  return SECRET_BINDING_NAME_PATTERN.test(value);
}
