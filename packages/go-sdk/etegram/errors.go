package etegram

import "fmt"

type SDKError struct {
	Code          string
	Message       string
	HTTPStatus    int
	ProviderCode  string
	Reference     string
	CorrelationID string
	Retryable     bool
	Details       any
	Cause         error
}

func (e *SDKError) Error() string {
	if e == nil {
		return ""
	}
	if e.HTTPStatus > 0 {
		return fmt.Sprintf("%s: %s (http=%d)", e.Code, e.Message, e.HTTPStatus)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func (e *SDKError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.Cause
}
