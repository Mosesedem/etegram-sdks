import 'errors.dart';

class InitializePaymentRequest {
  InitializePaymentRequest({
    required this.projectId,
    required this.publicKey,
    required this.amount,
    required this.currency,
    required this.email,
    required this.phone,
    required this.firstName,
    required this.lastName,
    this.reference,
    this.metadata,
    this.callbackUrl,
  });

  final String projectId;
  final String publicKey;
  final int amount;
  final String currency;
  final String email;
  final String phone;
  final String firstName;
  final String lastName;
  final String? reference;
  final Map<String, Object?>? metadata;
  final String? callbackUrl;

  void validate() {
    if (projectId.trim().isEmpty) {
      throw SDKError(
          code: 'INVALID_PROJECT_ID', message: 'projectId is required');
    }
    if (publicKey.trim().isEmpty) {
      throw SDKError(
          code: 'INVALID_PUBLIC_KEY', message: 'publicKey is required');
    }
    if (amount <= 0) {
      throw SDKError(
          code: 'INVALID_AMOUNT', message: 'amount must be greater than 0');
    }
    if (currency.trim().length != 3) {
      throw SDKError(
          code: 'INVALID_CURRENCY',
          message: 'currency must be a 3-letter ISO code');
    }
    if (email.trim().isEmpty) {
      throw SDKError(code: 'INVALID_EMAIL', message: 'email is required');
    }
    if (phone.trim().isEmpty) {
      throw SDKError(code: 'INVALID_PHONE', message: 'phone is required');
    }
    if (firstName.trim().isEmpty) {
      throw SDKError(
          code: 'INVALID_FIRST_NAME', message: 'firstName is required');
    }
    if (lastName.trim().isEmpty) {
      throw SDKError(
          code: 'INVALID_LAST_NAME', message: 'lastName is required');
    }
  }

  Map<String, Object?> toJson(String resolvedReference) {
    return <String, Object?>{
      'projectID': projectId,
      'publicKey': publicKey,
      'amount': amount,
      'currency': currency.toUpperCase(),
      'email': email,
      'phone': phone,
      'firstname': firstName,
      'lastname': lastName,
      'reference': resolvedReference,
      if (metadata != null) 'metadata': metadata,
      if (callbackUrl != null) 'callbackUrl': callbackUrl,
    };
  }
}

class InitializeResult {
  InitializeResult({
    required this.authorizationUrl,
    required this.reference,
    this.expiresAt,
    this.correlationId,
  });

  final Uri authorizationUrl;
  final String reference;
  final DateTime? expiresAt;
  final String? correlationId;
}
