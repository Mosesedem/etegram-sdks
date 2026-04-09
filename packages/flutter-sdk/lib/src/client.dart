import 'dart:convert';

import 'package:http/http.dart' as http;

import 'errors.dart';
import 'models.dart';
import 'reference.dart';

const Set<String> _checkoutAllowlist = <String>{'checkout.etegram.com'};

class EtegramClient {
  EtegramClient({
    String baseUrl = 'https://api-checkout.etegram.com',
    http.Client? httpClient,
  })  : _baseUrl = baseUrl.replaceFirst(RegExp(r'/+$'), ''),
        _httpClient = httpClient ?? http.Client();

  final String _baseUrl;
  final http.Client _httpClient;

  Future<InitializeResult> initializePayment(
      InitializePaymentRequest request) async {
    request.validate();

    final String reference = request.reference?.trim().isNotEmpty == true
        ? request.reference!.trim()
        : generateTransactionReference(20);

    http.Response response;
    try {
      response = await _httpClient.post(
        Uri.parse('$_baseUrl/api/transaction/initialize/${request.projectId}'),
        headers: <String, String>{
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${request.publicKey}',
        },
        body: jsonEncode(request.toJson(reference)),
      );
    } catch (e) {
      throw SDKError(
        code: 'NETWORK_ERROR',
        message: 'network error during initialize',
        reference: reference,
        retryable: true,
        details: e,
      );
    }

    final Object? decoded = _decodeJson(response.body);
    final Map<String, Object?> payload =
        decoded is Map<String, Object?> ? decoded : <String, Object?>{};

    if (response.statusCode >= 400) {
      throw SDKError(
        code: 'INITIALIZE_FAILED',
        message: _extractMessage(payload, fallback: response.body),
        httpStatus: response.statusCode,
        providerCode: payload['code'] as String?,
        reference: reference,
        retryable: response.statusCode >= 500,
        details: payload,
      );
    }

    final Map<String, Object?> data = payload['data'] is Map<String, Object?>
        ? payload['data']! as Map<String, Object?>
        : <String, Object?>{};

    final Object? authUrlValue = data['authorization_url'];
    if (authUrlValue is! String || authUrlValue.trim().isEmpty) {
      throw SDKError(
        code: 'INITIALIZE_INVALID_RESPONSE',
        message: 'authorization URL missing from initialize response',
        httpStatus: response.statusCode,
        reference: reference,
        details: payload,
      );
    }

    Uri authorizationUrl;
    try {
      authorizationUrl = Uri.parse(authUrlValue);
    } catch (_) {
      throw SDKError(
        code: 'CHECKOUT_URL_INVALID',
        message: 'checkout URL returned by server is invalid',
        reference: reference,
      );
    }

    if (!authorizationUrl.hasScheme || authorizationUrl.scheme != 'https') {
      throw SDKError(
        code: 'CHECKOUT_URL_INVALID',
        message: 'checkout URL must use https',
        reference: reference,
      );
    }

    if (!_checkoutAllowlist.contains(authorizationUrl.host)) {
      throw SDKError(
        code: 'CHECKOUT_URL_NOT_ALLOWED',
        message: 'checkout URL host is not allowlisted',
        reference: reference,
      );
    }

    final String resolvedReference = data['reference'] is String &&
            (data['reference'] as String).trim().isNotEmpty
        ? (data['reference'] as String).trim()
        : reference;

    final DateTime? expiresAt = data['expires_at'] is String
        ? DateTime.tryParse(data['expires_at'] as String)
        : null;

    return InitializeResult(
      authorizationUrl: authorizationUrl,
      reference: resolvedReference,
      expiresAt: expiresAt,
      correlationId: response.headers['x-correlation-id'],
    );
  }

  void close() {
    _httpClient.close();
  }

  static Object? _decodeJson(String body) {
    try {
      return jsonDecode(body);
    } catch (_) {
      return null;
    }
  }

  static String _extractMessage(Map<String, Object?> payload,
      {required String fallback}) {
    final Object? message = payload['message'];
    if (message is String && message.trim().isNotEmpty) {
      return message;
    }
    if (fallback.trim().isNotEmpty) {
      return fallback;
    }
    return 'request failed';
  }
}
