import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_typography.dart';

ThemeData buildLightTheme() {
  final scheme = ColorScheme.fromSeed(seedColor: AppColors.navy, brightness: Brightness.light).copyWith(
    primary: AppColors.navy,
    onPrimary: Colors.white,
    secondary: AppColors.amber,
    surface: AppColors.surfaceElevated,
    onSurface: AppColors.ink,
    error: AppColors.red,
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: AppColors.ground,
    textTheme: AppTypography.textTheme(AppColors.ink),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surfaceElevated,
      border: OutlineInputBorder(borderRadius: BorderRadius.all(AppRadius.md), borderSide: const BorderSide(color: AppColors.border)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.all(AppRadius.md), borderSide: const BorderSide(color: AppColors.border)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.all(AppRadius.md), borderSide: const BorderSide(color: AppColors.navy, width: 2)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
    ),
    cardTheme: const CardThemeData(color: AppColors.surfaceElevated, elevation: 0, margin: EdgeInsets.zero),
  );
}

ThemeData buildDarkTheme() {
  return ThemeData.dark(useMaterial3: true).copyWith(
    colorScheme: ColorScheme.fromSeed(seedColor: AppColors.navy, brightness: Brightness.dark),
    textTheme: AppTypography.textTheme(Colors.white),
  );
}
