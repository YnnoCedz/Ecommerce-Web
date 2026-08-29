export type ErrorContext =
  | "authentication"
  | "registration"
  | "product"
  | "cart"
  | "checkout"
  | "product-management"
  | "seller"
  | "admin"
  | "profile"
  | "upload"
  | "messaging"
  | "orders"
  | "notifications"
  | "generic";

type ErrorMappingOptions = {
  context?: ErrorContext;
  fallback?: string;
  log?: boolean;
};

type ApiErrorShape = {
  status: number;
  message: string;
  technicalMessage?: string;
  code?: string;
  errors?: Record<string, string[]>;
};

const GENERIC_ERROR = "Something went wrong. Please try again.";

const CONTEXT_FALLBACKS: Record<ErrorContext, string> = {
  authentication: "We couldn't sign you in. Please try again.",
  registration: "We couldn't complete your registration. Please try again.",
  product: "This product is currently unavailable. Please try again later.",
  cart: "We couldn't update your cart. Please try again.",
  checkout: "We couldn't place your order. Please try again.",
  "product-management": "Product couldn't be saved. Please try again.",
  seller: "We couldn't complete that seller action. Please try again.",
  admin: "Action couldn't be completed. Please try again.",
  profile: "We couldn't save your changes. Please try again.",
  upload: "The file couldn't be uploaded. Please try again.",
  messaging: "We couldn't complete that messaging action. Please try again.",
  orders: "We couldn't update the order. Please try again.",
  notifications: "We couldn't update your notifications. Please try again.",
  generic: GENERIC_ERROR,
};

const FIELD_MESSAGES: Record<string, string> = {
  first_name: "Please enter your first name.",
  last_name: "Please enter your last name.",
  email: "Please enter a valid email address.",
  password: "Password must be at least 8 characters.",
  password_confirmation: "Passwords do not match.",
  phone: "Enter a valid phone number.",
  mobile: "Enter a valid phone number.",
  address: "Delivery address is required.",
  address_id: "Please select a delivery address.",
  product_name: "Product name cannot be empty.",
  name: "Please complete all required fields.",
  price: "Price must be greater than 0.",
  base_price: "Price must be greater than 0.",
  stock: "Stock cannot be negative.",
  category_id: "Please select a product category.",
  variant_id: "Please choose a valid product option.",
  image: "Product image couldn't be uploaded. Please try again.",
  images: "Product image couldn't be uploaded. Please try again.",
};

const TECHNICAL_MESSAGE = /(?:sqlstate|queryexception|axioserror|validationexception|undefined (?:index|offset)|stack trace|syntaxerror|typeerror|referenceerror|networkerror object|pdoexception|illuminate\\|vendor[\\/]|at .+\(.+:[0-9]+:[0-9]+\)|api request failed:|returned [45][0-9]{2}|\{\s*"?(?:message|errors)"?\s*:)/i;

function asApiError(error: unknown): ApiErrorShape | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as Partial<ApiErrorShape>;
  if (typeof candidate.status !== "number" || typeof candidate.message !== "string") return null;
  return candidate as ApiErrorShape;
}

function normalizedDetails(error: unknown): { message: string; code: string; status?: number } {
  const apiError = asApiError(error);
  if (apiError) {
    const validationDetails = apiError.errors
      ? Object.values(apiError.errors).flat().filter((value): value is string => typeof value === "string").join(" ")
      : "";
    return {
      message: `${apiError.technicalMessage ?? apiError.message} ${validationDetails}`.toLowerCase(),
      code: (apiError.code ?? "").toLowerCase(),
      status: apiError.status,
    };
  }

  if (error instanceof Error) {
    return { message: error.message.toLowerCase(), code: error.name.toLowerCase() };
  }

  return { message: "", code: "" };
}

function validationMessage(error: ApiErrorShape): string | null {
  if (!error.errors) return null;

  for (const field of Object.keys(error.errors)) {
    const normalizedField = field.replace(/\.\d+(?=\.|$)/g, "").split(".").pop() ?? field;
    if (FIELD_MESSAGES[normalizedField]) return FIELD_MESSAGES[normalizedField];
  }

  return null;
}

export function safeValidationErrors(errors: Record<string, string[]>): Record<string, string[]> {
  return Object.fromEntries(Object.keys(errors).map((field) => {
    const normalizedField = field.replace(/\.\d+(?=\.|$)/g, "").split(".").pop() ?? field;
    return [field, [FIELD_MESSAGES[normalizedField] ?? "Please check this field."]];
  }));
}

function mappedMessage(error: unknown, context: ErrorContext): string | null {
  const { message, code, status } = normalizedDetails(error);
  const text = `${code} ${message}`;
  const apiError = asApiError(error);

  if (/aborterror|aborted|cancelled/.test(text)) return "The request was cancelled. Please try again.";
  if (/timeout|timed out/.test(text)) return "The request took too long. Please try again.";
  if (/failed to fetch|networkerror|network error|load failed|offline/.test(text)) return "You're offline or the server can't be reached.";
  if (status === 503) return "The service is temporarily unavailable.";
  if (status && status >= 500) return "Something went wrong on our side. Please try again later.";
  if (status === 429) return "Too many attempts. Please wait a moment and try again.";
  if (/account.*suspend|user.*suspend/.test(text)) return "Your account has been temporarily suspended.";
  if (/invalid credentials|credentials.*incorrect|password.*incorrect/.test(text)) return "Incorrect email or password.";
  if (/user not found|account not found|no account/.test(text)) return "No account was found with that email.";
  if (/password.*mismatch|passwords.*not match/.test(text)) return "Passwords do not match.";
  if (/email.*(?:taken|already|exists|registered)|unique.*email/.test(text)) {
    return context === "registration" ? "This email is already registered." : "An account with this email already exists.";
  }
  if (/(?:phone|mobile).*(?:taken|already|exists|use)|unique.*(?:phone|mobile)/.test(text)) return "This phone number is already in use.";
  if (/seller application.*(?:exists|pending)|application.*already/.test(text)) return "You already have a pending seller application.";
  if (/weak password|password.*(?:8|characters)/.test(text)) return "Your password must be at least 8 characters.";
  if (/invalid email|email.*valid/.test(text)) return "Enter a valid email address.";
  if (/out of stock|insufficient stock|quantity.*stock|inventory.*(?:changed|conflict)/.test(text)) {
    return context === "checkout" ? "Some items changed availability. Review your cart." : "The requested quantity is unavailable.";
  }
  if (/variant.*(?:unavailable|invalid|not found)|option.*unavailable/.test(text)) return "Please choose a valid product option.";
  if (/product.*not found/.test(text)) return "This product is no longer available.";
  if (/duplicate.*sku|sku.*(?:exists|taken|unique)/.test(text)) return "This SKU already exists.";
  if (/duplicate.*variant|variant.*duplicat/.test(text)) return "One or more variants are duplicated.";
  if (/category.*(?:required|missing)/.test(text)) return "Please select a product category.";
  if (/price.*(?:invalid|required|greater)/.test(text)) return "Enter a valid product price.";
  if (/cart.*empty/.test(text)) return "Your cart is empty.";
  if (/already.*cart|cart.*already/.test(text)) return "This item is already in your cart.";
  if (/address.*(?:required|select)/.test(text)) return "Please select a delivery address.";
  if (/shipping.*unavailable|delivery.*(?:not available|unavailable)/.test(text)) return "Delivery isn't available for this address.";
  if (/payment.*(?:failed|declined)/.test(text)) return "Payment couldn't be completed.";
  if (/file.*(?:too large|size)|max.*(?:mb|upload)/.test(text)) return "File exceeds the maximum upload size.";
  if (/unsupported.*(?:file|format)|invalid.*file type|mimes?/.test(text)) return context === "upload" ? "Unsupported file format." : "Please upload a JPG, PNG, or WEBP image.";
  if (/storage.*unavailable/.test(text)) return "File storage is temporarily unavailable.";
  if (status === 401 || /unauthenticated|token expired|invalid token/.test(text)) return "Your session has expired. Please sign in again.";
  if (status === 403 || /permission denied|forbidden|not authorized/.test(text)) {
    return context === "authentication"
      ? "Your account cannot access this page."
      : "You don't have permission to perform this action.";
  }
  if (apiError) {
    const validation = validationMessage(apiError);
    if (validation) return validation;
  }
  if (status === 404 && context === "admin") return "The selected record no longer exists.";

  return null;
}

export function mapErrorToMessage(error: unknown, options: ErrorMappingOptions = {}): string {
  const context = options.context ?? "generic";

  if (options.log !== false && import.meta.env.DEV) {
    console.error(`[Maketo:${context}]`, error);
  }

  return mappedMessage(error, context) ?? options.fallback ?? CONTEXT_FALLBACKS[context];
}

export function safeApiErrorMessage(message: string, status: number, payload: unknown): string {
  const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : null;
  const error: ApiErrorShape = {
    status,
    message,
    technicalMessage: message,
    code: typeof record?.code === "string" ? record.code : undefined,
    errors: record?.errors && typeof record.errors === "object"
      ? record.errors as Record<string, string[]>
      : undefined,
  };

  return mappedMessage(error, "generic") ?? GENERIC_ERROR;
}

export function sanitizeErrorToastMessage(message?: string, fallback = GENERIC_ERROR): string {
  if (!message || TECHNICAL_MESSAGE.test(message)) return fallback;
  return message;
}
