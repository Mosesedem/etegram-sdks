package etegram

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"testing"
)

func TestVerifyWebhookSignature_Valid(t *testing.T) {
	secret := "whsec_123"
	payload := []byte(`{"event":"payment.success"}`)
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write(payload)
	sig := hex.EncodeToString(mac.Sum(nil))

	if err := VerifyWebhookSignature(secret, payload, sig); err != nil {
		t.Fatalf("expected valid signature, got %v", err)
	}
}

func TestVerifyWebhookSignature_Invalid(t *testing.T) {
	secret := "whsec_123"
	payload := []byte(`{"event":"payment.success"}`)

	err := VerifyWebhookSignature(secret, payload, "bad")
	if err == nil {
		t.Fatal("expected signature verification error")
	}
}
