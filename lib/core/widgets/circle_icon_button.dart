import 'package:flutter/material.dart';

import '../constants/app_colors.dart';

class CircleIconButton extends StatelessWidget {
  final IconData icon;
  final bool isActive;

  const CircleIconButton({
    super.key,
    required this.icon,
    this.isActive = false,
  });

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      backgroundColor:
          isActive ? AppColors.primary : AppColors.surface,
      child: Icon(icon, color: AppColors.white),
    );
  }
}