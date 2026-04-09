package etegram

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"strings"
)

func VerifyWebhookSignature(secret string, payload []byte, signature string) error {
	if strings.TrimSpace(secret) == "" {
		return &SDKError{Code: "INVALID_WEBHOOK_SECRET", Message: "webhook secret is required"}
	}
	if len(payload) == 0 {
		return &SDKError{Code: "INVALID_WEBHOOK_PAYLOAD", Message: "webhook payload is required"}
	}
	if strings.TrimSpace(signature) == "" {
		return &SDKError{Code: "INVALID_WEBHOOK_SIGNATURE", Message: "webhook signature is required"}
	}

	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write(payload)
	expected := hex.EncodeToString(mac.Sum(nil))
	sig := normalizeSignature(signature)

	if !hmac.Equal([]byte(expected), []byte(sig)) {
		return &SDKError{Code: "WEBHOOK_SIGNATURE_MISMATCH", Message: "webhook signature verification failed"}
	}

	return nil
}

func normalizeSignature(signature string) string {
	s := strings.TrimSpace(signature)
	if strings.HasPrefix(strings.ToLower(s), "sha256=") {
		return s[len("sha256="):]
	}
	return s
}
