export interface SignUpFields {
  email: string;
  password: string;
  confirmPassword: string;
}

export function validateSignUp(fields: SignUpFields): string | null {
  const email = fields.email.trim();

  if (!email) return "Enter your email address.";
  if (!/^\S+@\S+\.\S+$/.test(email)) return "Enter a valid email address.";
  if (fields.password.length < 8) return "Use at least 8 characters for your password.";
  if (fields.password !== fields.confirmPassword) return "The passwords do not match.";

  return null;
}
