import 'errors.dart';

enum CheckoutEventType {
  open,
  success,
  cancel,
  error,
  close,
}

class CheckoutEvent {
  const CheckoutEvent({
    required this.type,
    required this.reference,
    this.providerPayload,
    this.reason,
    this.error,
  });

  final CheckoutEventType type;
  final String reference;
  final Map<String, Object?>? providerPayload;
  final String? reason;
  final SDKError? error;
}
