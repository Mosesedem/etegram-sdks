import 'dart:math';

const String _charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

final Random _random = Random.secure();

String generateTransactionReference([int length = 20]) {
  final int size = length <= 0 ? 20 : length;
  final StringBuffer out = StringBuffer('ETG');
  for (int i = 0; i < size; i++) {
    out.write(_charset[_random.nextInt(_charset.length)]);
  }
  return out.toString();
}
