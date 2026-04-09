// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "EtegramSwiftSDK",
    platforms: [
        .iOS(.v14),
        .macOS(.v12)
    ],
    products: [
        .library(name: "EtegramSwiftSDK", targets: ["EtegramSwiftSDK"])
    ],
    targets: [
        .target(name: "EtegramSwiftSDK"),
        .testTarget(name: "EtegramSwiftSDKTests", dependencies: ["EtegramSwiftSDK"])
    ]
)
