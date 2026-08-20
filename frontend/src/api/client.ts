const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";
// Development requests stay on the frontend origin so the Vite proxy owns
// the browser cookie path. Production can use the configured API origin.
export const API_BASE_URL = import.meta.env.DEV ? "/api" : configuredApiBaseUrl;
const IS_ABSOLUTE_API_URL = /^https?:\/\//i.test(API_BASE_URL);
const API_ORIGIN = IS_ABSOLUTE_API_URL
  ? new URL(API_BASE_URL).origin
  : typeof window !== "undefined"
    ? window.location.origin
    : "http://192.168.1.8:8443";
const API_URL = IS_ABSOLUTE_API_URL
  ? API_BASE_URL
  : API_BASE_URL.startsWith("/")
    ? API_BASE_URL
    : `/${API_BASE_URL}`;

type ApiOptions = RequestInit & { authToken?: string };

export class ApiError extends Error {
  status: number;
  payload: unknown;
  errors?: Record<string, string[]>;
  code?: string;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;

    if (payload && typeof payload === "object") {
      const record = payload as Record<string, unknown>;
      if (record.errors && typeof record.errors === "object") {
        this.errors = record.errors as Record<string, string[]>;
      }
      if (typeof record.code === "string") {
        this.code = record.code;
      }
    }
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${name}=`));

  if (!match) {
    return null;
  }

  return decodeURIComponent(match.split("=").slice(1).join("="));
}

export function hasCookie(name: string): boolean {
  return readCookie(name) !== null;
}

export async function ensureCsrfCookie(): Promise<void> {
  await fetch(`${API_ORIGIN}/sanctum/csrf-cookie`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });
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
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  headers.set("X-Requested-With", "XMLHttpRequest");

  const xsrfToken = readCookie("XSRF-TOKEN");
  if (xsrfToken && !headers.has("X-XSRF-TOKEN")) {
    headers.set("X-XSRF-TOKEN", xsrfToken);
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
  if (options.authToken) headers.set("Authorization", `Bearer ${options.authToken}`);

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const payload = await readResponseBody(response);
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

              return `API request failed: ${response.status}`;
            })()
        : `API request failed: ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
