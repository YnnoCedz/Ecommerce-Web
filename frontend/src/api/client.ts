import { safeApiErrorMessage, safeValidationErrors } from "../utils/errorMapper";

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "");
// Development requests stay on the frontend origin so the Vite proxy owns
// local routing. Production uses the configured Laravel API origin.
export const API_BASE_URL = import.meta.env.DEV ? "/api" : configuredApiBaseUrl;

if (!API_BASE_URL) {
  throw new Error("VITE_API_BASE_URL is required for production builds.");
}

if (!import.meta.env.DEV && new URL(API_BASE_URL).origin === window.location.origin) {
  throw new Error(
    "VITE_API_BASE_URL points to the frontend origin. Configure it with the public Laravel API URL ending in /api.",
  );
}

function normalizeApiPath(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error(`API paths must start with "/": ${path}`);
  }

  if (path === "/api" || path.startsWith("/api/")) {
    throw new Error(`API paths must not include the base /api prefix: ${path}`);
  }

  return path;
}

type ApiOptions = RequestInit & { authToken?: string | null };

const AUTH_TOKEN_KEY = "maketo.auth-token";

function readStorage(storage: Storage): string | null {
  try {
    const token = storage.getItem(AUTH_TOKEN_KEY);
    if (!token) return null;

    const normalized = token.trim();
    if (!normalized || /\s/.test(normalized) || normalized === "undefined" || normalized === "null") {
      storage.removeItem(AUTH_TOKEN_KEY);
      return null;
    }

    return normalized;
  } catch {
    return null;
  }
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  return readStorage(window.sessionStorage) ?? readStorage(window.localStorage);
}

export function hasAuthToken(): boolean {
  return getAuthToken() !== null;
}

export function storeAuthToken(token: string, remember = false): void {
  if (typeof window === "undefined") return;

  const normalized = token.trim();
  if (!normalized || /\s/.test(normalized)) {
    throw new Error("The API returned an invalid authentication token.");
  }

  clearAuthToken();
  const storage = remember ? window.localStorage : window.sessionStorage;
  storage.setItem(AUTH_TOKEN_KEY, normalized);
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Storage can be unavailable in hardened browser contexts.
  }
}

export class ApiError extends Error {
  status: number;
  payload: unknown;
  technicalMessage: string;
  errors?: Record<string, string[]>;
  code?: string;

  constructor(message: string, status: number, payload: unknown) {
    super(safeApiErrorMessage(message, status, payload));
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
    this.technicalMessage = message;

    if (payload && typeof payload === "object") {
      const record = payload as Record<string, unknown>;
      if (record.errors && typeof record.errors === "object") {
        this.errors = safeValidationErrors(record.errors as Record<string, string[]>);
      }
      if (typeof record.code === "string") {
        this.code = record.code;
      }
    }
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : null;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const normalizedPath = normalizeApiPath(path);
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  const authToken = options.authToken === undefined ? getAuthToken() : options.authToken;
  if (authToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  const body = options.body;
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  const isBlob =
    typeof Blob !== "undefined" && body instanceof Blob;
  const isUrlSearchParams =
    typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams;
  const isArrayBuffer = body instanceof ArrayBuffer || ArrayBuffer.isView(body as ArrayBufferView);

  if (body && !headers.has("Content-Type") && !isFormData && !isBlob && !isUrlSearchParams && !isArrayBuffer) {
    headers.set("Content-Type", "application/json");
  }
  const { authToken: _authToken, ...requestOptions } = options;

  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
    ...requestOptions,
    headers,
  });

  if (!response.ok) {
    const payload = await readResponseBody(response);
    const fallbackMessage = response.status === 405
      ? `${method} ${normalizedPath.split("?")[0]} is not allowed by the configured API host. Check VITE_API_BASE_URL and the deployed Laravel route method.`
      : `API request failed: ${method} ${normalizedPath.split("?")[0]} returned ${response.status}.`;
    const message =
      payload && typeof payload === "object" && "message" in payload && typeof (payload as { message?: unknown }).message === "string"
        ? (payload as { message: string }).message
        : payload && typeof payload === "object" && "errors" in payload && payload.errors && typeof payload.errors === "object"
          ? (() => {
              const errorGroups = Object.values(payload.errors as Record<string, unknown>);
              for (const group of errorGroups) {
                if (Array.isArray(group) && group.length > 0 && typeof group[0] === "string") {
                  return group[0];
                }
              }

              return fallbackMessage;
            })()
        : fallbackMessage;
    throw new ApiError(message, response.status, payload);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export type ApiDownload = {
  blob: Blob;
  filename: string | null;
};

function downloadFilename(response: Response): string | null {
  const disposition = response.headers.get("content-disposition");
  if (!disposition) return null;

  const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const plain = disposition.match(/filename="?([^";]+)"?/i);
  const encoded = utf8?.[1] ?? plain?.[1];

  if (!encoded) return null;

  try {
    return decodeURIComponent(encoded).replace(/[\\/]/g, "-");
  } catch {
    return encoded.replace(/[\\/]/g, "-");
  }
}

export async function apiDownload(path: string): Promise<ApiDownload> {
  const normalizedPath = normalizeApiPath(path);
  const headers = new Headers({ Accept: "application/octet-stream, application/pdf" });
  const authToken = getAuthToken();

  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);

  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, { headers });

  if (!response.ok) {
    const payload = await readResponseBody(response);
    const message =
      payload && typeof payload === "object" && "message" in payload && typeof (payload as { message?: unknown }).message === "string"
        ? (payload as { message: string }).message
        : payload && typeof payload === "object" && "errors" in payload && payload.errors && typeof payload.errors === "object"
          ? Object.values(payload.errors as Record<string, unknown>)
              .flatMap((value) => Array.isArray(value) ? value : [])
              .find((value): value is string => typeof value === "string") ?? "Unable to export the requested report."
          : "Unable to export the requested report.";

    throw new ApiError(message, response.status, payload);
  }

  return {
    blob: await response.blob(),
    filename: downloadFilename(response),
  };
}
