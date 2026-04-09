import Foundation

public struct SDKError: Error {
    public let code: String
    public let message: String
    public let httpStatus: Int?
    public let providerCode: String?
    public let reference: String?
    public let correlationId: String?
    public let retryable: Bool
}
