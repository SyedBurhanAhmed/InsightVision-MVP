import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/constants/app_colors.dart';
import '../core/services/api_client.dart';
import '../core/services/auth_service.dart';
import 'auth_loading_screen.dart';
import 'dashboard_screen.dart';
import 'signup_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    if (email.isEmpty || password.isEmpty) {
      _showError('Enter email and password');
      return;
    }

    setState(() => _loading = true);
    try {
      await AuthService.instance.login(email: email, password: password);
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => const AuthLoadingScreen(
            nextScreen: DashboardScreen(),
            initialProgress: 0.28,
            duration: Duration(milliseconds: 1800),
            statusText: 'Initializing Neural Engine',
          ),
        ),
      );
    } on ApiException catch (e) {
      _showError(e.message);
    } catch (_) {
      _showError('Cannot reach server. Start the API and MongoDB.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red.shade800),
    );
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final compact = size.height < 760;

    return Scaffold(
      body: Container(
        width: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF090C13), Color(0xFF04060C), Color(0xFF010206)],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            child: Container(
              padding: const EdgeInsets.fromLTRB(22, 24, 22, 18),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.white.withValues(alpha: 0.14)),
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF070B12), Color(0xFF05070C)],
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.38),
                    blurRadius: 24,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  RichText(
                    text: TextSpan(
                      style: GoogleFonts.poppins(
                        fontSize: compact ? 44 : 48,
                        fontWeight: FontWeight.w700,
                        color: AppColors.white,
                        letterSpacing: -0.7,
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
                  const SizedBox(height: 6),
                  Text(
                    'AUTHENTICATION REQUIRED',
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      letterSpacing: 3.8,
                      color: AppColors.mutedWhite.withValues(alpha: 0.82),
                    ),
                  ),
                  const SizedBox(height: 34),
                  Text(
                    'USER IDENTIFIER',
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      letterSpacing: 3.1,
                      color: AppColors.mutedWhite.withValues(alpha: 0.90),
                    ),
                  ),
                  const SizedBox(height: 14),
                  _AuthField(
                    controller: _emailController,
                    hintText: 'email@interface.ai',
                    suffix: const SizedBox.shrink(),
                  ),
                  const SizedBox(height: 34),
                  Row(
                    children: [
                      Text(
                        'PASSKEY',
                        style: GoogleFonts.poppins(
                          fontSize: 12,
                          letterSpacing: 3.1,
                          color: AppColors.mutedWhite.withValues(alpha: 0.90),
                        ),
                      ),
                      const Spacer(),
                      Text(
                        'FORGOT?',
                        style: GoogleFonts.poppins(
                          fontSize: 26,
                          color: const Color(0xFFFFA5B7),
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  _AuthField(
                    controller: _passwordController,
                    hintText: '••••••••',
                    obscureText: true,
                    suffix: const SizedBox.shrink(),
                  ),
                  const SizedBox(height: 42),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: AppColors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                      onPressed: _loading ? null : _submit,
                      icon: const SizedBox.shrink(),
                      label: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            _loading ? 'CONNECTING...' : 'INITIALIZE LOGIN',
                            style: GoogleFonts.poppins(
                              fontSize: 20,
                              letterSpacing: 4.2,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(width: 14),
                          if (_loading)
                            const SizedBox(
                              width: 23,
                              height: 23,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AppColors.white,
                              ),
                            )
                          else
                            const Icon(Icons.login_rounded, size: 23),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 42),
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          height: 1,
                          color: Colors.white.withValues(alpha: 0.18),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'SECURE_LINK',
                        style: GoogleFonts.poppins(
                          fontSize: 10,
                          letterSpacing: 2.2,
                          color: AppColors.mutedWhite.withValues(alpha: 0.72),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Container(
                          height: 1,
                          color: Colors.white.withValues(alpha: 0.18),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 26),
                  Center(
                    child: Container(
                      width: 82,
                      height: 82,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: AppColors.primary.withValues(alpha: 0.65),
                        ),
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.fingerprint_rounded,
                          color: AppColors.primary,
                          size: 40,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Center(
                    child: Text(
                      'BIOMETRIC SCAN',
                      style: GoogleFonts.poppins(
                        fontSize: 11,
                        letterSpacing: 2.2,
                        color: AppColors.mutedWhite.withValues(alpha: 0.74),
                      ),
                    ),
                  ),
                  SizedBox(height: compact ? 28 : 40),
                  Center(
                    child: Wrap(
                      spacing: 8,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(
                          'No terminal access?',
                          style: GoogleFonts.poppins(
                            fontSize: 18,
                            color: AppColors.white.withValues(alpha: 0.92),
                          ),
                        ),
                        TextButton(
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => const SignUpScreen(),
                              ),
                            );
                          },
                          style: TextButton.styleFrom(
                            foregroundColor: AppColors.primary,
                            padding: EdgeInsets.zero,
                            minimumSize: const Size(0, 0),
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          child: Text(
                            'SIGN UP',
                            style: GoogleFonts.poppins(
                              fontSize: 24,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.2,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: compact ? 16 : 28),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'NODE: US-EAST-01\nLATENCY: 14MS',
                          style: GoogleFonts.poppins(
                            fontSize: 8,
                            letterSpacing: 1.2,
                            height: 1.7,
                            color: AppColors.grey.withValues(alpha: 0.55),
                          ),
                        ),
                      ),
                      Expanded(
                        child: Text(
                          'STATUS: SHIELD_ACTIVE\nENC: AES-256-GCM',
                          textAlign: TextAlign.end,
                          style: GoogleFonts.poppins(
                            fontSize: 8,
                            letterSpacing: 1.2,
                            height: 1.7,
                            color: AppColors.grey.withValues(alpha: 0.55),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _AuthField extends StatelessWidget {
  const _AuthField({
    required this.controller,
    required this.hintText,
    required this.suffix,
    this.obscureText = false,
  });

  final TextEditingController controller;
  final String hintText;
  final Widget suffix;
  final bool obscureText;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: obscureText,
      style: GoogleFonts.poppins(
        fontSize: 31,
        color: AppColors.white.withValues(alpha: 0.96),
        fontWeight: FontWeight.w400,
      ),
      decoration: InputDecoration(
        hintText: hintText,
        hintStyle: GoogleFonts.poppins(
          fontSize: 31,
          color: AppColors.grey.withValues(alpha: 0.62),
        ),
        suffixIcon: suffix,
        contentPadding: const EdgeInsets.fromLTRB(16, 18, 16, 18),
        filled: true,
        fillColor: const Color(0xFF030406),
        enabledBorder: UnderlineInputBorder(
          borderSide: BorderSide(
            color: Colors.white.withValues(alpha: 0.34),
            width: 1.0,
          ),
        ),
        focusedBorder: const UnderlineInputBorder(
          borderSide: BorderSide(color: AppColors.primary, width: 1.5),
        ),
      ),
    );
  }
}
