# Etegram SDK Build Progress

Last updated: 2026-04-09

## Overall Status

- Phase 0: In progress
- Foundation track (TypeScript hardening of current JS SDK): In progress
- Multi-SDK scaffolding (Go, Python, Flutter, RN, Kotlin, Swift): In progress
- Go SDK production track: Completed
- Flutter SDK production track: Completed
- Python SDK production track: In progress
- React Native SDK baseline track: Completed
- Kotlin SDK baseline track: Completed
- Swift SDK baseline track: Completed

## Plan

1. Finalize canonical contract decisions

- Amount strategy: pending product decision (`amount` in minor units vs `decimalAmount` string)
- Event/status enums: pending approval
- Error code taxonomy: in draft

2. Ship TypeScript hardening baseline (current package)

- [x] Rewrite source in strict TypeScript from `src` entry (`src/index.ts`)
- [x] Remove unsafe DOM `innerHTML` usage in checkout rendering
- [x] Add origin + source validation for cross-window messages
- [x] Replace insecure reference generation with cryptographic randomness
- [x] Standardize failure behavior (typed errors/results, no silent `undefined`)
- [x] Improve server error context propagation
- [x] Ensure listener teardown to prevent lifecycle leaks
- [x] Fix public type definitions (`amount` consistency and return type)
- [x] Repair README sample so it is copy-paste-safe
- [x] Add lifecycle callbacks (`onOpen`, `onSuccess`, `onCancel`, `onError`, `onClose`)
- [x] Add compatibility flags (`onsuccess`, `onclose`)

3. Establish engineering quality gates

- [ ] Add linting and strict TypeScript config
- [ ] Add unit tests for init + checkout session lifecycle
- [ ] Add CI workflow for build + tests + docs snippet validation

6. Publishing readiness

- [x] Define publishing plan and rollback strategy
- [x] Add publish-safe package scripts and exports map
- [x] Restrict published files to distributable artifacts

4. Start server SDK tracks in parallel

- [x] Go SDK skeleton + initialize/verify + typed errors
- [x] Go SDK production hardening (validation, retry policy, webhook verification, tests)
- [x] Python SDK skeleton + sync/async clients + typed models
- [x] Python SDK hardening pass (currency contract, allowlist checks, verify retries, tests)

5. Begin mobile tracks after foundation release

- [x] Flutter production package (typed models, client, checkout controller, tests)
- [x] React Native baseline package (typed API + initialize/open/verify)
- [x] Kotlin baseline package (Gradle module + models + client + errors)
- [x] Swift baseline package (SPM + models + client + errors)

7. CI enforcement

- [x] Add Go + Flutter CI workflow for analyze/test on PRs and pushes

## Work Log

- 2026-04-09: Reviewed current implementation and confirmed PRD findings in existing package code.
- 2026-04-09: Implemented first hardening pass in runtime and declaration files:
  - replaced unsafe checkout DOM injection with safe node creation
  - added origin/source checks for postMessage handling
  - switched reference generation to crypto-backed randomness with fallback
  - introduced structured SDKError and non-silent failure paths
  - added listener teardown and deterministic modal cleanup
  - aligned declaration files and README usage with updated API behavior
- 2026-04-09: Added source-first entrypoint and fixed build execution:
  - created `src/index.ts` as build source
  - updated build command to `tsup src/index.ts --format cjs,esm --dts --clean`
  - validated successful output generation to `dist/index.js`, `dist/index.mjs`, `dist/index.d.ts`, `dist/index.d.mts`
- 2026-04-09: Added lifecycle callback support and publish planning:
  - implemented `onSuccess` and `onClose` callback flags (plus full lifecycle callbacks)
  - added compatibility aliases: `onsuccess`, `onclose`
  - ensured callback handlers are not sent in initialize API payload
  - added publishing runbook in `PUBLISHING_PLAN.md`
  - added package `exports`, `pack:dry-run`, and `prepublishOnly` scripts
  - added package `files` whitelist to prevent shipping internal planning/source files
- 2026-04-09: Next up: add strict TypeScript config, tests, and CI gates.
- 2026-04-09: Started multi-SDK repository build-out:
  - added shared contract seed file at `specs/canonical-contract.json`
  - created Go SDK scaffold at `packages/go-sdk` with:
    - typed request/result models
    - structured `SDKError`
    - secure transaction reference generator
    - initialize and verify client methods
    - baseline unit tests for reference generation
  - validated Go scaffold with `go test ./...` (pass)
  - created Python SDK scaffold at `packages/python-sdk` with:
    - typed pydantic models
    - structured `SDKError`
    - secure transaction reference generator
    - sync and async clients for initialize/verify
  - initialized mobile SDK track directories:
    - `packages/flutter-sdk`
    - `packages/react-native-sdk`
    - `packages/kotlin-sdk`
    - `packages/swift-sdk`
- 2026-04-09: Completed Go SDK production hardening:
  - expanded request contract with `currency` and strengthened field validation
  - added observability fields (`correlationId`) in result and error models
  - implemented safe retry policy for verify (idempotent GET only) with context-aware backoff
  - added webhook signature verification helper (HMAC-SHA256)
  - added comprehensive tests for initialize success, verify retries, retry cancellation, and webhook verification
  - formatted code with gofmt and validated via `go test ./...` (pass)
- 2026-04-09: Completed Flutter SDK production package:
  - added Flutter package manifest and analyzer configuration
  - implemented typed models, structured SDKError, secure reference generation, initialize client, and checkout controller
  - implemented deterministic checkout event stream (`open`, `success`, `cancel`, `error`, `close`)
  - added callback handler for deep-link/web callback mapping
  - added unit tests for reference generation and callback sequencing
  - validated quality gates via `flutter analyze` (pass) and `flutter test` (pass)
- 2026-04-09: Added CI workflow `.github/workflows/go-flutter-ci.yml`:
  - Go: setup-go + `go test ./...`
  - Flutter: setup Flutter + `flutter pub get` + `flutter analyze` + `flutter test`
- 2026-04-09: Applied cross-framework update pass:
  - Flutter:
    - strengthened request validation (`currency` format + callback URL URI check)
    - tightened checkout URL validation (HTTPS + allowlist)
    - expanded callback parsing (`event` aliases) and unknown-status deterministic error handling
    - added callback tests for alias and unknown status paths
    - validated with `flutter test` (pass)
  - Python:
    - expanded contract fields (`currency`, correlation IDs)
    - added checkout URL HTTPS/allowlist validation
    - added safe retry behavior for verify in sync and async clients
    - added injectable HTTP clients and new unit tests for sync/async clients
    - added package-level `pyrightconfig.json`
  - React Native:
    - added package manifest, strict TypeScript config, and typed SDK source
    - implemented initialize/checkout open/verify helpers and structured SDK errors
  - Kotlin:
    - added Gradle module setup and Kotlin source package
    - implemented typed models, secure reference utility, SDKError, and initialize client baseline
  - Swift:
    - added SPM package configuration and source layout
    - implemented Codable models, SDKError, secure reference utility, and async initialize client baseline

## Blockers / Decisions Needed

- Product approval required for canonical amount representation.
- Product approval required for final callback status enum contract.
