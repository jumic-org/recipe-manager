/**
 * Password rules for Users. The stack applies them to the Cognito user pool;
 * the change-password dialog shows and checks them.
 */
export const PASSWORD_POLICY = {
  minLength: 8,
  requireLowercase: true,
  requireUppercase: true,
  requireDigits: true,
  requireSymbols: true,
} as const;
