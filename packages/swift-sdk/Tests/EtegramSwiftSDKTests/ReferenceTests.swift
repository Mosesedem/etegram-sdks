import XCTest
@testable import EtegramSwiftSDK

final class ReferenceTests: XCTestCase {
    func testGenerateTransactionReferencePrefixAndLength() {
        let reference = generateTransactionReference(length: 20)
        XCTAssertTrue(reference.hasPrefix("ETG"))
        XCTAssertEqual(reference.count, 23)
    }
}
