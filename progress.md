# Etegram SDK Build Progress

Last updated: 2026-04-09

## Overall Status

- Phase 0: In progress
- Foundation track (TypeScript hardening of current JS SDK): In progress
- Multi-SDK scaffolding (Go, Python, Flutter, RN, Kotlin, Swift): Not started

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

- [ ] Go SDK skeleton + initialize/verify + typed errors
- [ ] Python SDK skeleton + sync/async clients + typed models

5. Begin mobile tracks after foundation release

- [ ] Flutter beta track
- [ ] React Native beta track
- [ ] Kotlin beta track
- [ ] Swift beta track

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

## Blockers / Decisions Needed

- Product approval required for canonical amount representation.
- Product approval required for final callback status enum contract.
