import Foundation

public struct InitializePaymentRequest: Codable {
    public let projectID: String
    public let publicKey: String
    public let email: String
    public let phone: String
    public let amount: Int
    public let currency: String
    public let firstname: String
    public let lastname: String
    public let reference: String?
    public let metadata: [String: String]?
    public let callbackUrl: String?

    public init(
        projectID: String,
        publicKey: String,
        email: String,
        phone: String,
        amount: Int,
        currency: String,
        firstname: String,
        lastname: String,
        reference: String? = nil,
        metadata: [String: String]? = nil,
        callbackUrl: String? = nil
    ) {
        self.projectID = projectID
        self.publicKey = publicKey
        self.email = email
        self.phone = phone
        self.amount = amount
        self.currency = currency
        self.firstname = firstname
        self.lastname = lastname
        self.reference = reference
        self.metadata = metadata
        self.callbackUrl = callbackUrl
    }
}

public struct InitializeResult: Codable {
    public let authorizationUrl: String
    public let reference: String
    public let expiresAt: String?
    public let correlationId: String?
}

public struct VerifyResult: Codable {
    public let reference: String
    public let status: String
    public let message: String?
    public let correlationId: String?
}
