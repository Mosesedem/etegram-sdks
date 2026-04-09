# Etegram Documentation UI Build Plan (Next.js)

Date: 2026-04-09
Owner: SDK Team
Status: Active

## Objective

Build a frontend-first documentation portal in Next.js that documents all Etegram integrations and SDKs with a shared API/auth/webhook foundation.

## Scope Order (Priority)

1. WordPress Forms plugin
2. WooCommerce plugin
3. JavaScript/TypeScript SDK
4. Go SDK
5. Flutter SDK
6. React Native SDK
7. Kotlin SDK
8. Swift SDK
9. Python SDK

## Product Principles

1. Contract-first: one canonical API/auth/webhook source for all pages.
2. Integration-first: each framework has complete, runnable setup and flow docs.
3. Parity: every SDK page follows the same section template.
4. Security clarity: webhook validation, auth usage, and callback handling are explicit.

## Information Architecture

1. Home
2. Getting Started
3. Core API
4. Webhooks and Security
5. WordPress Forms
6. WooCommerce
7. JavaScript and TypeScript
8. Go
9. Flutter
10. React Native
11. Kotlin
12. Swift
13. Python
14. Migration and Changelog
15. API Reference

## Required Section Template (Per Integration)

1. Install
2. Quick Start
3. Initialize Payment
4. Checkout Flow
5. Verify Transaction
6. Webhook Handling
7. Error Handling
8. Sandbox Testing
9. Production Checklist
10. Full Example

## Technical Stack

1. Next.js App Router + TypeScript.
2. MDX-based content in local docs folder.
3. Shared layout with persistent sidebar and mobile nav.
4. Search-ready structure (phase 2 add-on).
5. Static-friendly deployment on Vercel.

## Build Phases

### Phase 1: Foundation

1. Scaffold Next.js app in ui.
2. Add global layout, sidebar, and navigation model.
3. Add Home and Core pages.
4. Add version and package matrix panel.

### Phase 2: Core Content

1. Author Core API pages for authentication, initialize, verify.
2. Author webhook and security page from current handler model.
3. Define canonical field/event tables reused by all docs.

### Phase 3: Integration Pages

1. Create WordPress Forms and WooCommerce docs first.
2. Add SDK pages for JS/TS, Go, Flutter, RN, Kotlin, Swift, Python.
3. Add language-specific examples and implementation notes.

### Phase 4: Hardening

1. Add lint and link-check scripts.
2. Add snippet validation workflow in CI.
3. Add docs contribution checklist and review gates.

### Phase 5: Launch

1. Run QA for nav, links, responsiveness, readability.
2. Publish docs app.
3. Monitor feedback and iterate.

## Content Sources

1. Root README and PRD.
2. Package READMEs under packages.
3. WordPress plugin and WooCommerce docs files.
4. Existing Etegram ReadMe webhook/auth references.

## Acceptance Criteria

1. All listed frameworks/plugins have published pages.
2. Core API, auth, and webhook docs are consistent across pages.
3. Responsive docs UX works on desktop and mobile.
4. No dead links in primary nav and integration pages.
5. CI checks pass for docs build and lint.

## Immediate Execution Tasks

1. Create ui app scaffold.
2. Build docs shell and route map.
3. Populate initial pages for all integrations.
4. Add progress tracking and start implementation commits.
