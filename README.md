# Etegram Pay JS SDK

A lightweight browser SDK for launching the Etegram Checkout modal and handling payment outcomes.

## Features

- Browser checkout modal with secure hosted payment page
- Promise-based API with typed payment outcomes
- Lifecycle callbacks for open, success, cancel, close, and error events
- Automatic transaction reference generation
- Structured SDK errors with retry and provider metadata

## Install

```bash
npm install etegram-pay-v2
```

or

```bash
yarn add etegram-pay-v2
```

## Quick Start

```ts
import { payWithEtegram, SDKError } from "etegram-pay-v2";

async function startCheckout() {
  try {
    const result = await payWithEtegram({
      projectID: "your_project_id",
      publicKey: "your_public_key",
      email: "customer@email.com",
      phone: "08012345678",
      amount: 25000,
      firstname: "John",
      lastname: "Doe",
      metadata: {
        cartId: "CART-1021",
      },
      callbackUrl: "https://yourapp.com/payments/verify",

      onOpen: () => {
        console.log("Checkout opened");
      },
      onSuccess: ({ reference, providerPayload }) => {
        console.log("Success callback:", reference, providerPayload);
      },
      onCancel: ({ reference, reason }) => {
        console.log("Cancelled:", reference, reason);
      },
      onClose: ({ reference, reason }) => {
        console.log("Modal closed:", reference, reason);
      },
      onError: (error) => {
        console.error("Checkout runtime error:", error.code, error.message);
      },
    });

    if (result.status === "success") {
      console.log("Payment successful:", result.reference);
      return;
    }

    if (result.status === "cancelled") {
      console.log("Payment cancelled:", result.reference);
      return;
    }

    console.log("Checkout closed without success:", result.reference);
  } catch (error) {
    if (error instanceof SDKError) {
      console.error("SDK error:", {
        code: error.code,
        message: error.message,
        httpStatus: error.httpStatus,
        providerCode: error.providerCode,
        reference: error.reference,
        retryable: error.retryable,
        details: error.details,
      });
      return;
    }

    console.error("Unexpected error:", error);
  }
}
```

## Plain JavaScript Example

```html
<button id="pay-btn">Pay with Etegram</button>

<script type="module">
  import { payWithEtegram, SDKError } from "etegram-pay-v2";

  const button = document.getElementById("pay-btn");

  button.addEventListener("click", async () => {
    try {
      const result = await payWithEtegram({
        projectID: "your_project_id",
        publicKey: "your_public_key",
        email: "customer@email.com",
        phone: "08012345678",
        amount: 5000,
        firstname: "Jane",
        lastname: "Doe",
      });

      console.log("Checkout result:", result.status, result.reference);
    } catch (error) {
      if (error instanceof SDKError) {
        console.error("SDK error:", error.code, error.message);
        return;
      }

      console.error("Unexpected error:", error);
    }
  });
</script>
```

## Next.js Client-Only Example

Use the SDK inside a Client Component so it only runs in the browser.

```tsx
"use client";

import { payWithEtegram, SDKError } from "etegram-pay-v2";

export default function CheckoutButton() {
  const handlePay = async () => {
    try {
      const result = await payWithEtegram({
        projectID: process.env.NEXT_PUBLIC_ETEGRAM_PROJECT_ID || "",
        publicKey: process.env.NEXT_PUBLIC_ETEGRAM_PUBLIC_KEY || "",
        email: "customer@email.com",
        phone: "08012345678",
        amount: 12000,
        firstname: "John",
        lastname: "Doe",
      });

      if (result.status === "success") {
        await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: result.reference }),
        });
      }
    } catch (error) {
      if (error instanceof SDKError) {
        console.error(error.code, error.message);
      }
    }
  };

  return <button onClick={handlePay}>Pay now</button>;
}
```

## API

### payWithEtegram(payload)

Initializes a payment and opens the Etegram checkout iframe.

Returns a Promise that resolves with one of the following statuses:

- success
- cancelled
- closed

The Promise rejects with SDKError for initialization or runtime checkout errors.

## Payload Reference

Required fields:

- projectID: string
- publicKey: string
- email: string
- phone: string
- amount: number (must be greater than 0)
- firstname: string
- lastname: string

Optional fields:

- reference: string
- metadata: Record<string, unknown>
- callbackUrl: string
- onOpen: () => void
- onSuccess: ({ reference, providerPayload? }) => void
- onCancel: ({ reference, providerPayload?, reason? }) => void
- onError: (error: SDKError) => void
- onClose: ({ reference, reason? }) => void

Compatibility aliases (optional):

- onsuccess (same behavior as onSuccess)
- onclose (same behavior as onClose)

## Checkout Result

```ts
type CheckoutResult = {
  status: "success" | "cancelled" | "closed";
  reference: string;
  providerPayload?: unknown;
  reason?: string;
};
```

## SDKError

SDK errors are thrown with a consistent shape:

```ts
type SDKError = {
  name: "SDKError";
  code: string;
  message: string;
  httpStatus?: number;
  providerCode?: string;
  reference?: string;
  retryable: boolean;
  details?: unknown;
};
```

Common error codes include:

- UNSUPPORTED_ENVIRONMENT
- INVALID_PROJECT_ID
- INVALID_PUBLIC_KEY
- INVALID_EMAIL
- INVALID_PHONE
- INVALID_AMOUNT
- NETWORK_ERROR
- INITIALIZE_FAILED
- INITIALIZE_INVALID_RESPONSE
- CHECKOUT_URL_INVALID
- CHECKOUT_URL_NOT_ALLOWED
- CHECKOUT_RUNTIME_ERROR

## Utilities

### generateTransactionReference(length?)

Generate a custom transaction reference (prefixed with ETG).

```ts
import { generateTransactionReference } from "etegram-pay-v2";

const reference = generateTransactionReference();
const shortReference = generateTransactionReference(10);
```

## Environment Notes

- This SDK is browser-only and requires window and document.
- If you use SSR frameworks (for example, Next.js), call payWithEtegram only on the client.

## Backend Verification Best Practices

Do not trust frontend success alone. Always verify transaction status on your server before fulfillment.

Recommended flow:

1. Start checkout on the frontend.
2. Receive result.reference from the SDK.
3. Send reference to your backend.
4. Verify transaction status with Etegram server-to-server.
5. Fulfill order only after verified success.

Example verification route:

```ts
import type { Request, Response } from "express";

export async function verifyPayment(req: Request, res: Response) {
  const { reference } = req.body;

  if (!reference) {
    return res.status(400).json({ message: "reference is required" });
  }

  const response = await fetch(
    `https://api-checkout.etegram.com/api/transaction/verify/${reference}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.ETEGRAM_SECRET_KEY}`,
      },
    },
  );

  const payload = await response.json();

  if (!response.ok) {
    return res.status(502).json({
      message: "Verification failed",
      details: payload,
    });
  }

  const verified = payload?.data?.status === "success";

  if (!verified) {
    return res.status(409).json({
      message: "Transaction not successful",
      details: payload,
    });
  }

  return res.status(200).json({
    message: "Transaction verified",
    data: payload?.data,
  });
}
```

Security notes:

- Keep your secret key on the server only.
- Verify amount, currency, and customer details against your order record.
- Make fulfillment idempotent using the reference as a unique key.
- Log failed verification attempts for monitoring and incident response.

## Migration Notes

If you are upgrading from older docs/examples:

- Use package name etegram-pay-v2
- Use onCancel and onError where needed
- onSuccess now includes providerPayload
- onClose reason can be closeIframe, success, cancel, or error
