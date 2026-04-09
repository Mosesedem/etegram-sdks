# Etegram Kotlin SDK

Kotlin SDK baseline for initialize flow, typed models, secure reference generation, and structured errors.

## Included in this package

- Gradle Kotlin/JVM setup
- `InitializePaymentRequest`, `InitializeResult`, `VerifyResult`
- `SDKError`
- `generateTransactionReference`
- `EtegramClient` initialize implementation with validation and allowlist check

## Quick usage

```kotlin
val client = EtegramClient()
val result = client.initializePayment(
	InitializePaymentRequest(
		projectId = "project_id",
		publicKey = "public_key",
		email = "user@example.com",
		phone = "08012345678",
		amount = 5000,
		currency = "NGN",
		firstName = "Ada",
		lastName = "Lovelace",
	)
)
```
