import 'package:flutter/material.dart';
import 'core/theme/app_theme.dart';
import 'features/design_system/presentation/design_system_page.dart';

void main() => runApp(const MaketoApp());

class MaketoApp extends StatelessWidget {
  const MaketoApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(title: 'Maketo', theme: buildLightTheme(), darkTheme: buildDarkTheme(), themeMode: ThemeMode.system, home: const DesignSystemPage());
}
