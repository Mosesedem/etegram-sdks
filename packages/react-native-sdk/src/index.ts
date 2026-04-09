import { Linking } from "react-native";

export type InitializePaymentRequest = {
  projectID: string;
  publicKey: string;
  email: string;
  phone: string;
  amount: number;
  currency: string;
  firstname: string;
  lastname: string;
  reference?: string;
  metadata?: Record<string, unknown>;
  callbackUrl?: string;
};

export type InitializeResult = {
  authorizationUrl: string;
  reference: string;
  expiresAt?: string;
};

export type VerifyResult = {
  reference: string;
  status: string;
  message?: string;
};

export type SDKErrorShape = {
  code: string;
  message: string;
  httpStatus?: number;
  providerCode?: string;
  reference?: string;
  retryable: boolean;
  details?: unknown;
};

export class SDKError extends Error {
  code: string;
  httpStatus?: number;
  providerCode?: string;
  reference?: string;
  retryable: boolean;
  details?: unknown;

  constructor(error: SDKErrorShape) {
    super(error.message);
    this.name = "SDKError";
    this.code = error.code;
    this.httpStatus = error.httpStatus;
    this.providerCode = error.providerCode;
    this.reference = error.reference;
    this.retryable = error.retryable;
    this.details = error.details;
  }
}

const INIT_BASE_URL = "https://api-checkout.etegram.com";
const CHECKOUT_ALLOWLIST = new Set(["checkout.etegram.com"]);

function assertRequest(payload: InitializePaymentRequest): void {
  if (!payload.projectID.trim()) {
    throw new SDKError({
      code: "INVALID_PROJECT_ID",
      message: "projectID is required",
      retryable: false,
    });
  }
  if (!payload.publicKey.trim()) {
    throw new SDKError({
      code: "INVALID_PUBLIC_KEY",
      message: "publicKey is required",
      retryable: false,
    });
  }
  if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
    throw new SDKError({
      code: "INVALID_AMOUNT",
      message: "amount must be positive",
      retryable: false,
    });
  }
  if (!/^[A-Za-z]{3}$/.test(payload.currency.trim())) {
    throw new SDKError({
      code: "INVALID_CURRENCY",
      message: "currency must be a 3-letter ISO code",
      retryable: false,
    });
  }
}

export function generateTransactionReference(length = 20): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "ETG";
  for (let i = 0; i < (length <= 0 ? 20 : length); i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function initializePayment(
  payload: InitializePaymentRequest,
): Promise<InitializeResult> {
  assertRequest(payload);

  const reference =
    payload.reference?.trim() || generateTransactionReference(20);
  const response = await fetch(
    `${INIT_BASE_URL}/api/transaction/initialize/${payload.projectID}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${payload.publicKey}`,
      },
      body: JSON.stringify({ ...payload, reference }),
    },
  );

  const body = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    throw new SDKError({
      code: "INITIALIZE_FAILED",
      message:
        typeof body.message === "string" ? body.message : "request failed",
      retryable: response.status >= 500,
      httpStatus: response.status,
      providerCode: typeof body.code === "string" ? body.code : undefined,
      reference,
      details: body,
    });
  }

  const data = (body.data ?? {}) as Record<string, unknown>;
  const authorizationUrl =
    typeof data.authorization_url === "string" ? data.authorization_url : "";
  if (!authorizationUrl) {
    throw new SDKError({
      code: "INITIALIZE_INVALID_RESPONSE",
      message: "authorization URL missing",
      retryable: false,
      reference,
    });
  }

  const parsed = new URL(authorizationUrl);
  if (
    parsed.protocol !== "https:" ||
    !CHECKOUT_ALLOWLIST.has(parsed.hostname)
  ) {
    throw new SDKError({
      code: "CHECKOUT_URL_NOT_ALLOWED",
      message: "checkout URL host is not allowlisted",
      retryable: false,
      reference,
    });
  }

  return {
    authorizationUrl,
    reference:
      typeof data.reference === "string" && data.reference.trim()
        ? data.reference
        : reference,
    expiresAt:
      typeof data.expires_at === "string" ? data.expires_at : undefined,
  };
}

export async function openCheckout(authorizationUrl: string): Promise<void> {
  const canOpen = await Linking.canOpenURL(authorizationUrl);
  if (!canOpen) {
    throw new SDKError({
      code: "CHECKOUT_OPEN_FAILED",
      message: "unable to open checkout URL",
      retryable: false,
    });
  }
  await Linking.openURL(authorizationUrl);
}

export async function verifyTransaction(
  projectID: string,
  publicKey: string,
  reference: string,
): Promise<VerifyResult> {
  if (!projectID.trim()) {
    throw new SDKError({
      code: "INVALID_PROJECT_ID",
      message: "projectID is required",
      retryable: false,
    });
  }
  if (!publicKey.trim()) {
    throw new SDKError({
      code: "INVALID_PUBLIC_KEY",
      message: "publicKey is required",
      retryable: false,
    });
  }
  if (!reference.trim()) {
    throw new SDKError({
      code: "INVALID_REFERENCE",
      message: "reference is required",
      retryable: false,
    });
  }

  const response = await fetch(
    `${INIT_BASE_URL}/api/transaction/verify/${projectID}/${reference}`,
    {
      headers: { Authorization: `Bearer ${publicKey}` },
    },
  );
  const body = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!response.ok) {
    throw new SDKError({
      code: "VERIFY_FAILED",
      message:
        typeof body.message === "string" ? body.message : "request failed",
      retryable: response.status >= 500,
      httpStatus: response.status,
      providerCode: typeof body.code === "string" ? body.code : undefined,
      reference,
      details: body,
    });
  }

  const data = (body.data ?? {}) as Record<string, unknown>;
  return {
    reference: typeof data.reference === "string" ? data.reference : reference,
    status: typeof data.status === "string" ? data.status : "unknown",
    message: typeof data.message === "string" ? data.message : undefined,
  };
}
