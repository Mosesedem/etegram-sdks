# Etegram Multi-SDK Build PRD

Date: 2026-04-09
Owner: SDK Team
Scope: JavaScript hardening + Flutter, React Native, Kotlin, Swift, Go, TypeScript, Python SDKs

## 1. Current SDK Review (Findings First)

### Critical

1. Insecure DOM injection path via innerHTML for payment iframe construction.

- Evidence: [dist/index.ts](dist/index.ts#L84), [dist/index.ts](dist/index.ts#L104)
- Risk: XSS/injection surface if any upstream value ever becomes untrusted; weakens browser security posture.
- Required fix: Build DOM nodes via createElement/setAttribute, never string-build HTML for checkout container.

2. Cross-window message handling lacks origin and source validation.

- Evidence: [dist/index.ts](dist/index.ts#L118), [dist/index.ts](dist/index.ts#L119)
- Risk: Any frame/script can post closeIframe and interfere with checkout lifecycle.
- Required fix: Validate event.origin against allowlist and verify event.source equals checkout iframe.contentWindow.

3. Public API silently fails with undefined return on error/decline paths.

- Evidence: [dist/index.ts](dist/index.ts#L79), [dist/index.ts](dist/index.ts#L80)
- Risk: Integrators cannot reliably detect failure; hard to recover or instrument.
- Required fix: Return typed result object or throw typed SDK errors consistently.

### High

4. Non-cryptographic reference generation.

- Evidence: [dist/index.ts](dist/index.ts#L31), [dist/index.ts](dist/index.ts#L35)
- Risk: Collision or predictability under load.
- Required fix: Use crypto.getRandomValues (web) and secure random APIs per language.

5. Error handling loses server context.

- Evidence: [dist/index.ts](dist/index.ts#L67), [dist/index.ts](dist/index.ts#L68), [dist/index.ts](dist/index.ts#L72)
- Risk: Integrators cannot troubleshoot failed initialization quickly.
- Required fix: Propagate status code, provider error code, and message in structured error.

6. Potential event-listener accumulation and lifecycle leak.

- Evidence: [dist/index.ts](dist/index.ts#L117)
- Risk: Multiple calls can accumulate handlers and cause duplicate behavior.
- Required fix: Register per-session handler with teardown on resolve/reject/close.

### Medium

7. Type contract mismatch for amount.

- Evidence: [dist/index.d.ts](dist/index.d.ts#L5)
- Risk: Amount typed as string can cause inconsistent serialization/validation across SDKs.
- Required fix: Standardize amount as integer minor units or decimal string by explicit spec.

8. Unused variables and dead branches reduce maintainability.

- Evidence: [dist/index.ts](dist/index.ts#L76), [dist/index.ts](dist/index.ts#L120)
- Risk: Confusing behavior and lower confidence in SDK quality.
- Required fix: Remove dead code and enforce lint/test gates.

9. README usage sample is syntactically invalid/incomplete.

- Evidence: [README.md](README.md#L25)
- Risk: Broken first-run experience and support burden.
- Required fix: Replace with tested examples and copy-paste-safe snippets.

## 2. Problem Statement

Etegram currently has a JavaScript-first SDK with limited typing guarantees and no shared cross-platform contract. We need a production-grade SDK suite for mobile, backend, and frontend platforms with identical payment semantics, robust error handling, and a maintainable release process.

## 3. Goals

1. Deliver 7 SDK tracks: Flutter, React Native, Kotlin, Swift, Go, TypeScript improvements, Python.
2. Define one canonical API contract used across all languages.
3. Ensure secure checkout lifecycle and deterministic callback behavior.
4. Ship with CI, tests, semantic versioning, and documentation parity.

## 4. Non-Goals

1. Re-architecting Etegram payment backend endpoints.
2. Merchant dashboard/UI redesign.
3. Supporting legacy runtime versions outside agreed support matrix.

## 5. Product Requirements

### Functional Requirements

1. Initialize transaction endpoint wrapper.
2. Hosted checkout launch flow (where platform supports webview/browser redirect).
3. Payment status callbacks/events with standardized status enum.
4. Optional transaction verification helper.
5. Idempotent transaction reference handling.
6. Structured error model.

### Non-Functional Requirements

1. Security: origin checks, URL allowlists, strict input validation.
2. Reliability: retry policy only for safe operations; idempotent behavior.
3. Performance: init call overhead < 100ms excluding network on median devices.
4. Observability: correlation id/reference in all error/success payloads.
5. DX: typed APIs, examples, migration guides.

## 6. Canonical Cross-SDK Contract (Single Source of Truth)

### Request: InitializePayment

- projectId: string
- publicKey: string
- amount: number (minor units) OR decimalAmount: string (choose one in RFC)
- currency: string (ISO-4217)
- email: string
- phone: string
- firstName: string
- lastName: string
- reference: string (optional, SDK generates secure one if omitted)
- metadata: map<string, any> (optional)
- callbackUrl: string (optional)

### Response: InitializeResult

- authorizationUrl: string
- reference: string
- expiresAt: string (ISO datetime, optional)

### Event Model

- onOpen
- onSuccess(reference, providerPayload)
- onCancel(reference?)
- onError(SDKError)
- onClose(reason)

### Error Model

- code: string
- message: string
- httpStatus: number (optional)
- providerCode: string (optional)
- reference: string (optional)
- retryable: boolean

## 7. Platform-by-Platform Build Plan

### 7.1 TypeScript Support for Current JS SDK (Foundation Track)

Deliverables:

1. Rewrite source in strict TypeScript from src (not dist-only workflow).
2. Expose fully typed public API and discriminated union return types.
3. Replace innerHTML injection with safe DOM creation.
4. Add checkout session manager to control listeners and teardown.
5. Publish ESM + CJS + d.ts with exports map.

Acceptance Criteria:

1. No any in public API.
2. 90%+ unit coverage for core module.
3. Browser compatibility matrix documented.
4. README examples compile in CI.

Estimated duration: 1.5 to 2 weeks.

### 7.2 Flutter SDK

Approach:

1. Dart package with platform channels only if needed; prefer pure Dart + url_launcher/webview_flutter.
2. Provide openCheckout method and stream-based event callbacks.
3. Strong null-safe models and sealed-style result wrappers.

Deliverables:

1. pub package scaffold.
2. typed models, client, checkout controller.
3. example app (Android+iOS).
4. integration tests for callback handling.

Acceptance Criteria:

1. Works on Flutter stable latest minus 1.
2. Deterministic callback sequence in success/cancel/error.
3. Lints and tests pass in CI.

Estimated duration: 2 to 3 weeks.

### 7.3 React Native SDK

Approach:

1. TypeScript-first package.
2. Default integration via in-app browser/webview with deep-link callback.
3. Optional native module wrapper for advanced control.

Deliverables:

1. RN package with autolinking support.
2. typed hooks + imperative API.
3. Expo-compatible path documented.
4. sample apps for Expo and bare RN.

Acceptance Criteria:

1. iOS and Android parity on checkout events.
2. Works in both Hermes and JSC environments.
3. End-to-end test flow in sample apps.

Estimated duration: 2 to 3 weeks.

### 7.4 Kotlin SDK (Android Native)

Approach:

1. Kotlin library module (Maven publish).
2. Coroutines + Flow for event stream.
3. Checkout via Custom Tabs or WebView with secure callback filtering.

Deliverables:

1. API client and checkout manager.
2. sealed Result/Error types.
3. sample Android app.
4. Dokka docs.

Acceptance Criteria:

1. Min SDK and target SDK support matrix documented.
2. Thread-safe API and lifecycle-safe callbacks.
3. Instrumented tests for activity recreation.

Estimated duration: 2 weeks.

### 7.5 Swift SDK (iOS Native)

Approach:

1. Swift Package Manager package.
2. async/await API plus delegate callbacks.
3. ASWebAuthenticationSession or WKWebView strategy by product decision.

Deliverables:

1. iOS client and checkout coordinator.
2. Codable models and Swift Error mappings.
3. sample SwiftUI app.
4. DocC docs.

Acceptance Criteria:

1. iOS support matrix defined (e.g., iOS 14+).
2. App lifecycle resilience (background/foreground).
3. Callback and cancellation behavior deterministic.

Estimated duration: 2 weeks.

### 7.6 Go SDK

Approach:

1. net/http based client library with context-aware APIs.
2. Server-to-server focus: initialize, verify, webhooks helper.
3. Optional helper to generate signed references/metadata where needed.

Deliverables:

1. Go module with idiomatic package layout.
2. Typed structs and custom error types.
3. retry/backoff policy for transient HTTP errors.
4. examples for Gin/Fiber/net/http.

Acceptance Criteria:

1. Race-safe tests and go test -race clean.
2. 90%+ coverage on transport and error mapping.
3. Semantic import versioning policy documented.

Estimated duration: 1.5 to 2 weeks.

### 7.7 Python SDK

Approach:

1. Python package with sync and async clients.
2. Pydantic models for strict validation (or dataclasses if minimal deps preferred).
3. Webhook verification helpers for FastAPI/Flask/Django examples.

Deliverables:

1. pip package with pyproject.toml.
2. typed API, errors, and retry behavior.
3. examples and pytest suite.
4. docs hosted (MkDocs/Sphinx).

Acceptance Criteria:

1. Supports Python versions per policy (e.g., 3.9+).
2. MyPy clean for public package surface.
3. Twine publish checks pass.

Estimated duration: 2 weeks.

## 8. Shared Architecture and Reuse Strategy

1. Create a language-agnostic OpenAPI or JSON schema contract for initialize/verify/event payloads.
2. Generate models where practical; hand-write checkout lifecycle logic per platform.
3. Keep conformance tests identical across SDKs using golden payload fixtures.
4. Maintain centralized test vectors for signatures, references, and error mapping.

## 9. Security Requirements (All SDKs)

1. Use secure random generation APIs for references.
2. Validate checkout URL host allowlist.
3. Validate callback origin/deep-link scheme.
4. Never log full secrets/public keys with PII.
5. Provide redaction utilities for logs.

## 10. Testing Strategy

1. Contract tests against mocked API responses.
2. Integration tests against Etegram sandbox.
3. Negative tests for malformed payloads and timeout scenarios.
4. Mobile lifecycle tests: app pause/resume/rotation.
5. Backward-compat tests for previous minor versions.

## 11. CI/CD and Release Plan

1. Mono-repo with per-SDK package directories or polyrepo with shared spec submodule.
2. PR gates: lint, unit, integration (sandbox), docs snippet compile checks.
3. Semantic versioning with conventional commits and changelog generation.
4. Signed releases and provenance metadata where ecosystem supports it.
5. Publish automation:

- npm for JS/TS and RN
- pub.dev for Flutter
- Maven Central/GitHub Packages for Kotlin
- Swift Package index tagging for Swift
- Go proxy via git tags
- PyPI for Python

## 12. Milestones and Timeline (Recommended)

Phase 0 (Week 1): Foundation

1. Finalize canonical contract.
2. Fix critical JS issues.
3. Establish CI templates and test harness.

Phase 1 (Weeks 2-3): Core Tracks

1. TypeScript hardening release.
2. Go SDK beta.
3. Python SDK beta.

Phase 2 (Weeks 3-5): Mobile Cross-Platform

1. Flutter beta.
2. React Native beta.

Phase 3 (Weeks 5-7): Native Mobile

1. Kotlin beta.
2. Swift beta.

Phase 4 (Week 8): GA Readiness

1. Cross-SDK conformance sign-off.
2. Documentation and migration guides complete.
3. Public launch.

## 13. Team and Ownership

1. Tech Lead: contract governance + architecture.
2. SDK Engineers: platform implementation owners.
3. QA Engineer: conformance, sandbox and E2E tests.
4. DevRel/Docs: examples, onboarding, migration.

## 14. Risks and Mitigations

1. Risk: Inconsistent callback semantics across SDKs.

- Mitigation: Shared event state machine + conformance tests.

2. Risk: Mobile webview differences break close/success detection.

- Mitigation: Fallback strategies and platform-specific adapters.

3. Risk: Drifting API fields from backend changes.

- Mitigation: Contract versioning and backward-compatible deprecation policy.

## 15. Success Metrics

1. Time-to-first-payment under 30 minutes for new integrators.
2. SDK issue rate below agreed threshold after GA.
3. 99.9% successful init call handling (excluding provider-side failures).
4. Documentation sample success rate: 100% in CI compile/run checks.

## 16. Immediate Next Actions (Execution Checklist)

1. Approve canonical amount strategy (minor units vs decimal string).
2. Approve callback model and status enums.
3. Open implementation epic and 7 platform workstreams.
4. Ship TypeScript hardening release before starting other SDK betas.
5. Start Go and Python first for fastest server-side adoption.
