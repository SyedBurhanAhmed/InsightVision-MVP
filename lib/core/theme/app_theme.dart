import 'package:flutter/material.dart';

import '../constants/app_colors.dart';
import 'text_styles.dart';

class AppTheme {
  static ThemeData darkTheme = ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: AppColors.background,
    colorScheme: const ColorScheme.dark(
      primary: AppColors.primary,
      secondary: AppColors.surface,
    ),
    textTheme: TextTheme(
      headlineLarge: AppTextStyles.headline,
      bodyMedium: AppTextStyles.body,
      labelSmall: AppTextStyles.label,
    ),
  );
}