import 'package:flutter/material.dart';

abstract final class AppColors {
  static const ink = Color(0xFF1C1B18);
  static const inkSecondary = Color(0xFF3D3C38);
  static const inkMuted = Color(0xFF6B6860);
  static const inkDisabled = Color(0xFFA8A69E);
  static const ground = Color(0xFFF8F7F3);
  static const surface = Color(0xFFEFEDE7);
  static const surfaceElevated = Colors.white;
  static const border = Color(0xFFDDD9CE);
  static const navy = Color(0xFF1A3550);
  static const navyHover = Color(0xFF243E5E);
  static const navyLight = Color(0xFFE0EAF4);
  static const amber = Color(0xFFB8782A);
  static const amberLight = Color(0xFFF5E8D0);
  static const green = Color(0xFF2D6A4F);
  static const greenLight = Color(0xFFD8EDD6);
  static const red = Color(0xFF8B2C2C);
  static const redLight = Color(0xFFF5DADA);
  static const violet = Color(0xFF4A3272);
  static const violetLight = Color(0xFFE8E0F4);
  static const warning = Color(0xFF9A6018);
  static const warningLight = Color(0xFFFEF3C7);

  static const status = <String, Color>{
    'pending': warning,
    'processing': navy,
    'to ship': violet,
    'shipped': navy,
    'out for delivery': amber,
    'delivered': green,
    'cancelled': red,
    'returned': warning,
    'refunded': green,
    'disputed': red,
  };

  static Color statusBackground(String value) {
    switch (value.toLowerCase()) {
      case 'delivered':
      case 'refunded':
        return greenLight;
      case 'cancelled':
      case 'disputed':
        return redLight;
      case 'to ship':
        return violetLight;
      case 'shipped':
      case 'processing':
        return navyLight;
      default:
        return warningLight;
    }
  }
}
