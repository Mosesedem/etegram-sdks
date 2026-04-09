# Etegram React Native SDK

TypeScript-first React Native SDK for Etegram initialize and verify flows.

## Included in this package

- Typed request/response models and `SDKError`
- `initializePayment` API wrapper
- `openCheckout` URL launcher using React Native Linking
- `verifyTransaction` helper

## Quick usage

```ts
import { initializePayment, openCheckout } from "@etegram/react-native-sdk";

const init = await initializePayment({
  projectID: "project_id",
  publicKey: "public_key",
  email: "user@example.com",
  phone: "08012345678",
  amount: 5000,
  currency: "NGN",
  firstname: "Ada",
  lastname: "Lovelace",
});

await openCheckout(init.authorizationUrl);
```
