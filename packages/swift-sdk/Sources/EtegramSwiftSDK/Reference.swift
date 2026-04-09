import Foundation

private let referenceCharset = Array("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")

public func generateTransactionReference(length: Int = 20) -> String {
    let size = max(1, length)
    let suffix = String((0..<size).map { _ in referenceCharset.randomElement()! })
    return "ETG\(suffix)"
}
