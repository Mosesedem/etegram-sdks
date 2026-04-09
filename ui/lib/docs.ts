export type DocCodeExample = {
  title: string;
  language: string;
  code: string;
};

export type DocSection = {
  title: string;
  summary?: string;
  bullets?: string[];
  checklist?: string[];
  codeExamples?: DocCodeExample[];
};

export type DocPage = {
  slug: string;
  title: string;
  summary: string;
  audience: string;
  lastReviewed: string;
  sections: DocSection[];
};

export const docsNav: Array<{ href: string; label: string }> = [
  { href: "/", label: "Home" },
  { href: "/docs/getting-started", label: "Getting Started" },
  { href: "/docs/core-api", label: "Core API" },
  { href: "/docs/webhooks-security", label: "Webhooks & Security" },
  { href: "/docs/wordpress-forms", label: "WordPress Forms" },
  { href: "/docs/woocommerce", label: "WooCommerce" },
  { href: "/docs/javascript-typescript", label: "JavaScript/TypeScript" },
  { href: "/docs/go", label: "Go" },
  { href: "/docs/flutter", label: "Flutter" },
  { href: "/docs/react-native", label: "React Native" },
  { href: "/docs/kotlin", label: "Kotlin" },
  { href: "/docs/swift", label: "Swift" },
  { href: "/docs/python", label: "Python" },
  { href: "/docs/migration-changelog", label: "Migration & Changelog" },
  { href: "/docs/api-reference", label: "API Reference" }
];

export const docsPages: DocPage[] = [
  {
    slug: "getting-started",
    title: "Getting Started",
    summary:
      "Production onboarding checklist for credentials, environments, references, and callback infrastructure.",
    audience: "All integrations",
    lastReviewed: "2026-04-09",
    sections: [
      {
        title: "What You Need",
        summary:
          "Provision credentials and callback endpoints first, then choose your integration track.",
        bullets: [
          "Project ID and Public Key from your Etegram dashboard.",
          "Separate sandbox and live environment settings.",
          "A callback URL for redirect or in-app return handling.",
          "A webhook URL that accepts JSON and returns 200 quickly.",
          "A backend verification endpoint for final order fulfillment."
        ]
      },
      {
        title: "Environment Strategy",
        bullets: [
          "Never use live public keys in development builds.",
          "Store keys and project IDs in runtime environment variables.",
          "Keep test and live webhook URLs independent.",
          "Tag every transaction log with environment and reference."
        ]
      },
      {
        title: "Integration Decision Map",
        bullets: [
          "Use WordPress Forms or WooCommerce if you are on WordPress.",
          "Use JavaScript/TypeScript for browser checkout experiences.",
          "Use Go/Python for backend services and verification workflows.",
          "Use Flutter/React Native/Kotlin/Swift for mobile app flows."
        ]
      },
      {
        title: "Go-Live Checklist",
        checklist: [
          "Sandbox payment and failed-payment simulations are complete.",
          "Webhook retries are idempotent by reference.",
          "Verification is required before order state mutation.",
          "Operational alerts are in place for webhook failures.",
          "Support runbook is available for payment incident response."
        ]
      }
    ]
  },
  {
    slug: "core-api",
    title: "Core API",
    summary:
      "Canonical API contract shared by WordPress plugins and all SDKs to prevent cross-platform drift.",
    audience: "Backend and SDK maintainers",
    lastReviewed: "2026-04-09",
    sections: [
      {
        title: "Initialize Payment",
        summary:
          "Create an authorization URL that the user completes in hosted checkout.",
        bullets: [
          "Endpoint pattern: /api/transaction/initialize/:projectID",
          "Authorization: Bearer Public Key",
          "Required fields: amount, currency, email, phone, firstname, lastname",
          "Response includes authorization_url/access_code/reference"
        ],
        codeExamples: [
          {
            title: "Initialize payment (HTTP)",
            language: "bash",
            code:
              "curl -X POST 'https://api-checkout.etegram.com/api/transaction/initialize/{projectID}' \\\n  -H 'Content-Type: application/json' \\\n  -H 'Authorization: Bearer {PUBLIC_KEY}' \\\n  -d '{\n    \"amount\": 5000,\n    \"currency\": \"NGN\",\n    \"email\": \"user@example.com\",\n    \"phone\": \"08012345678\",\n    \"firstname\": \"Ada\",\n    \"lastname\": \"Lovelace\"\n  }'"
          }
        ]
      },
      {
        title: "Verify Transaction",
        summary:
          "Verification is the source of truth and should be performed server-side after callback/webhook.",
        bullets: [
          "Run verification server-side after checkout success callback.",
          "Use reference as the correlation key across systems.",
          "Treat provider response as source of truth for final payment state.",
          "Apply retries only for safe idempotent verification calls."
        ]
      },
      {
        title: "Error Model",
        summary:
          "Use consistent typed errors across SDKs for observability and operational recovery.",
        bullets: [
          "Use structured error fields: code, message, httpStatus, providerCode, reference, retryable.",
          "Never swallow initialize errors; return typed failures to consumers.",
          "Log redacted context only.",
          "Include correlation ID/reference in all logs and support payloads."
        ],
        checklist: [
          "No undefined return paths on failures.",
          "All integrations expose machine-readable error codes.",
          "PII and secrets are redacted from logs."
        ]
      }
    ]
  },
  {
    slug: "webhooks-security",
    title: "Webhooks and Security",
    summary:
      "Secure webhook processing, retry handling, and idempotent transaction state transitions.",
    audience: "Backend engineers and platform operators",
    lastReviewed: "2026-04-09",
    sections: [
      {
        title: "Webhook Behavior",
        summary:
          "Webhooks notify your backend of payment lifecycle updates and may be retried when delivery fails.",
        bullets: [
          "Etegram sends payment status events to your webhook URL as JSON.",
          "Acknowledge with HTTP 200 immediately, then process asynchronously.",
          "Expected statuses include successful and failed.",
          "Live mode uses a retry schedule if delivery does not receive a 200 response."
        ],
        codeExamples: [
          {
            title: "Node webhook handler (idempotent skeleton)",
            language: "ts",
            code:
              "import express from 'express';\n\nconst app = express();\napp.use(express.json());\n\napp.post('/payment-webhook', async (req, res) => {\n  const event = req.body;\n  res.status(200).send('ok');\n\n  const reference = String(event?.reference ?? '');\n  if (!reference) return;\n\n  const alreadyProcessed = await hasProcessed(reference);\n  if (alreadyProcessed) return;\n\n  const verified = await verifyTransaction(reference);\n  if (verified.status === 'successful') {\n    await markOrderPaid(reference);\n  }\n\n  await markProcessed(reference);\n});"
          }
        ]
      },
      {
        title: "Reliability",
        bullets: [
          "Design handlers to be idempotent by reference.",
          "Store raw webhook payloads and processing results for reconciliation.",
          "Queue downstream fulfillment to avoid request-time bottlenecks.",
          "Alert on repeated verification failures or status mismatch incidents."
        ]
      },
      {
        title: "Security Checklist",
        checklist: [
          "Reject unknown origin/signature where integration path supports verification.",
          "Do not trust callback query params without verification.",
          "Only accept HTTPS checkout URLs from allowed hosts.",
          "Do not log secrets or full customer PII.",
          "Protect webhook route with rate limiting and abuse controls.",
          "Use least-privilege datastore access for webhook processors."
        ]
      },
      {
        title: "WordPress/PHP Webhook Skeleton",
        bullets: [
          "Register a dedicated REST webhook route.",
          "Always sanitize and validate incoming payload fields.",
          "Persist processed references to prevent duplicate order updates."
        ],
        codeExamples: [
          {
            title: "WordPress REST endpoint callback",
            language: "php",
            code:
              "add_action('rest_api_init', function () {\n  register_rest_route('etegram/v1', '/webhook', [\n    'methods' => 'POST',\n    'callback' => 'etegram_webhook_handler',\n    'permission_callback' => '__return_true',\n  ]);\n});\n\nfunction etegram_webhook_handler(WP_REST_Request $request) {\n  $payload = $request->get_json_params();\n  $reference = sanitize_text_field($payload['reference'] ?? '');\n\n  if ($reference === '') {\n    return new WP_REST_Response(['ok' => true], 200);\n  }\n\n  // TODO: check idempotency by reference and verify payment server-side\n  return new WP_REST_Response(['ok' => true], 200);\n}"
          }
        ]
      }
    ]
  },
  {
    slug: "wordpress-forms",
    title: "WordPress Forms",
    summary:
      "Production guide for deploying and operating the Etegrampay Forms plugin with webhook-safe workflows.",
    audience: "WordPress site owners and developers",
    lastReviewed: "2026-04-09",
    sections: [
      {
        title: "Install and Activate Plugin",
        bullets: [
          "Upload plugin and activate from WordPress Admin.",
          "Configure settings and API credentials in plugin settings.",
          "Create form posts and embed using shortcode.",
          "Confirm custom post type and database table creation on first load."
        ]
      },
      {
        title: "Form and Payment Data Flow",
        bullets: [
          "Plugin stores entries in a dedicated form entries table.",
          "Submission records include payment status, amount, and reference.",
          "Use dashboard entry filters for status and form-level review.",
          "Set webhook handler to update local form entry status by reference."
        ]
      },
      {
        title: "Production Checklist",
        checklist: [
          "Admin pages have capability checks for non-admin routes.",
          "AJAX endpoints validate nonce and sanitize all payload fields.",
          "Webhook route is tested with duplicate-delivery simulation.",
          "Form entry data retention policy is documented.",
          "Support team has reference lookup tooling."
        ]
      }
    ]
  },
  {
    slug: "woocommerce",
    title: "WooCommerce",
    summary:
      "Production setup for Etegram as a WooCommerce gateway with safe order-state transitions.",
    audience: "WooCommerce stores",
    lastReviewed: "2026-04-09",
    sections: [
      {
        title: "Gateway Setup",
        bullets: [
          "Install plugin zip and activate.",
          "Open WooCommerce > Settings > Payments.",
          "Enable gateway and set API key plus project ID.",
          "Verify sandbox transaction before enabling live mode."
        ]
      },
      {
        title: "Operational Notes",
        bullets: [
          "Use sandbox keys before live launch.",
          "Optionally auto-complete paid orders based on policy.",
          "Verify webhook and callback behavior in test mode before production.",
          "Treat backend verification as order completion trigger."
        ]
      },
      {
        title: "Store Readiness Checklist",
        checklist: [
          "Successful, failed, and cancelled flow tested from checkout to order state.",
          "Reference is stored on order meta for support and reconciliation.",
          "Refund and reversal handling behavior is documented.",
          "Support macros include transaction reference handling guide."
        ]
      }
    ]
  },
  {
    slug: "javascript-typescript",
    title: "JavaScript and TypeScript",
    summary:
      "Browser-first checkout integration with strict callback handling, typed failures, and backend verification.",
    audience: "Frontend engineers",
    lastReviewed: "2026-04-09",
    sections: [
      {
        title: "Install",
        bullets: [
          "npm install etegram-pay-v2",
          "Use in client-side components only for SSR frameworks.",
          "Do not expose private verification logic in browser code."
        ]
      },
      {
        title: "Client Checkout Flow",
        bullets: [
          "Call payWithEtegram with required payload and callbacks.",
          "Handle success/cancel/close states deterministically.",
          "Verify reference on your backend before order fulfillment.",
          "Display user-friendly error feedback for recoverable failures."
        ],
        codeExamples: [
          {
            title: "Next.js client usage",
            language: "tsx",
            code:
              "\"use client\";\n\nimport { payWithEtegram, SDKError } from 'etegram-pay-v2';\n\nexport function PayButton() {\n  const onPay = async () => {\n    try {\n      const result = await payWithEtegram({\n        projectID: process.env.NEXT_PUBLIC_ETEGRAM_PROJECT_ID || '',\n        publicKey: process.env.NEXT_PUBLIC_ETEGRAM_PUBLIC_KEY || '',\n        email: 'user@example.com',\n        phone: '08012345678',\n        amount: 5000,\n        firstname: 'Ada',\n        lastname: 'Lovelace'\n      });\n\n      await fetch('/api/payments/verify', {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify({ reference: result.reference })\n      });\n    } catch (error) {\n      if (error instanceof SDKError) {\n        console.error(error.code, error.message);\n      }\n    }\n  };\n\n  return <button onClick={onPay}>Pay now</button>;\n}"
          }
        ]
      },
      {
        title: "Frontend Readiness Checklist",
        checklist: [
          "Only allowed checkout hosts are accepted by runtime validators.",
          "PostMessage handlers validate origin and frame source.",
          "No unsafe DOM injection patterns in checkout UI code.",
          "Analytics logs include reference and outcome status."
        ]
      }
    ]
  },
  {
    slug: "go",
    title: "Go",
    summary:
      "Backend-first Go integration for initialize, verify, secure retries, and webhook signature verification.",
    audience: "Go backend engineers",
    lastReviewed: "2026-04-09",
    sections: [
      {
        title: "Quick Start",
        bullets: [
          "Typed initialize and verify methods with context support.",
          "Structured SDKError and correlation fields.",
          "Safe retries for verify only and webhook signature verification helper."
        ],
        codeExamples: [
          {
            title: "Initialize and verify with Go SDK",
            language: "go",
            code:
              "client := etegram.NewClient(\"\", nil)\n\ninitResult, err := client.InitializePayment(ctx, etegram.InitializePaymentRequest{\n  ProjectID: \"project_id\",\n  PublicKey: \"public_key\",\n  Email: \"user@example.com\",\n  Phone: \"08012345678\",\n  Amount: 5000,\n  Currency: \"NGN\",\n  FirstName: \"Ada\",\n  LastName: \"Lovelace\",\n})\nif err != nil {\n  return err\n}\n\n_, err = client.VerifyTransaction(ctx, initResult.Reference)\nif err != nil {\n  return err\n}"
          }
        ]
      },
      {
        title: "Production Checklist",
        checklist: [
          "Run go test -race in CI.",
          "Set explicit HTTP timeout and retry budgets.",
          "Enforce signature verification on webhook endpoints.",
          "Use structured logging with reference and correlation IDs."
        ]
      }
    ]
  },
  {
    slug: "flutter",
    title: "Flutter",
    summary:
      "Flutter checkout integration with deterministic event stream and callback mapping for mobile redirects.",
    audience: "Flutter engineers",
    lastReviewed: "2026-04-09",
    sections: [
      {
        title: "Quick Start",
        bullets: [
          "Initialize payment using typed request models.",
          "Open hosted checkout through controller.",
          "Map deep-link callback URL to success/cancel/error events."
        ],
        codeExamples: [
          {
            title: "Initialize and open checkout",
            language: "dart",
            code:
              "final client = EtegramClient();\nfinal checkout = CheckoutController();\n\ncheckout.events.listen((event) {\n  // handle open, success, cancel, error, close\n});\n\nfinal init = await client.initializePayment(\n  InitializePaymentRequest(\n    projectId: 'project_id',\n    publicKey: 'public_key',\n    amount: 5000,\n    currency: 'NGN',\n    email: 'user@example.com',\n    phone: '08012345678',\n    firstName: 'Ada',\n    lastName: 'Lovelace',\n    callbackUrl: 'myapp://payment',\n  ),\n);\n\nawait checkout.openCheckout(init);"
          }
        ]
      },
      {
        title: "Production Checklist",
        checklist: [
          "Validate callback scheme and host allowlist.",
          "Test foreground/background app transitions during checkout.",
          "Dispose stream controllers on teardown.",
          "Verify final payment status server-side before unlock/fulfillment."
        ]
      }
    ]
  },
  {
    slug: "react-native",
    title: "React Native",
    summary:
      "React Native integration path for typed initialize calls and secure checkout URL launching.",
    audience: "React Native engineers",
    lastReviewed: "2026-04-09",
    sections: [
      {
        title: "Quick Start",
        bullets: [
          "Initialize transaction with project credentials.",
          "Open authorization URL with React Native Linking.",
          "Verify transaction from backend using reference."
        ],
        codeExamples: [
          {
            title: "Initialize and open checkout",
            language: "ts",
            code:
              "import { initializePayment, openCheckout } from '@etegram/react-native-sdk';\n\nconst init = await initializePayment({\n  projectID: 'project_id',\n  publicKey: 'public_key',\n  email: 'user@example.com',\n  phone: '08012345678',\n  amount: 5000,\n  currency: 'NGN',\n  firstname: 'Ada',\n  lastname: 'Lovelace'\n});\n\nawait openCheckout(init.authorizationUrl);"
          }
        ]
      },
      {
        title: "Production Checklist",
        checklist: [
          "Validate URL host allowlist before opening checkout URL.",
          "Handle app state restoration after deep link return.",
          "Ensure Hermes and JSC test coverage if both runtimes are supported.",
          "Use backend verification for final payment state."
        ]
      }
    ]
  },
  {
    slug: "kotlin",
    title: "Kotlin",
    summary:
      "Kotlin setup for typed initialize flow, secure reference generation, and lifecycle-safe callback processing.",
    audience: "Android native engineers",
    lastReviewed: "2026-04-09",
    sections: [
      {
        title: "Quick Start",
        bullets: [
          "Use EtegramClient to initialize payment from app or backend layer.",
          "Validate callback URL handling in lifecycle events.",
          "Keep verification and final order updates server-authoritative."
        ],
        codeExamples: [
          {
            title: "Initialize with Kotlin SDK",
            language: "kotlin",
            code:
              "val client = EtegramClient()\nval result = client.initializePayment(\n  InitializePaymentRequest(\n    projectId = \"project_id\",\n    publicKey = \"public_key\",\n    email = \"user@example.com\",\n    phone = \"08012345678\",\n    amount = 5000,\n    currency = \"NGN\",\n    firstName = \"Ada\",\n    lastName = \"Lovelace\"\n  )\n)"
          }
        ]
      },
      {
        title: "Production Checklist",
        checklist: [
          "Instrument tests cover activity recreation and deep-link return.",
          "Coroutines/Flow usage avoids lifecycle leaks.",
          "Network errors map to structured SDKError responses.",
          "Order mutation is gated by backend verification."
        ]
      }
    ]
  },
  {
    slug: "swift",
    title: "Swift",
    summary:
      "Swift Package integration with async initialize APIs, callback routing, and backend-authoritative verification.",
    audience: "iOS native engineers",
    lastReviewed: "2026-04-09",
    sections: [
      {
        title: "Quick Start",
        bullets: [
          "Use async initialize APIs from app networking layer.",
          "Route callback and status handling through app coordinator.",
          "Use backend verification for final payment confirmation."
        ],
        codeExamples: [
          {
            title: "Initialize with Swift SDK",
            language: "swift",
            code:
              "let client = EtegramClient()\nlet result = try await client.initializePayment(\n  InitializePaymentRequest(\n    projectID: \"project_id\",\n    publicKey: \"public_key\",\n    email: \"user@example.com\",\n    phone: \"08012345678\",\n    amount: 5000,\n    currency: \"NGN\",\n    firstname: \"Ada\",\n    lastname: \"Lovelace\"\n  )\n)"
          }
        ]
      },
      {
        title: "Production Checklist",
        checklist: [
          "Handle app background/foreground transitions in checkout lifecycle.",
          "Map SDK errors into user-safe presentation and telemetry.",
          "Test deep-link callback flow on real devices.",
          "Keep fulfillment logic server-side."
        ]
      }
    ]
  },
  {
    slug: "python",
    title: "Python",
    summary:
      "Sync and async Python backend integration with model validation, retries, and verification workflows.",
    audience: "Python backend engineers",
    lastReviewed: "2026-04-09",
    sections: [
      {
        title: "Quick Start",
        bullets: [
          "Choose EtegramClient or AsyncEtegramClient based on stack.",
          "Validate payloads using typed models.",
          "Handle verify retry logic for transient network failures."
        ],
        codeExamples: [
          {
            title: "Sync client usage",
            language: "python",
            code:
              "from etegram_sdk import EtegramClient, InitializePaymentRequest\n\nclient = EtegramClient()\nresult = client.initialize_payment(\n    InitializePaymentRequest(\n        projectID=\"project_id\",\n        publicKey=\"public_key\",\n        email=\"user@example.com\",\n        phone=\"08012345678\",\n        amount=5000,\n        currency=\"NGN\",\n        firstname=\"Ada\",\n        lastname=\"Lovelace\",\n    )\n)\n\nverified = client.verify_transaction(result.reference)\nclient.close()"
          }
        ]
      },
      {
        title: "Production Checklist",
        checklist: [
          "Run pytest and static type checks in CI.",
          "Set HTTP timeouts and retry ceilings explicitly.",
          "Keep webhook and verification handlers idempotent.",
          "Use reference values as correlation IDs across logs and queue jobs."
        ]
      }
    ]
  },
  {
    slug: "migration-changelog",
    title: "Migration and Changelog",
    summary:
      "Release migration policy, compatibility practices, and rollout safeguards for every SDK/plugin track.",
    audience: "SDK maintainers and integrators",
    lastReviewed: "2026-04-09",
    sections: [
      {
        title: "Migration Checklist",
        bullets: [
          "Review amount and currency contract updates.",
          "Map callback event names to current SDK conventions.",
          "Run sandbox verification for checkout, webhook, and retries.",
          "Communicate deprecations one minor version ahead."
        ]
      },
      {
        title: "Release Safety Gates",
        checklist: [
          "Docs examples compile or run in CI.",
          "Breaking changes include migration notes and fallback path.",
          "Webhook/auth sections remain consistent with current API reference.",
          "Version matrix is updated before publish."
        ]
      }
    ]
  },
  {
    slug: "api-reference",
    title: "API Reference",
    summary:
      "Endpoint and payload index for initialize, verify, and webhook event handling in production environments.",
    audience: "API consumers",
    lastReviewed: "2026-04-09",
    sections: [
      {
        title: "Reference Index",
        bullets: [
          "Initialize endpoint and request/response fields.",
          "Verify endpoint and status reconciliation.",
          "Webhook payload structure and event type map.",
          "Error field definitions and retry semantics."
        ]
      },
      {
        title: "Canonical Fields",
        bullets: [
          "projectID/publicKey for initialize authorization.",
          "amount/currency/email/phone/firstname/lastname required for checkout creation.",
          "reference required for verification and event reconciliation.",
          "status/event/environment fields for webhook processing decisions."
        ],
        checklist: [
          "Field names are consistent across SDK docs.",
          "All examples include reference-driven reconciliation.",
          "Validation constraints are explicit in integration pages."
        ]
      }
    ]
  }
];

export function getDocPage(slug: string): DocPage | undefined {
  return docsPages.find((page) => page.slug === slug);
}
