import 'package:flutter/material.dart';

abstract final class AppTypography {
  static const display = TextStyle(fontFamily: 'Fraunces', fontSize: 32, height: 1.15, fontWeight: FontWeight.w400);
  static const pageTitle = TextStyle(fontFamily: 'Fraunces', fontSize: 26, height: 1.2, fontWeight: FontWeight.w400);
  static const sectionTitle = TextStyle(fontSize: 20, height: 1.25, fontWeight: FontWeight.w600);
  static const cardTitle = TextStyle(fontSize: 15, height: 1.3, fontWeight: FontWeight.w600);
  static const body = TextStyle(fontSize: 14, height: 1.45);
  static const bodySmall = TextStyle(fontSize: 12, height: 1.4);
  static const caption = TextStyle(fontSize: 11, height: 1.3);
  static const priceLarge = TextStyle(fontSize: 22, height: 1.2, fontWeight: FontWeight.w700);
  static const price = TextStyle(fontSize: 16, height: 1.2, fontWeight: FontWeight.w700);
  static const priceOld = TextStyle(fontSize: 12, decoration: TextDecoration.lineThrough);
  static const button = TextStyle(fontSize: 14, fontWeight: FontWeight.w600);
  static const label = TextStyle(fontSize: 12, fontWeight: FontWeight.w600);
  static const badge = TextStyle(fontSize: 11, fontWeight: FontWeight.w600);

  static TextTheme textTheme(Color color) => TextTheme(
        displayLarge: display.copyWith(color: color),
        headlineMedium: pageTitle.copyWith(color: color),
        titleLarge: sectionTitle.copyWith(color: color),
        titleMedium: cardTitle.copyWith(color: color),
        bodyLarge: body.copyWith(color: color),
        bodyMedium: body.copyWith(color: color),
        bodySmall: bodySmall.copyWith(color: color),
        labelLarge: button.copyWith(color: color),
        labelMedium: label.copyWith(color: color),
      );
}
