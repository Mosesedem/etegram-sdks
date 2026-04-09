import 'dart:async';

import 'package:url_launcher/url_launcher.dart';

import 'errors.dart';
import 'events.dart';
import 'models.dart';

class CheckoutController {
  CheckoutController();

  final StreamController<CheckoutEvent> _events =
      StreamController<CheckoutEvent>.broadcast(sync: true);

  String? _reference;
  bool _settled = false;

  Stream<CheckoutEvent> get events => _events.stream;

  Future<void> openCheckout(InitializeResult initializeResult) async {
    _reference = initializeResult.reference;
    _settled = false;

    _emit(CheckoutEvent(
        type: CheckoutEventType.open, reference: initializeResult.reference));

    final bool launched = await launchUrl(
      initializeResult.authorizationUrl,
      mode: LaunchMode.externalApplication,
    );

    if (!launched) {
      final SDKError error = SDKError(
        code: 'CHECKOUT_OPEN_FAILED',
        message: 'failed to launch checkout URL',
        reference: initializeResult.reference,
      );
      _emit(CheckoutEvent(
          type: CheckoutEventType.error,
          reference: initializeResult.reference,
          error: error));
      _emit(CheckoutEvent(
        type: CheckoutEventType.close,
        reference: initializeResult.reference,
        reason: 'launch_failed',
      ));
      _settled = true;
      throw error;
    }
  }

  void handleCallback(Uri callbackUri) {
    final String reference =
        _reference ?? callbackUri.queryParameters['reference'] ?? '';
    if (reference.isEmpty || _settled) {
      return;
    }

    final String status =
        (callbackUri.queryParameters['status'] ?? '').toLowerCase();
    final String eventType =
        (callbackUri.queryParameters['event'] ?? '').toLowerCase();
    final String signal = eventType.isNotEmpty ? eventType : status;
    final Map<String, Object?> providerPayload = <String, Object?>{
      for (final MapEntry<String, String> entry
          in callbackUri.queryParameters.entries)
        entry.key: entry.value,
    };

    if (signal == 'success' || signal == 'payment.success') {
      _emit(CheckoutEvent(
          type: CheckoutEventType.success,
          reference: reference,
          providerPayload: providerPayload));
      _emit(CheckoutEvent(
          type: CheckoutEventType.close,
          reference: reference,
          reason: 'success'));
      _settled = true;
      return;
    }

    if (signal == 'cancel' ||
        signal == 'cancelled' ||
        signal == 'payment.cancel') {
      _emit(CheckoutEvent(
          type: CheckoutEventType.cancel,
          reference: reference,
          providerPayload: providerPayload,
          reason: 'cancel'));
      _emit(CheckoutEvent(
          type: CheckoutEventType.close,
          reference: reference,
          reason: 'cancel'));
      _settled = true;
      return;
    }

    final String message = callbackUri.queryParameters['message'] ??
        (signal.isEmpty
            ? 'checkout callback status is missing'
            : 'unrecognized checkout callback status: $signal');

    final SDKError error = SDKError(
      code: 'CHECKOUT_RUNTIME_ERROR',
      message: message,
      reference: reference,
      details: providerPayload,
    );
    _emit(CheckoutEvent(
        type: CheckoutEventType.error, reference: reference, error: error));
    _emit(CheckoutEvent(
        type: CheckoutEventType.close, reference: reference, reason: 'error'));
    _settled = true;
  }

  void cancel([String reason = 'cancelled_by_user']) {
    final String? reference = _reference;
    if (_settled || reference == null || reference.isEmpty) {
      return;
    }
    _emit(CheckoutEvent(
        type: CheckoutEventType.cancel, reference: reference, reason: reason));
    _emit(CheckoutEvent(
        type: CheckoutEventType.close, reference: reference, reason: reason));
    _settled = true;
  }

  Future<void> dispose() async {
    await _events.close();
  }

  void _emit(CheckoutEvent event) {
    if (_events.isClosed) {
      return;
    }
    _events.add(event);
  }
}
