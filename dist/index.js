var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  SDKError: () => SDKError,
  generateTransactionReference: () => generateTransactionReference,
  payWithEtegram: () => payWithEtegram
});
module.exports = __toCommonJS(index_exports);
var SDKError = class extends Error {
  code;
  httpStatus;
  providerCode;
  reference;
  retryable;
  details;
  constructor(code, message, options = {}) {
    super(message);
    this.name = "SDKError";
    this.code = code;
    this.httpStatus = options.httpStatus;
    this.providerCode = options.providerCode;
    this.reference = options.reference;
    this.retryable = options.retryable ?? false;
    this.details = options.details;
  }
};
var INIT_API_BASE = "https://api-checkout.etegram.com";
var CHECKOUT_ALLOWLIST = /* @__PURE__ */ new Set(["checkout.etegram.com"]);
function getErrorMessage(value) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return "An unknown error occurred";
}
function getSecureRandomInt(maxExclusive) {
  if (maxExclusive <= 0) {
    throw new SDKError(
      "INVALID_RANDOM_RANGE",
      "Invalid random range requested"
    );
  }
  if (typeof globalThis !== "undefined") {
    const cryptoApi = globalThis.crypto;
    if (cryptoApi == null ? void 0 : cryptoApi.getRandomValues) {
      const bytes = new Uint32Array(1);
      cryptoApi.getRandomValues(bytes);
      return bytes[0] % maxExclusive;
    }
  }
  return Math.floor(Math.random() * maxExclusive);
}
function generateTransactionReference(length = 20) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let reference = "ETG";
  for (let i = 0; i < length; i += 1) {
    reference += chars[getSecureRandomInt(chars.length)];
  }
  return reference;
}
function assertInput(values) {
  var _a, _b, _c, _d;
  if (!((_a = values.projectID) == null ? void 0 : _a.trim())) {
    throw new SDKError("INVALID_PROJECT_ID", "projectID is required");
  }
  if (!((_b = values.publicKey) == null ? void 0 : _b.trim())) {
    throw new SDKError("INVALID_PUBLIC_KEY", "publicKey is required");
  }
  if (!((_c = values.email) == null ? void 0 : _c.trim())) {
    throw new SDKError("INVALID_EMAIL", "email is required");
  }
  if (!((_d = values.phone) == null ? void 0 : _d.trim())) {
    throw new SDKError("INVALID_PHONE", "phone is required");
  }
  if (!Number.isFinite(values.amount) || values.amount <= 0) {
    throw new SDKError("INVALID_AMOUNT", "amount must be a positive number");
  }
}
function assertAllowedCheckoutUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new SDKError(
      "CHECKOUT_URL_INVALID",
      "Checkout URL returned by server is invalid"
    );
  }
  if (!CHECKOUT_ALLOWLIST.has(parsed.hostname)) {
    throw new SDKError(
      "CHECKOUT_URL_NOT_ALLOWED",
      "Checkout URL host is not allowlisted"
    );
  }
}
async function initializePayment(values) {
  var _a, _b;
  assertInput(values);
  const reference = ((_a = values.reference) == null ? void 0 : _a.trim()) || generateTransactionReference(20);
  let response;
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
    callbackUrl: values.callbackUrl
  };
  try {
    response = await fetch(
      `${INIT_API_BASE}/api/transaction/initialize/${values.projectID}`,
      {
        method: "POST",
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${values.publicKey}`
        },
        body: JSON.stringify(requestPayload)
      }
    );
  } catch (error) {
    throw new SDKError(
      "NETWORK_ERROR",
      getErrorMessage(error == null ? void 0 : error.message),
      {
        reference,
        retryable: true
      }
    );
  }
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    throw new SDKError("INITIALIZE_FAILED", getErrorMessage(payload == null ? void 0 : payload.message), {
      httpStatus: response.status,
      providerCode: payload == null ? void 0 : payload.code,
      reference,
      retryable: response.status >= 500,
      details: payload
    });
  }
  const authorizationUrl = (_b = payload == null ? void 0 : payload.data) == null ? void 0 : _b.authorization_url;
  if (typeof authorizationUrl !== "string" || (payload == null ? void 0 : payload.message) !== "Authorization URL created") {
    throw new SDKError(
      "INITIALIZE_INVALID_RESPONSE",
      "Unable to parse initialize payment response",
      {
        httpStatus: response.status,
        reference,
        details: payload
      }
    );
  }
  assertAllowedCheckoutUrl(authorizationUrl);
  return {
    authorizationUrl,
    reference
  };
}
function createCheckoutNodes(authorizationUrl, sessionId) {
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
async function payWithEtegram(values) {
  var _a;
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new SDKError(
      "UNSUPPORTED_ENVIRONMENT",
      "payWithEtegram can only run in a browser environment"
    );
  }
  const { authorizationUrl, reference } = await initializePayment(values);
  const allowedOrigin = new URL(authorizationUrl).origin;
  const sessionId = generateTransactionReference(8);
  const onSuccessHandler = values.onSuccess || values.onsuccess;
  const onCloseHandler = values.onClose || values.onclose;
  const { container, iframe } = createCheckoutNodes(
    authorizationUrl,
    sessionId
  );
  (document.body || document.documentElement).appendChild(container);
  (_a = values.onOpen) == null ? void 0 : _a.call(values);
  return await new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      container.remove();
    };
    const resolveOnce = (value) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(value);
    };
    const rejectOnce = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };
    const onMessage = (event) => {
      var _a2, _b;
      if (event.origin !== allowedOrigin) {
        return;
      }
      if (event.source !== iframe.contentWindow) {
        return;
      }
      const data = event.data;
      if (data === "closeIframe") {
        onCloseHandler == null ? void 0 : onCloseHandler({
          reference,
          reason: "closeIframe"
        });
        resolveOnce({
          status: "closed",
          reference,
          reason: "closeIframe"
        });
        return;
      }
      if (typeof data !== "object" || data === null) {
        return;
      }
      const dataRecord = data;
      const eventType = typeof dataRecord.type === "string" ? dataRecord.type : "";
      if (eventType === "payment.success" || eventType === "success") {
        onSuccessHandler == null ? void 0 : onSuccessHandler({
          reference,
          providerPayload: dataRecord
        });
        onCloseHandler == null ? void 0 : onCloseHandler({
          reference,
          reason: "success"
        });
        resolveOnce({
          status: "success",
          reference,
          providerPayload: dataRecord
        });
        return;
      }
      if (eventType === "payment.cancel" || eventType === "cancel") {
        (_a2 = values.onCancel) == null ? void 0 : _a2.call(values, {
          reference,
          providerPayload: dataRecord,
          reason: "cancel"
        });
        onCloseHandler == null ? void 0 : onCloseHandler({
          reference,
          reason: "cancel"
        });
        resolveOnce({
          status: "cancelled",
          reference,
          providerPayload: dataRecord,
          reason: "cancel"
        });
        return;
      }
      if (eventType === "payment.error" || eventType === "error") {
        const error = new SDKError(
          "CHECKOUT_RUNTIME_ERROR",
          getErrorMessage(dataRecord.message),
          {
            reference,
            details: dataRecord
          }
        );
        (_b = values.onError) == null ? void 0 : _b.call(values, error);
        onCloseHandler == null ? void 0 : onCloseHandler({
          reference,
          reason: "error"
        });
        rejectOnce(error);
      }
    };
    window.addEventListener("message", onMessage);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SDKError,
  generateTransactionReference,
  payWithEtegram
});
