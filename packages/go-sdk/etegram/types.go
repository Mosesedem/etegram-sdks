package etegram

type InitializePaymentRequest struct {
	ProjectID   string         `json:"projectID"`
	PublicKey   string         `json:"publicKey"`
	Email       string         `json:"email"`
	Phone       string         `json:"phone"`
	Amount      int64          `json:"amount"`
	Currency    string         `json:"currency"`
	FirstName   string         `json:"firstname"`
	LastName    string         `json:"lastname"`
	Reference   string         `json:"reference,omitempty"`
	Metadata    map[string]any `json:"metadata,omitempty"`
	CallbackURL string         `json:"callbackUrl,omitempty"`
}

type InitializeResult struct {
	AuthorizationURL string `json:"authorizationUrl"`
	Reference        string `json:"reference"`
	ExpiresAt        string `json:"expiresAt,omitempty"`
	CorrelationID    string `json:"correlationId,omitempty"`
}

type VerifyResult struct {
	Reference     string `json:"reference"`
	Status        string `json:"status"`
	Message       string `json:"message,omitempty"`
	CorrelationID string `json:"correlationId,omitempty"`
}

type initializeResponseEnvelope struct {
	Message string `json:"message"`
	Code    string `json:"code"`
	Data    struct {
		AuthorizationURL string `json:"authorization_url"`
		Reference        string `json:"reference"`
		ExpiresAt        string `json:"expires_at"`
	} `json:"data"`
}

type verifyResponseEnvelope struct {
	Message string `json:"message"`
	Code    string `json:"code"`
	Data    struct {
		Reference string `json:"reference"`
		Status    string `json:"status"`
		Message   string `json:"message"`
	} `json:"data"`
}
