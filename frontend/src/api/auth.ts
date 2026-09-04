import { apiFetch } from "./client";

/**
 * Derived by the backend on every read. This is the authoritative shape the
 * frontend reasons about; `role` is retained only for the admin surface and for
 * backward compatibility.
 */
export type UserCapabilities = {
  buyer: boolean;
  seller: boolean;
  rider: boolean;
  logistics: boolean;
  admin: boolean;
};

export type RegistrationStatus = "approved" | "pending_review" | "rejected";

export type AuthUser = {
  id: number;
  name: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  sex: string | null;
  birthdate: string | null;
  age: number | null;
  display_name: string;
  avatar_url: string | null;
  email: string;
  mobile: string | null;
  phone: string | null;
  role: string;
  status: string;
  registration_status: RegistrationStatus;
  marketplace_status: "pending" | "approved" | "rejected" | null;
  capabilities: UserCapabilities;
  seller_status: string | null;
  seller_approved: boolean;
  courier_approved: boolean;
  logistics_access: boolean;
  logistics_staff_type: string | null;
  courier: {
    id: number;
    status: string;
    availability_status: string;
    vehicle: {
      type: string | null;
      make: string | null;
      model: string | null;
      year: number | null;
      plate_number: string | null;
      color: string | null;
    };
  } | null;
  location_label: string | null;
  email_verified_at: string | null;
  last_active_at: string | null;
  two_factor_enabled: boolean;
  two_factor_method: string | null;
  joined_at: string | null;
  order_count?: number;
  wishlist_count?: number;
};

export type AuthSessionResponse = {
  message: string;
  user?: AuthUser | null;
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
  requires_admin_approval?: boolean;
  registration_status?: RegistrationStatus;
  verification_email?: string;
  verification_email_sent?: boolean;
  registration_context?: "marketplace" | "rider" | "logistics";
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
  middle_name?: string;
  last_name: string;
  sex: string;
  birthdate: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  region_code: string;
  province_code?: string;
  city_code: string;
  barangay_code: string;
  postal_code: string;
  id_document: File;
  password: string;
  password_confirmation: string;
};

export type LogisticsRegisterPayload = Omit<RegisterPayload, "id_document"> & {
  company_name: string;
  legal_name?: string;
  applicant_id: File;
  business_permit: File;
};

export type ExistingIdentityLogisticsPayload = Pick<
  LogisticsRegisterPayload,
  | "company_name"
  | "legal_name"
  | "address_line1"
  | "address_line2"
  | "region_code"
  | "province_code"
  | "city_code"
  | "barangay_code"
  | "postal_code"
  | "applicant_id"
  | "business_permit"
>;

let currentUserRequest: { token: string; promise: Promise<{ user: AuthUser }> } | null = null;

export function fetchCurrentUser(token: string): Promise<{ user: AuthUser }> {
  if (currentUserRequest?.token === token) {
    return currentUserRequest.promise;
  }

  let request: Promise<{ user: AuthUser }>;
  request = apiFetch<{ user: AuthUser }>("/auth/me", { authToken: token }).finally(() => {
    if (currentUserRequest?.promise === request) {
      currentUserRequest = null;
    }
  });

  currentUserRequest = { token, promise: request };
  return request;
}

export async function loginRequest(payload: LoginPayload) {
  return apiFetch<AuthSessionResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
    authToken: null,
  });
}

export async function registerRequest(payload: RegisterPayload) {
  // Multipart because registration now carries a private government ID.
  const form = new FormData();

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null || value === "") continue;
    form.append(key, value as string | Blob);
  }

  return apiFetch<AuthSessionResponse>("/auth/register", {
    method: "POST",
    body: form,
    authToken: null,
  });
}

export async function registerLogisticsRequest(payload: LogisticsRegisterPayload) {
  const form = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null || value === "") continue;
    form.append(key, value as string | Blob);
  }

  return apiFetch<AuthSessionResponse>("/auth/register/logistics", {
    method: "POST",
    body: form,
    authToken: null,
  });
}

export async function submitLogisticsApplicationRequest(payload: ExistingIdentityLogisticsPayload) {
  const form = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null || value === "") continue;
    form.append(key, value as string | Blob);
  }

  return apiFetch<{ message: string; data: { id: number; status: string; company_name: string } }>(
    "/logistics/applications",
    { method: "POST", body: form },
  );
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
