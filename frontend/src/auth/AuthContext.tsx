import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  fetchCurrentUser,
  loginRequest,
  logoutRequest,
  registerRequest,
  resendTwoFactorRequest,
  verifyEmailVerificationRequest,
  verifyTwoFactorRequest,
  type TwoFactorChallenge,
  type AuthUser,
  type LoginPayload,
  type RegisterPayload,
} from "../api/auth";
import { ApiError, clearAuthToken, getAuthToken, hasAuthToken, storeAuthToken } from "../api/client";

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  pendingTwoFactor: TwoFactorChallenge | null;
};

type AuthContextValue = AuthState & {
  refreshUser: () => Promise<AuthUser | null>;
  login: (payload: LoginPayload) => Promise<{ user: AuthUser; redirectTo?: string; requiresTwoFactor?: boolean }>;
  register: (payload: RegisterPayload) => Promise<{ user: AuthUser; redirectTo?: string; message?: string; requiresEmailVerification?: boolean }>;
  verifyEmail: (payload: { email: string; code: string }) => Promise<{ user: AuthUser; redirectTo?: string; message?: string }>;
  logout: () => Promise<void>;
  verifyTwoFactor: (payload: { code: string; challengeId?: number }) => Promise<{ user: AuthUser; redirectTo?: string }>;
  resendTwoFactor: () => Promise<TwoFactorChallenge | null>;
  clearError: () => void;
  clearPendingTwoFactor: () => void;
};

type LoginResult = { user: AuthUser; redirectTo?: string; requiresTwoFactor?: boolean };

const AuthContext = createContext<AuthContextValue | null>(null);

const PENDING_TWO_FACTOR_STORAGE_KEY = "maketo.pending-two-factor";

function readPendingTwoFactor(): TwoFactorChallenge | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(PENDING_TWO_FACTOR_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as TwoFactorChallenge;
  } catch {
    window.sessionStorage.removeItem(PENDING_TWO_FACTOR_STORAGE_KEY);
    return null;
  }
}

function writePendingTwoFactor(value: TwoFactorChallenge | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!value) {
    window.sessionStorage.removeItem(PENDING_TWO_FACTOR_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(PENDING_TWO_FACTOR_STORAGE_KEY, JSON.stringify(value));
}

function extractErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.errors) {
      const firstError = Object.values(error.errors).flat().find(Boolean);
      if (firstError) return firstError;
    }
    if (error.message) return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const userRef = useRef<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingTwoFactor, setPendingTwoFactor] = useState<TwoFactorChallenge | null>(() => readPendingTwoFactor());
  const loginInFlightRef = useRef<Promise<LoginResult> | null>(null);

  const updateUser = useCallback((nextUser: AuthUser | null) => {
    userRef.current = nextUser;
    setUser(nextUser);
  }, []);

  const refreshUser = useCallback(async () => {
    const tokenAtRequestStart = getAuthToken();
    if (!tokenAtRequestStart) {
      updateUser(null);
      setError(null);
      setLoading(false);
      return null;
    }

    try {
      const response = await fetchCurrentUser(tokenAtRequestStart);
      if (getAuthToken() !== tokenAtRequestStart) {
        return userRef.current;
      }

      updateUser(response.user);
      setError(null);
      return response.user;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401 && getAuthToken() === tokenAtRequestStart) {
        clearAuthToken();
        updateUser(null);
        setError(null);
      } else if (getAuthToken() === tokenAtRequestStart) {
        setError(extractErrorMessage(err, "Unable to load your session."));
      }
      // A transport failure is not proof that the API token was revoked.
      // Keep any in-memory user and surface the verification failure instead.
      return userRef.current;
    } finally {
      setLoading(false);
    }
  }, [updateUser]);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = (payload: LoginPayload): Promise<LoginResult> => {
    if (loginInFlightRef.current) {
      return loginInFlightRef.current;
    }

    const request = (async () => {
      const response = await loginRequest(payload);
      if (response.requires_two_factor) {
        if (!response.two_factor_challenge_id || !response.two_factor_challenge_token) {
          throw new Error("The API did not provide a complete two-factor challenge.");
        }

        const challenge = {
          challengeId: response.two_factor_challenge_id,
          challengeToken: response.two_factor_challenge_token,
          email: payload.email,
          remember: Boolean(payload.remember),
          redirectTo: response.redirect_to,
          expiresAt: response.two_factor_expires_at ?? null,
          resendAvailableAt: response.two_factor_resend_available_at ?? null,
        };
        setPendingTwoFactor(challenge);
        writePendingTwoFactor(challenge);
        updateUser(null);
        setError(null);
        return {
          user: response.user as AuthUser,
          redirectTo: response.redirect_to,
          requiresTwoFactor: true,
        };
      }

      if (!response.token || !response.user) {
        throw new Error("The API did not provide an authentication token.");
      }

      storeAuthToken(response.token, Boolean(payload.remember));
      updateUser(response.user as AuthUser);
      setError(null);
      return {
        user: response.user as AuthUser,
        redirectTo: response.redirect_to,
        requiresTwoFactor: false,
      };
    })().finally(() => {
      loginInFlightRef.current = null;
    });

    loginInFlightRef.current = request;
    return request;
  };

  const register = async (payload: RegisterPayload) => {
    const response = await registerRequest(payload);
    clearAuthToken();
    updateUser(null);
    setError(null);
    return {
      user: response.user as AuthUser,
      redirectTo: response.redirect_to,
      message: response.message,
      requiresEmailVerification: response.requires_email_verification,
    };
  };

  const verifyEmail = async (payload: { email: string; code: string }) => {
    const response = await verifyEmailVerificationRequest(payload);
    if (!response.token || !response.user) {
      throw new Error("The API did not provide an authentication token.");
    }

    storeAuthToken(response.token);
    updateUser(response.user as AuthUser);
    setError(null);

    return {
      user: response.user as AuthUser,
      redirectTo: response.redirect_to,
      message: response.message,
    };
  };

  const logout = async () => {
    try {
      if (hasAuthToken()) {
        await logoutRequest();
      }
    } finally {
      clearAuthToken();
      updateUser(null);
      setError(null);
      setPendingTwoFactor(null);
      writePendingTwoFactor(null);
    }
  };

  const verifyTwoFactor = async (payload: { code: string; challengeId?: number }) => {
    const challengeId = payload.challengeId ?? pendingTwoFactor?.challengeId;
    const response = await verifyTwoFactorRequest({
      challenge_id: challengeId ?? 0,
      challenge_token: pendingTwoFactor?.challengeToken ?? "",
      code: payload.code,
    });

    if (!response.token || !response.user) {
      throw new Error("The API did not provide an authentication token.");
    }

    storeAuthToken(response.token, pendingTwoFactor?.remember ?? false);
    updateUser(response.user as AuthUser);
    setError(null);
    setPendingTwoFactor(null);
    writePendingTwoFactor(null);

    return {
      user: response.user as AuthUser,
      redirectTo: response.redirect_to,
    };
  };

  const resendTwoFactor = async () => {
    if (!pendingTwoFactor?.challengeId) {
      return null;
    }

    const response = await resendTwoFactorRequest({
      challenge_id: pendingTwoFactor.challengeId,
      challenge_token: pendingTwoFactor.challengeToken,
    });

    const nextChallenge = {
      ...pendingTwoFactor,
      challengeId: response.two_factor_challenge_id ?? pendingTwoFactor.challengeId,
      expiresAt: response.two_factor_expires_at ?? pendingTwoFactor.expiresAt,
      resendAvailableAt: response.two_factor_resend_available_at ?? pendingTwoFactor.resendAvailableAt,
    };

    setPendingTwoFactor(nextChallenge);
    writePendingTwoFactor(nextChallenge);
    setError(null);

    return nextChallenge;
  };

  const value: AuthContextValue = {
    user,
    loading,
    error,
    pendingTwoFactor,
    refreshUser,
    login,
    register,
    verifyEmail,
    logout,
    verifyTwoFactor,
    resendTwoFactor,
    clearError: () => setError(null),
    clearPendingTwoFactor: () => {
      setPendingTwoFactor(null);
      writePendingTwoFactor(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
