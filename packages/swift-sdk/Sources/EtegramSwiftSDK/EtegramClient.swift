import Foundation

public final class EtegramClient {
    private let baseURL: URL
    private let session: URLSession
    private let checkoutAllowlist: Set<String> = ["checkout.etegram.com"]

    public init(baseURL: URL = URL(string: "https://api-checkout.etegram.com")!, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    public func initializePayment(_ request: InitializePaymentRequest) async throws -> InitializeResult {
        try validate(request)

        let reference = request.reference?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false
            ? request.reference!
            : generateTransactionReference(length: 20)

        let endpoint = baseURL.appendingPathComponent("api/transaction/initialize/\(request.projectID)")
        var urlRequest = URLRequest(url: endpoint)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue("Bearer \(request.publicKey)", forHTTPHeaderField: "Authorization")

        var payload = request
        payload = InitializePaymentRequest(
            projectID: request.projectID,
            publicKey: request.publicKey,
            email: request.email,
            phone: request.phone,
            amount: request.amount,
            currency: request.currency,
            firstname: request.firstname,
            lastname: request.lastname,
            reference: reference,
            metadata: request.metadata,
            callbackUrl: request.callbackUrl
        )

        urlRequest.httpBody = try JSONEncoder().encode(payload)

        let (data, response) = try await session.data(for: urlRequest)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw SDKError(code: "NETWORK_ERROR", message: "invalid response", httpStatus: nil, providerCode: nil, reference: reference, correlationId: nil, retryable: true)
        }

        let correlationId = httpResponse.value(forHTTPHeaderField: "X-Correlation-Id")

        guard (200...299).contains(httpResponse.statusCode) else {
            throw SDKError(
                code: "INITIALIZE_FAILED",
                message: String(data: data, encoding: .utf8) ?? "request failed",
                httpStatus: httpResponse.statusCode,
                providerCode: nil,
                reference: reference,
                correlationId: correlationId,
                retryable: httpResponse.statusCode >= 500
            )
        }

        struct Envelope: Decodable {
            struct DataEnvelope: Decodable {
                let authorization_url: String
                let reference: String?
                let expires_at: String?
            }
            let data: DataEnvelope
        }

        let envelope = try JSONDecoder().decode(Envelope.self, from: data)
        guard let parsed = URL(string: envelope.data.authorization_url), parsed.scheme == "https", checkoutAllowlist.contains(parsed.host ?? "") else {
            throw SDKError(code: "CHECKOUT_URL_NOT_ALLOWED", message: "checkout URL host is not allowlisted", httpStatus: httpResponse.statusCode, providerCode: nil, reference: reference, correlationId: correlationId, retryable: false)
        }

        return InitializeResult(
            authorizationUrl: envelope.data.authorization_url,
            reference: envelope.data.reference ?? reference,
            expiresAt: envelope.data.expires_at,
            correlationId: correlationId
        )
    }

    private func validate(_ request: InitializePaymentRequest) throws {
        if request.projectID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            throw SDKError(code: "INVALID_PROJECT_ID", message: "projectID is required", httpStatus: nil, providerCode: nil, reference: nil, correlationId: nil, retryable: false)
        }
        if request.publicKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            throw SDKError(code: "INVALID_PUBLIC_KEY", message: "publicKey is required", httpStatus: nil, providerCode: nil, reference: nil, correlationId: nil, retryable: false)
        }
        if request.amount <= 0 {
            throw SDKError(code: "INVALID_AMOUNT", message: "amount must be positive", httpStatus: nil, providerCode: nil, reference: nil, correlationId: nil, retryable: false)
        }
        if request.currency.range(of: "^[A-Za-z]{3}$", options: .regularExpression) == nil {
            throw SDKError(code: "INVALID_CURRENCY", message: "currency must be a 3-letter ISO code", httpStatus: nil, providerCode: nil, reference: nil, correlationId: nil, retryable: false)
        }
    }
}
