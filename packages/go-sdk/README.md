# Etegram Go SDK

Production-ready Go client for Etegram initialize and verify payment flows.

## Features

- Typed initialize and verify APIs
- Structured SDKError with HTTP status, provider code, reference, and correlation ID
- Secure reference generation using crypto/rand
- Safe retry policy for verify calls only (idempotent GET)
- Webhook signature verification helper (HMAC-SHA256)

## Install

```bash
go get github.com/mosesedem/etegram-sdks/packages/go-sdk
```

## Usage

```go
package main

import (
  "context"
  "fmt"

  "github.com/mosesedem/etegram-sdks/packages/go-sdk/etegram"
)

func main() {
  client := etegram.NewClient("", nil)

  initResult, err := client.InitializePayment(context.Background(), etegram.InitializePaymentRequest{
    ProjectID: "project_id",
    PublicKey: "public_key",
    Email: "user@example.com",
    Phone: "08012345678",
    Amount: 5000,
    Currency: "NGN",
    FirstName: "Ada",
    LastName: "Lovelace",
  })
  if err != nil {
    panic(err)
  }

  fmt.Println(initResult.AuthorizationURL, initResult.Reference)
}
```

## Webhook Verification

```go
if err := etegram.VerifyWebhookSignature(secret, payloadBytes, signatureHeader); err != nil {
  // reject webhook
}
```
