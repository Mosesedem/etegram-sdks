import 'package:etegram_flutter_sdk/etegram_flutter_sdk.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('generateTransactionReference uses ETG prefix and default size', () {
    final String reference = generateTransactionReference();

    expect(reference.startsWith('ETG'), isTrue);
    expect(reference.length, 23);
  });

  test('generateTransactionReference respects custom length', () {
    final String reference = generateTransactionReference(10);

    expect(reference.length, 13);
  });
}
