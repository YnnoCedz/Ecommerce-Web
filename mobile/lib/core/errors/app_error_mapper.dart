abstract final class AppErrorMapper {
  static String message(Object error, {int? statusCode}) {
    final value = error.toString().toLowerCase();
    if (statusCode == 401 || value.contains('unauthorized') || value.contains('token')) {
      return 'Your session has expired. Please sign in again.';
    }
    if (statusCode == 404 || value.contains('out of stock')) return 'This product is currently out of stock.';
    if (value.contains('socket') || value.contains('timeout') || value.contains('network')) {
      return 'Unable to connect. Check your internet connection.';
    }
    if (value.contains('cart')) return "We couldn't update your cart.";
    if (value.contains('order')) return "We couldn't place your order. Please try again.";
    return 'Something went wrong. Please try again.';
  }
}
