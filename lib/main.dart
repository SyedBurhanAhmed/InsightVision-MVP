import 'package:flutter/material.dart';

import 'core/services/auth_service.dart';
import 'core/theme/app_theme.dart';
import 'screens/home_screen.dart';
import 'screens/splash_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AuthService.instance.init();
  runApp(const InsightVisionApp());
}

class InsightVisionApp extends StatelessWidget {
  const InsightVisionApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'InsightVision',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const SplashScreen(
        nextScreen: HomeScreen(),
        navigationDelay: Duration(seconds: 3),
      ),
    );
  }
}