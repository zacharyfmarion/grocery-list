import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Maps Firebase Auth error codes to user-friendly messages
 * and the field they should be displayed on.
 */
export function mapFirebaseAuthError(code: string): {
  field?: string;
  message: string;
} {
  switch (code) {
    case "auth/invalid-credential":
      return { field: "root", message: "Incorrect email or password" };
    case "auth/invalid-email":
      return { field: "email", message: "Please enter a valid email" };
    case "auth/user-disabled":
      return { field: "root", message: "This account has been disabled" };
    case "auth/too-many-requests":
      return {
        field: "root",
        message: "Too many attempts. Please try again later.",
      };
    case "auth/email-already-in-use":
      return {
        field: "email",
        message: "An account with this email already exists",
      };
    case "auth/weak-password":
      return {
        field: "password",
        message: "Password must be at least 6 characters",
      };
    default:
      return {
        field: "root",
        message: "Something went wrong. Please try again.",
      };
  }
}
