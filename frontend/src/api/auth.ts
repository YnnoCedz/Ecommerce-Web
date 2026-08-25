import { apiFetch } from "./client";
import { singleFlight } from "./requestCache";

export type AuthUser = {
  id: number;
  name: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string;
  avatar_url: string | null;
  email: string;
  mobile: string | null;
  phone: string | null;
  role: string;
  status: string;
  seller_status: string | null;
  seller_approved: boolean;
  location_label: string | null;
  email_verified_at: string | null;
  last_active_at: string | null;
  two_factor_enabled: boolean;
  two_factor_method: string | null;
  joined_at: string | null;
  order_count: number;
  wishlist_count: number;
};

export type AuthSessionResponse = {
  message: string;
  user: AuthUser | null;
  token?: string;
  token_type?: "Bearer";
  redirect_to?: string;
  requires_two_factor?: boolean;
  two_factor_challenge_id?: number | null;
  two_factor_challenge_token?: string | null;
  two_factor_expires_at?: string | null;
  two_factor_resend_available_at?: string | null;
  code?: string;
  requires_email_verification?: boolean;
  verification_email?: string;
};

export type EmailVerificationResendResponse = {
  message: string;
  retry_after?: number;
  expires_in?: number;
};

export type ForgotPasswordResponse = {
  message: string;
};

export type ResetPasswordPayload = {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
};

export type UpdatePasswordPayload = {
  current_password: string;
  password: string;
  password_confirmation: string;
};

export type TwoFactorChallenge = {
  challengeId: number;
  challengeToken: string;
  email: string;
  remember: boolean;
  redirectTo?: string;
  expiresAt: string | null;
  resendAvailableAt: string | null;
};

export type LoginPayload = {
  email: string;
  password: string;
  remember?: boolean;
};

export type RegisterPayload = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
};

let currentUserPromise: Promise<{ user: AuthUser }> | null = null;

export async function fetchCurrentUser() {
  return singleFlight("auth:me", () => {
    if (!currentUserPromise) {
      currentUserPromise = apiFetch<{ user: AuthUser }>("/auth/me").finally(() => {
        currentUserPromise = null;
      });
    }

    return currentUserPromise;
  });
}

export async function loginRequest(payload: LoginPayload) {
  return apiFetch<AuthSessionResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
    authToken: null,
  });
}

export async function registerRequest(payload: RegisterPayload) {
  return apiFetch<AuthSessionResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
    authToken: null,
  });
}

export async function logoutRequest() {
  await apiFetch<{ message: string }>("/auth/logout", {
    method: "POST",
  });
}

export async function verifyTwoFactorRequest(payload: { challenge_id: number; challenge_token: string; code: string }) {
  return apiFetch<AuthSessionResponse>("/auth/2fa/verify", {
    method: "POST",
    body: JSON.stringify(payload),
    authToken: null,
  });
}

export async function resendTwoFactorRequest(payload: { challenge_id: number; challenge_token: string }) {
  return apiFetch<AuthSessionResponse>("/auth/2fa/resend", {
    method: "POST",
    body: JSON.stringify(payload),
    authToken: null,
  });
}

export async function resendEmailVerificationRequest(payload: { email: string }) {
  return apiFetch<EmailVerificationResendResponse>("/auth/email/resend", {
    method: "POST",
    body: JSON.stringify(payload),
    authToken: null,
  });
}

export async function verifyEmailVerificationRequest(payload: { email: string; code: string }) {
  return apiFetch<AuthSessionResponse>("/auth/email/verify", {
    method: "POST",
    body: JSON.stringify(payload),
    authToken: null,
  });
}

export async function requestPasswordResetLink(payload: { email: string }) {
  return apiFetch<ForgotPasswordResponse>("/auth/password/forgot", {
    method: "POST",
    body: JSON.stringify(payload),
    authToken: null,
  });
}

export async function resetPasswordRequest(payload: ResetPasswordPayload) {
  return apiFetch<{ message: string; redirect_to?: string }>("/auth/password/reset", {
    method: "POST",
    body: JSON.stringify(payload),
    authToken: null,
  });
}

export async function updatePasswordRequest(payload: UpdatePasswordPayload) {
  return apiFetch<{ message: string }>("/account/password", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
