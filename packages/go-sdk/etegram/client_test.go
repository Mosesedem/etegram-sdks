package etegram

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

func TestInitializePayment_Success(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Correlation-Id", "corr-init-1")
		_, _ = w.Write([]byte(`{"message":"Authorization URL created","data":{"authorization_url":"https://checkout.etegram.com/pay/1","reference":"ETGABC","expires_at":"2030-01-01T00:00:00Z"}}`))
	}))
	defer ts.Close()

	client := NewClientWithConfig(ClientConfig{BaseURL: ts.URL, HTTPClient: ts.Client()})
	result, err := client.InitializePayment(context.Background(), InitializePaymentRequest{
		ProjectID: "project",
		PublicKey: "pk_test",
		Email:     "user@example.com",
		Phone:     "0801",
		Amount:    1000,
		Currency:  "NGN",
		FirstName: "Ada",
		LastName:  "Lovelace",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.AuthorizationURL == "" {
		t.Fatal("expected authorization URL")
	}
	if result.Reference != "ETGABC" {
		t.Fatalf("expected reference from payload, got %s", result.Reference)
	}
	if result.CorrelationID != "corr-init-1" {
		t.Fatalf("expected correlation id, got %s", result.CorrelationID)
	}
}

func TestVerifyTransaction_RetriesOnServerError(t *testing.T) {
	var calls int32
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		current := atomic.AddInt32(&calls, 1)
		w.Header().Set("Content-Type", "application/json")
		if current == 1 {
			w.WriteHeader(http.StatusInternalServerError)
			_, _ = w.Write([]byte(`{"message":"temporary failure","code":"TEMP"}`))
			return
		}
		w.Header().Set("X-Correlation-Id", "corr-verify-1")
		_, _ = w.Write([]byte(`{"message":"ok","data":{"reference":"ETG1","status":"success","message":"verified"}}`))
	}))
	defer ts.Close()

	client := NewClientWithConfig(ClientConfig{
		BaseURL:          ts.URL,
		HTTPClient:       ts.Client(),
		VerifyMaxRetries: 1,
		RetryBaseDelay:   5 * time.Millisecond,
	})

	result, err := client.VerifyTransaction(context.Background(), "project", "pk_test", "ETG1")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.Status != "success" {
		t.Fatalf("expected success status, got %s", result.Status)
	}
	if atomic.LoadInt32(&calls) != 2 {
		t.Fatalf("expected 2 attempts, got %d", calls)
	}
}

func TestVerifyTransaction_ContextCancelDuringRetry(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"message":"temporary failure"}`))
	}))
	defer ts.Close()

	client := NewClientWithConfig(ClientConfig{
		BaseURL:          ts.URL,
		HTTPClient:       ts.Client(),
		VerifyMaxRetries: 3,
		RetryBaseDelay:   100 * time.Millisecond,
	})

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := client.VerifyTransaction(ctx, "project", "pk_test", "ETG1")
	if err == nil {
		t.Fatal("expected context cancellation error")
	}

	var sdkErr *SDKError
	if !errors.As(err, &sdkErr) {
		t.Fatalf("expected SDKError, got %T", err)
	}
	if sdkErr.Code != "VERIFY_RETRY_CANCELLED" {
		t.Fatalf("expected VERIFY_RETRY_CANCELLED, got %s", sdkErr.Code)
	}
}
