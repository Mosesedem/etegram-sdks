export type DataProps = {
  projectID: string;
  publicKey: string;
  email: string;
  amount: number;
  phone: string;
  reference?: string;
  firstname: string;
  lastname: string;
  metadata?: Record<string, unknown>;
  callbackUrl?: string;
  onOpen?: () => void;
  onSuccess?: (result: {
    reference: string;
    providerPayload?: unknown;
  }) => void;
  onCancel?: (result: {
    reference: string;
    providerPayload?: unknown;
    reason?: string;
  }) => void;
  onError?: (error: SDKError) => void;
  onClose?: (result: { reference: string; reason?: string }) => void;
  onsuccess?: (result: {
    reference: string;
    providerPayload?: unknown;
  }) => void;
  onclose?: (result: { reference: string; reason?: string }) => void;
};

export type CheckoutResult = {
  status: "success" | "cancelled" | "closed";
  reference: string;
  providerPayload?: unknown;
  reason?: string;
};

type SDKErrorOptions = {
  httpStatus?: number;
  providerCode?: string;
  reference?: string;
  retryable?: boolean;
  details?: unknown;
};

export class SDKError extends Error {
  code: string;
  httpStatus?: number;
  providerCode?: string;
  reference?: string;
  retryable: boolean;
  details?: unknown;

  constructor(code: string, message: string, options: SDKErrorOptions = {}) {
    super(message);
    this.name = "SDKError";
    this.code = code;
    this.httpStatus = options.httpStatus;
    this.providerCode = options.providerCode;
    this.reference = options.reference;
    this.retryable = options.retryable ?? false;
    this.details = options.details;
  }
}

const INIT_API_BASE = "https://api-checkout.etegram.com";
const CHECKOUT_ALLOWLIST = new Set(["checkout.etegram.com"]);

function getErrorMessage(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return "An unknown error occurred";
}

function getSecureRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) {
    throw new SDKError(
      "INVALID_RANDOM_RANGE",
      "Invalid random range requested",
    );
  }

  if (typeof globalThis !== "undefined") {
    const cryptoApi = (globalThis as { crypto?: Crypto }).crypto;
    if (cryptoApi?.getRandomValues) {
      const bytes = new Uint32Array(1);
      cryptoApi.getRandomValues(bytes);
      return bytes[0] % maxExclusive;
    }
  }

  return Math.floor(Math.random() * maxExclusive);
}

export function generateTransactionReference(length = 20): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let reference = "ETG";

  for (let i = 0; i < length; i += 1) {
    reference += chars[getSecureRandomInt(chars.length)];
  }

  return reference;
}

function assertInput(values: DataProps): void {
  if (!values.projectID?.trim()) {
    throw new SDKError("INVALID_PROJECT_ID", "projectID is required");
  }
  if (!values.publicKey?.trim()) {
    throw new SDKError("INVALID_PUBLIC_KEY", "publicKey is required");
  }
  if (!values.email?.trim()) {
    throw new SDKError("INVALID_EMAIL", "email is required");
  }
  if (!values.phone?.trim()) {
    throw new SDKError("INVALID_PHONE", "phone is required");
  }
  if (!Number.isFinite(values.amount) || values.amount <= 0) {
    throw new SDKError("INVALID_AMOUNT", "amount must be a positive number");
  }
}

function assertAllowedCheckoutUrl(urlString: string): void {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new SDKError(
      "CHECKOUT_URL_INVALID",
      "Checkout URL returned by server is invalid",
    );
  }

  if (!CHECKOUT_ALLOWLIST.has(parsed.hostname)) {
    throw new SDKError(
      "CHECKOUT_URL_NOT_ALLOWED",
      "Checkout URL host is not allowlisted",
    );
  }
}

async function initializePayment(
  values: DataProps,
): Promise<{ authorizationUrl: string; reference: string }> {
  assertInput(values);

  const reference =
    values.reference?.trim() || generateTransactionReference(20);

  let response: Response;
  const requestPayload = {
    projectID: values.projectID,
    publicKey: values.publicKey,
    email: values.email,
    amount: values.amount,
    phone: values.phone,
    reference,
    firstname: values.firstname,
    lastname: values.lastname,
    metadata: values.metadata,
    callbackUrl: values.callbackUrl,
  };

  try {
    response = await fetch(
      `${INIT_API_BASE}/api/transaction/initialize/${values.projectID}`,
      {
        method: "POST",
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${values.publicKey}`,
        },
        body: JSON.stringify(requestPayload),
      },
    );
  } catch (error) {
    throw new SDKError(
      "NETWORK_ERROR",
      getErrorMessage((error as Error)?.message),
      {
        reference,
        retryable: true,
      },
    );
  }

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new SDKError("INITIALIZE_FAILED", getErrorMessage(payload?.message), {
      httpStatus: response.status,
      providerCode: payload?.code,
      reference,
      retryable: response.status >= 500,
      details: payload,
    });
  }

  const authorizationUrl = payload?.data?.authorization_url;
  if (
    typeof authorizationUrl !== "string" ||
    payload?.message !== "Authorization URL created"
  ) {
    throw new SDKError(
      "INITIALIZE_INVALID_RESPONSE",
      "Unable to parse initialize payment response",
      {
        httpStatus: response.status,
        reference,
        details: payload,
      },
    );
  }

  assertAllowedCheckoutUrl(authorizationUrl);

  return {
    authorizationUrl,
    reference,
  };
}

function createCheckoutNodes(
  authorizationUrl: string,
  sessionId: string,
): { container: HTMLDivElement; iframe: HTMLIFrameElement } {
  const container = document.createElement("div");
  container.className = `etegram-checkout-container-${sessionId}`;

  const style = document.createElement("style");
  style.textContent = `
    .etegram-checkout-iframe-${sessionId} {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
      border: none;
      z-index: 2000;
      background: #ffffff;
    }
  `;

  const iframe = document.createElement("iframe");
  iframe.className = `etegram-checkout-iframe-${sessionId}`;
  iframe.setAttribute("allow", "clipboard-write");
  iframe.setAttribute("referrerpolicy", "strict-origin");
  iframe.src = authorizationUrl;

  container.appendChild(style);
  container.appendChild(iframe);

  return { container, iframe };
}

export async function payWithEtegram(
  values: DataProps,
): Promise<CheckoutResult> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new SDKError(
      "UNSUPPORTED_ENVIRONMENT",
      "payWithEtegram can only run in a browser environment",
    );
  }

  const { authorizationUrl, reference } = await initializePayment(values);
  const allowedOrigin = new URL(authorizationUrl).origin;
  const sessionId = generateTransactionReference(8);
  const onSuccessHandler = values.onSuccess || values.onsuccess;
  const onCloseHandler = values.onClose || values.onclose;
  const { container, iframe } = createCheckoutNodes(
    authorizationUrl,
    sessionId,
  );

  (document.body || document.documentElement).appendChild(container);
  values.onOpen?.();

  return await new Promise((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      container.remove();
    };

    const resolveOnce = (value: CheckoutResult) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(value);
    };

    const rejectOnce = (error: SDKError) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== allowedOrigin) {
        return;
      }

      if (event.source !== iframe.contentWindow) {
        return;
      }

      const data = event.data;

      if (data === "closeIframe") {
        onCloseHandler?.({
          reference,
          reason: "closeIframe",
        });
        resolveOnce({
          status: "closed",
          reference,
          reason: "closeIframe",
        });
        return;
      }

      if (typeof data !== "object" || data === null) {
        return;
      }

      const dataRecord = data as Record<string, unknown>;
      const eventType =
        typeof dataRecord.type === "string" ? dataRecord.type : "";

      if (eventType === "payment.success" || eventType === "success") {
        onSuccessHandler?.({
          reference,
          providerPayload: dataRecord,
        });
        onCloseHandler?.({
          reference,
          reason: "success",
        });
        resolveOnce({
          status: "success",
          reference,
          providerPayload: dataRecord,
        });
        return;
      }

      if (eventType === "payment.cancel" || eventType === "cancel") {
        values.onCancel?.({
          reference,
          providerPayload: dataRecord,
          reason: "cancel",
        });
        onCloseHandler?.({
          reference,
          reason: "cancel",
        });
        resolveOnce({
          status: "cancelled",
          reference,
          providerPayload: dataRecord,
          reason: "cancel",
        });
        return;
      }

      if (eventType === "payment.error" || eventType === "error") {
        const error = new SDKError(
          "CHECKOUT_RUNTIME_ERROR",
          getErrorMessage(dataRecord.message),
          {
            reference,
            details: dataRecord,
          },
        );
        values.onError?.(error);
        onCloseHandler?.({
          reference,
          reason: "error",
        });
        rejectOnce(error);
      }
    };

    window.addEventListener("message", onMessage);
  });
}
