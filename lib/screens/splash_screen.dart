import 'dart:ui';
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/constants/app_colors.dart';
import '../core/widgets/progress_bar.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({
    super.key,
    this.nextScreen,
    this.navigationDelay = const Duration(seconds: 3),
  });

  final Widget? nextScreen;
  final Duration navigationDelay;

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  Timer? _navigationTimer;

  @override
  void initState() {
    super.initState();
    if (widget.nextScreen != null) {
      _navigationTimer = Timer(widget.navigationDelay, _goToNextScreen);
    }
  }

  @override
  void dispose() {
    _navigationTimer?.cancel();
    super.dispose();
  }

  void _goToNextScreen() {
    if (!mounted || widget.nextScreen == null) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(builder: (_) => widget.nextScreen!),
    );
  }

  @override
  Widget build(BuildContext context) {
    const progress = 0.74;
    final size = MediaQuery.sizeOf(context);
    final percentage = (progress * 100).round();
    final compact = size.height < 760;
    final titleFontSize = compact ? 40.0 : 50.0;
    final cardSize = compact ? size.width * 0.36 : size.width * 0.43;
    final introGap = compact ? 46.0 : 74.0;

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF090C13), Color(0xFF04060C), Color(0xFF010206)],
          ),
        ),
        child: Stack(
          children: [
            Positioned(
              top: size.height * 0.22,
              left: size.width * 0.18,
              child: _GlowOrb(size: size.width * 0.64),
            ),
            SafeArea(
              child: SingleChildScrollView(
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: size.height - 24),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    child: Column(
                      children: [
                        SizedBox(height: compact ? 20 : 48),
                        _LogoCard(size: cardSize),
                        const SizedBox(height: 38),
                        RichText(
                          text: TextSpan(
                            style: GoogleFonts.poppins(
                              fontSize: titleFontSize,
                              fontWeight: FontWeight.w700,
                              color: AppColors.white,
                              letterSpacing: -0.8,
                            ),
                            children: const [
                              TextSpan(text: 'InsightVision '),
                              TextSpan(
                                text: 'AI',
                                style: TextStyle(color: AppColors.primary),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'HIGH-PERFORMANCE NEURAL\nCORE',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.poppins(
                            fontSize: 13,
                            letterSpacing: 5,
                            height: 1.85,
                            color: AppColors.mutedWhite.withValues(alpha: 0.85),
                          ),
                        ),
                        SizedBox(height: introGap),
                        Row(
                          children: [
                            Text(
                              'Initializing Neural Engine',
                              style: GoogleFonts.poppins(
                                fontSize: 18,
                                color: AppColors.white.withValues(alpha: 0.92),
                                fontWeight: FontWeight.w400,
                              ),
                            ),
                            const Spacer(),
                            Text(
                              '$percentage%',
                              style: GoogleFonts.poppins(
                                fontSize: 20,
                                color: AppColors.white.withValues(alpha: 0.95),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        const CustomProgressBar(value: progress),
                        const SizedBox(height: 26),
                        const Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            _StatusDot(
                              color: AppColors.statusGreen,
                              label: 'SYSTEMS_READY',
                            ),
                            _StatusDot(
                              color: AppColors.primary,
                              label: 'SECURE_LINK',
                            ),
                            _StatusDot(
                              color: AppColors.statusBlue,
                              label: 'DATA_FETCH',
                            ),
                          ],
                        ),
                        SizedBox(height: compact ? 28 : 52),
                        Row(
                          children: [
                            _FooterText(
                              text: 'KERNEL: V4.0.2-STABLE\nREGION: NORTH_CLUSTER_01',
                            ),
                            const Spacer(),
                            _FooterText(
                              text: '© 2024 INSIGHTVISION\nALL PROTOCOLS ACTIVE',
                              alignEnd: true,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LogoCard extends StatelessWidget {
  const _LogoCard({required this.size});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF220716), Color(0xFF0E0D15)],
        ),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.28)),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.30),
            blurRadius: 42,
            spreadRadius: 3,
          ),
          const BoxShadow(
            color: Color(0xAA06070E),
            blurRadius: 14,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Center(
        child: Stack(
          alignment: Alignment.center,
          children: [
            Container(
              width: size * 0.47,
              height: size * 0.47,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.primary.withValues(alpha: 0.13),
              ),
            ),
            Icon(
              Icons.gpp_good_rounded,
              size: size * 0.34,
              color: AppColors.primarySoft,
            ),
            Icon(
              Icons.lock,
              size: size * 0.13,
              color: AppColors.background,
            ),
          ],
        ),
      ),
    );
  }
}

class _GlowOrb extends StatelessWidget {
  const _GlowOrb({required this.size});

  final double size;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: ClipOval(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.primary.withValues(alpha: 0.11),
            ),
          ),
        ),
      ),
    );
  }
}

class _StatusDot extends StatelessWidget {
  const _StatusDot({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 7,
          height: 7,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: color.withValues(alpha: 0.50),
                blurRadius: 6,
              ),
            ],
          ),
        ),
        const SizedBox(width: 7),
        Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 11,
            letterSpacing: 1.8,
            color: AppColors.grey.withValues(alpha: 0.92),
          ),
        ),
      ],
    );
  }
}

class _FooterText extends StatelessWidget {
  const _FooterText({required this.text, this.alignEnd = false});

  final String text;
  final bool alignEnd;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      textAlign: alignEnd ? TextAlign.end : TextAlign.start,
      style: GoogleFonts.poppins(
        fontSize: 10,
        letterSpacing: 1.35,
        height: 1.9,
        color: AppColors.grey.withValues(alpha: 0.62),
      ),
    );
  }
}
