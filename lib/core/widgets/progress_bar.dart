import 'package:flutter/material.dart';

import '../constants/app_colors.dart';

class CustomProgressBar extends StatelessWidget {
  final double value;

  const CustomProgressBar({super.key, required this.value});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(999),
      child: LinearProgressIndicator(
        value: value,
        minHeight: 6,
        color: AppColors.primary,
        backgroundColor: AppColors.track,
      ),
    );
  }
}