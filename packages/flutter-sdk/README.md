# Etegram Flutter SDK

Flutter SDK for Etegram initialize + hosted checkout flow with deterministic lifecycle events.

## Features

- Null-safe typed request and result models
- Secure transaction reference generation
- Initialize payment via Etegram API
- Checkout controller with event stream: open, success, cancel, error, close
- Callback handler for deep-link/web callback status mapping

## Add Dependency

```yaml
dependencies:
	etegram_flutter_sdk:
		path: ../packages/flutter-sdk
```

## Quick Start

```dart
import 'package:etegram_flutter_sdk/etegram_flutter_sdk.dart';

final client = EtegramClient();
final checkout = CheckoutController();

checkout.events.listen((event) {
	// handle event.type and event.reference
});

final result = await client.initializePayment(
	InitializePaymentRequest(
		projectId: 'project_id',
		publicKey: 'public_key',
		amount: 5000,
		currency: 'NGN',
		email: 'user@example.com',
		phone: '08012345678',
		firstName: 'Ada',
		lastName: 'Lovelace',
		callbackUrl: 'myapp://payment',
	),
);

await checkout.openCheckout(result);
```

## Handle Callback

When your app receives a redirect/deep link callback, pass it to the controller:

```dart
checkout.handleCallback(Uri.parse('myapp://payment?status=success&reference=ETG123'));
```

## Production Notes

- Use HTTPS callback URLs where possible.
- Restrict accepted callback schemes/hosts in app routing.
- Do not log secrets or full card/payment payloads.
- Always close HTTP clients and dispose checkout streams on teardown.
