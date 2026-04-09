class SDKError implements Exception {
  SDKError({
    required this.code,
    required this.message,
    this.httpStatus,
    this.providerCode,
    this.reference,
    this.retryable = false,
    this.details,
  });

  final String code;
  final String message;
  final int? httpStatus;
  final String? providerCode;
  final String? reference;
  final bool retryable;
  final Object? details;

  @override
  String toString() {
    if (httpStatus != null) {
      return '$code: $message (http=$httpStatus)';
    }
    return '$code: $message';
  }
}
