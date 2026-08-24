const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "");
// Development requests stay on the frontend origin so the Vite proxy owns
// the browser cookie path. Production can use the configured API origin.
export const API_BASE_URL = import.meta.env.DEV ? "/api" : configuredApiBaseUrl;

if (!API_BASE_URL) {
  throw new Error("VITE_API_BASE_URL is required for production builds.");
}

const API_ORIGIN = import.meta.env.DEV
  ? window.location.origin
  : new URL(API_BASE_URL).origin;

if (!import.meta.env.DEV && API_ORIGIN === window.location.origin) {
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

type ApiOptions = RequestInit & { authToken?: string };

let csrfToken: string | null = null;

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
  const response = await fetch(`${API_ORIGIN}/sanctum/csrf-cookie`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const payload = await readResponseBody(response);
    const message = response.status === 405
      ? "GET /sanctum/csrf-cookie is not allowed by the configured API host. Check VITE_API_BASE_URL and the deployed Laravel routes."
      : `CSRF request failed: GET /sanctum/csrf-cookie returned ${response.status}.`;

    throw new ApiError(message, response.status, payload);
  }

  csrfToken = response.headers.get("X-CSRF-TOKEN") ?? readCookie("XSRF-TOKEN");

  if (!csrfToken) {
    throw new Error("The API did not provide a CSRF token. Check the Laravel CORS and session configuration.");
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

  if (csrfToken && !headers.has("X-CSRF-TOKEN")) {
    headers.set("X-CSRF-TOKEN", csrfToken);
  } else {
    const xsrfToken = readCookie("XSRF-TOKEN");
    if (xsrfToken && !headers.has("X-XSRF-TOKEN")) {
      headers.set("X-XSRF-TOKEN", xsrfToken);
    }
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

  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
    ...options,
    headers,
    credentials: "include",
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
