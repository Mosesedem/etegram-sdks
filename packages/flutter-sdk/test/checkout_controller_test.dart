import 'package:etegram_flutter_sdk/etegram_flutter_sdk.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('handleCallback payment.success alias emits success then close',
      () async {
    final CheckoutController controller = CheckoutController();
    final List<CheckoutEventType> eventTypes = <CheckoutEventType>[];

    final subscription = controller.events.listen((CheckoutEvent event) {
      eventTypes.add(event.type);
    });

    controller.handleCallback(
        Uri.parse('myapp://payment?reference=ETG122&event=payment.success'));

    await Future<void>.delayed(const Duration(milliseconds: 10));

    expect(eventTypes, <CheckoutEventType>[
      CheckoutEventType.success,
      CheckoutEventType.close
    ]);

    await subscription.cancel();
    await controller.dispose();
  });

  test('handleCallback success emits success then close', () async {
    final CheckoutController controller = CheckoutController();
    final List<CheckoutEventType> eventTypes = <CheckoutEventType>[];

    final subscription = controller.events.listen((CheckoutEvent event) {
      eventTypes.add(event.type);
    });

    controller.handleCallback(
        Uri.parse('myapp://payment?reference=ETG123&status=success'));

    await Future<void>.delayed(const Duration(milliseconds: 10));

    expect(eventTypes, <CheckoutEventType>[
      CheckoutEventType.success,
      CheckoutEventType.close
    ]);

    await subscription.cancel();
    await controller.dispose();
  });

  test('handleCallback cancel emits cancel then close', () async {
    final CheckoutController controller = CheckoutController();
    final List<CheckoutEventType> eventTypes = <CheckoutEventType>[];

    final subscription = controller.events.listen((CheckoutEvent event) {
      eventTypes.add(event.type);
    });

    controller.handleCallback(
        Uri.parse('myapp://payment?reference=ETG124&status=cancel'));

    await Future<void>.delayed(const Duration(milliseconds: 10));

    expect(eventTypes,
        <CheckoutEventType>[CheckoutEventType.cancel, CheckoutEventType.close]);

    await subscription.cancel();
    await controller.dispose();
  });

  test('handleCallback unknown status emits error then close', () async {
    final CheckoutController controller = CheckoutController();
    final List<CheckoutEventType> eventTypes = <CheckoutEventType>[];

    final subscription = controller.events.listen((CheckoutEvent event) {
      eventTypes.add(event.type);
    });

    controller.handleCallback(
        Uri.parse('myapp://payment?reference=ETG125&status=pending'));

    await Future<void>.delayed(const Duration(milliseconds: 10));

    expect(eventTypes,
        <CheckoutEventType>[CheckoutEventType.error, CheckoutEventType.close]);

    await subscription.cancel();
    await controller.dispose();
  });
}
