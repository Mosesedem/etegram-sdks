# Etegram Swift SDK

Swift Package Manager SDK baseline for Etegram initialize flow.

## Included in this package

- `Package.swift` with iOS/macOS support
- Codable request and result models
- `SDKError`
- Secure reference generation utility
- `EtegramClient` async initialize implementation with validation and allowlist check

## Quick usage

```swift
let client = EtegramClient()
let result = try await client.initializePayment(
	InitializePaymentRequest(
		projectID: "project_id",
		publicKey: "public_key",
		email: "user@example.com",
		phone: "08012345678",
		amount: 5000,
		currency: "NGN",
		firstname: "Ada",
		lastname: "Lovelace"
	)
)
```
