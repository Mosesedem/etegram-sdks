package etegram

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const defaultBaseURL = "https://api-checkout.etegram.com"

type ClientConfig struct {
	BaseURL          string
	HTTPClient       *http.Client
	VerifyMaxRetries int
	RetryBaseDelay   time.Duration
}

type Client struct {
	BaseURL          string
	HTTPClient       *http.Client
	verifyMaxRetries int
	retryBaseDelay   time.Duration
}

func NewClient(baseURL string, httpClient *http.Client) *Client {
	return NewClientWithConfig(ClientConfig{BaseURL: baseURL, HTTPClient: httpClient})
}

func NewClientWithConfig(cfg ClientConfig) *Client {
	baseURL := cfg.BaseURL
	if strings.TrimSpace(baseURL) == "" {
		baseURL = defaultBaseURL
	}

	httpClient := cfg.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 15 * time.Second}
	}

	verifyMaxRetries := cfg.VerifyMaxRetries
	if verifyMaxRetries < 0 {
		verifyMaxRetries = 0
	}

	retryBaseDelay := cfg.RetryBaseDelay
	if retryBaseDelay <= 0 {
		retryBaseDelay = 250 * time.Millisecond
	}

	return &Client{
		BaseURL:          strings.TrimRight(baseURL, "/"),
		HTTPClient:       httpClient,
		verifyMaxRetries: verifyMaxRetries,
		retryBaseDelay:   retryBaseDelay,
	}
}

func (c *Client) InitializePayment(ctx context.Context, req InitializePaymentRequest) (*InitializeResult, error) {
	if strings.TrimSpace(req.ProjectID) == "" {
		return nil, &SDKError{Code: "INVALID_PROJECT_ID", Message: "projectID is required"}
	}
	if strings.TrimSpace(req.PublicKey) == "" {
		return nil, &SDKError{Code: "INVALID_PUBLIC_KEY", Message: "publicKey is required"}
	}
	if req.Amount <= 0 {
		return nil, &SDKError{Code: "INVALID_AMOUNT", Message: "amount must be positive"}
	}
	if strings.TrimSpace(req.Currency) == "" {
		return nil, &SDKError{Code: "INVALID_CURRENCY", Message: "currency is required"}
	}
	if len(req.Currency) != 3 {
		return nil, &SDKError{Code: "INVALID_CURRENCY", Message: "currency must be a 3-letter ISO code"}
	}
	if strings.TrimSpace(req.Email) == "" {
		return nil, &SDKError{Code: "INVALID_EMAIL", Message: "email is required"}
	}
	if strings.TrimSpace(req.Phone) == "" {
		return nil, &SDKError{Code: "INVALID_PHONE", Message: "phone is required"}
	}
	if strings.TrimSpace(req.FirstName) == "" {
		return nil, &SDKError{Code: "INVALID_FIRST_NAME", Message: "firstname is required"}
	}
	if strings.TrimSpace(req.LastName) == "" {
		return nil, &SDKError{Code: "INVALID_LAST_NAME", Message: "lastname is required"}
	}
	if strings.TrimSpace(req.Reference) == "" {
		ref, err := GenerateTransactionReference(20)
		if err != nil {
			return nil, err
		}
		req.Reference = ref
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, &SDKError{Code: "ENCODING_ERROR", Message: "failed to encode initialize payload", Cause: err}
	}

	url := fmt.Sprintf("%s/api/transaction/initialize/%s", c.BaseURL, req.ProjectID)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, &SDKError{Code: "REQUEST_BUILD_FAILED", Message: "failed to build initialize request", Cause: err}
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+req.PublicKey)

	httpRes, err := c.HTTPClient.Do(httpReq)
	if err != nil {
		return nil, &SDKError{Code: "NETWORK_ERROR", Message: "network error during initialize", Retryable: true, Cause: err, Reference: req.Reference}
	}
	defer httpRes.Body.Close()

	rawBody, _ := io.ReadAll(httpRes.Body)
	correlationID := strings.TrimSpace(httpRes.Header.Get("X-Correlation-Id"))
	var envelope initializeResponseEnvelope
	_ = json.Unmarshal(rawBody, &envelope)

	if httpRes.StatusCode < 200 || httpRes.StatusCode >= 300 {
		return nil, &SDKError{
			Code:          "INITIALIZE_FAILED",
			Message:       chooseMessage(envelope.Message, string(rawBody)),
			HTTPStatus:    httpRes.StatusCode,
			ProviderCode:  envelope.Code,
			Reference:     req.Reference,
			Retryable:     httpRes.StatusCode >= 500,
			CorrelationID: correlationID,
			Details:       string(rawBody),
		}
	}

	if strings.TrimSpace(envelope.Data.AuthorizationURL) == "" {
		return nil, &SDKError{Code: "INITIALIZE_INVALID_RESPONSE", Message: "authorization URL was missing", HTTPStatus: httpRes.StatusCode, Reference: req.Reference, CorrelationID: correlationID}
	}
	reference := req.Reference
	if strings.TrimSpace(envelope.Data.Reference) != "" {
		reference = envelope.Data.Reference
	}

	return &InitializeResult{
		AuthorizationURL: envelope.Data.AuthorizationURL,
		Reference:        reference,
		ExpiresAt:        envelope.Data.ExpiresAt,
		CorrelationID:    correlationID,
	}, nil
}

func (c *Client) VerifyTransaction(ctx context.Context, projectID string, publicKey string, reference string) (*VerifyResult, error) {
	if strings.TrimSpace(projectID) == "" {
		return nil, &SDKError{Code: "INVALID_PROJECT_ID", Message: "projectID is required"}
	}
	if strings.TrimSpace(publicKey) == "" {
		return nil, &SDKError{Code: "INVALID_PUBLIC_KEY", Message: "publicKey is required"}
	}
	if strings.TrimSpace(reference) == "" {
		return nil, &SDKError{Code: "INVALID_REFERENCE", Message: "reference is required"}
	}

	url := fmt.Sprintf("%s/api/transaction/verify/%s/%s", c.BaseURL, projectID, reference)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, &SDKError{Code: "REQUEST_BUILD_FAILED", Message: "failed to build verify request", Cause: err, Reference: reference}
	}
	httpReq.Header.Set("Authorization", "Bearer "+publicKey)

	var lastErr error
	for attempt := 0; attempt <= c.verifyMaxRetries; attempt++ {
		httpRes, doErr := c.HTTPClient.Do(httpReq)
		if doErr != nil {
			lastErr = &SDKError{Code: "NETWORK_ERROR", Message: "network error during verify", Retryable: true, Cause: doErr, Reference: reference}
		} else {
			payload, _ := io.ReadAll(httpRes.Body)
			_ = httpRes.Body.Close()
			correlationID := strings.TrimSpace(httpRes.Header.Get("X-Correlation-Id"))

			var envelope verifyResponseEnvelope
			_ = json.Unmarshal(payload, &envelope)

			if httpRes.StatusCode >= 200 && httpRes.StatusCode < 300 {
				respReference := reference
				if strings.TrimSpace(envelope.Data.Reference) != "" {
					respReference = envelope.Data.Reference
				}
				return &VerifyResult{
					Reference:     respReference,
					Status:        envelope.Data.Status,
					Message:       envelope.Data.Message,
					CorrelationID: correlationID,
				}, nil
			}

			lastErr = &SDKError{
				Code:          "VERIFY_FAILED",
				Message:       chooseMessage(envelope.Message, string(payload)),
				HTTPStatus:    httpRes.StatusCode,
				ProviderCode:  envelope.Code,
				Reference:     reference,
				Retryable:     httpRes.StatusCode >= 500,
				CorrelationID: correlationID,
				Details:       string(payload),
			}
		}

		if !isRetryableVerifyError(lastErr) || attempt == c.verifyMaxRetries {
			break
		}

		delay := c.retryBaseDelay * time.Duration(1<<attempt)
		if err := sleepWithContext(ctx, delay); err != nil {
			return nil, &SDKError{Code: "VERIFY_RETRY_CANCELLED", Message: "verify retry was cancelled by context", Retryable: true, Cause: err, Reference: reference}
		}
	}

	return nil, lastErr
}

func chooseMessage(message string, fallback string) string {
	if strings.TrimSpace(message) != "" {
		return message
	}
	if strings.TrimSpace(fallback) != "" {
		return fallback
	}
	return "request failed"
}

func IsSDKError(err error) bool {
	var sdkErr *SDKError
	return errors.As(err, &sdkErr)
}

func isRetryableVerifyError(err error) bool {
	var sdkErr *SDKError
	if errors.As(err, &sdkErr) {
		return sdkErr.Retryable
	}
	return false
}

func sleepWithContext(ctx context.Context, delay time.Duration) error {
	if delay <= 0 {
		return nil
	}

	timer := time.NewTimer(delay)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}
