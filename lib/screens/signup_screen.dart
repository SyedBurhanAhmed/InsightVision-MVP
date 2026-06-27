import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/constants/app_colors.dart';
import '../core/services/api_client.dart';
import '../core/services/auth_service.dart';
import 'auth_loading_screen.dart';
import 'dashboard_screen.dart';
import 'login_screen.dart';

class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key});

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _accepted = false;
  bool _loading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_accepted) {
      _showError('Accept the protocol agreements to continue');
      return;
    }
    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    final confirm = _confirmController.text;
    if (name.isEmpty || email.isEmpty || password.isEmpty) {
      _showError('Fill in all fields');
      return;
    }
    if (password != confirm) {
      _showError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      _showError('Password must be at least 6 characters');
      return;
    }

    setState(() => _loading = true);
    try {
      await AuthService.instance.register(
        name: name,
        email: email,
        password: password,
      );
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => const AuthLoadingScreen(
            nextScreen: DashboardScreen(),
            initialProgress: 0.22,
            duration: Duration(milliseconds: 2100),
            statusText: 'Provisioning Secure Profile',
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
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF070B12), Color(0xFF05070C)],
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(22, 22, 22, 18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'INITIALIZE_ACCO\nUNT',
                      style: GoogleFonts.poppins(
                        fontSize: compact ? 44 : 48,
                        fontWeight: FontWeight.w700,
                        height: 1.0,
                        letterSpacing: -0.6,
                        color: AppColors.white.withValues(alpha: 0.95),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Access the InsightVision AI core\ninfrastructure.',
                      style: GoogleFonts.poppins(
                        fontSize: 14,
                        color: AppColors.mutedWhite.withValues(alpha: 0.78),
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 28),
                    _SignUpField(
                      label: 'FULL NAME',
                      hint: 'OPERATOR_NAME',
                      controller: _nameController,
                    ),
                    const SizedBox(height: 20),
                    _SignUpField(
                      label: 'EMAIL ADDRESS',
                      hint: 'ENCRYPTED_ID@SYSTEM.AI',
                      controller: _emailController,
                    ),
                    const SizedBox(height: 20),
                    _SignUpField(
                      label: 'PASSWORD',
                      hint: '••••••••',
                      obscure: true,
                      controller: _passwordController,
                    ),
                    const SizedBox(height: 20),
                    _SignUpField(
                      label: 'CONFIRM',
                      hint: '••••••••',
                      obscure: true,
                      controller: _confirmController,
                    ),
                    const SizedBox(height: 18),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Transform.scale(
                          scale: 0.96,
                          child: Checkbox(
                            value: _accepted,
                            onChanged: (value) {
                              setState(() {
                                _accepted = value ?? false;
                              });
                            },
                            side: BorderSide(
                              color: Colors.white.withValues(alpha: 0.45),
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(2),
                            ),
                            activeColor: AppColors.primary,
                            checkColor: AppColors.white,
                            materialTapTargetSize:
                                MaterialTapTargetSize.shrinkWrap,
                            visualDensity: VisualDensity.compact,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.only(top: 3),
                            child: Text(
                              'I accept the Protocol Agreements\nand data processing terms.',
                              style: GoogleFonts.poppins(
                                fontSize: 14,
                                color: AppColors.white.withValues(alpha: 0.85),
                                height: 1.35,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: AppColors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                        onPressed: _loading ? null : _submit,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              _loading ? 'CREATING...' : 'CREATE ACCOUNT',
                              style: GoogleFonts.poppins(
                                fontSize: 20,
                                letterSpacing: 1.5,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(width: 10),
                            const Icon(Icons.chevron_right_rounded, size: 28),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 7,
                              height: 7,
                              decoration: const BoxDecoration(
                                color: AppColors.statusGreen,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'SECURE CONNECTION ESTABLISHED',
                              style: GoogleFonts.poppins(
                                fontSize: 8,
                                color: AppColors.statusGreen,
                                letterSpacing: 1.05,
                              ),
                            ),
                          ],
                        ),
                        const Spacer(),
                        Text(
                          'VER 4.0.2',
                          style: GoogleFonts.poppins(
                            fontSize: 10,
                            color: AppColors.grey.withValues(alpha: 0.82),
                            letterSpacing: 1.0,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Center(
                      child: Wrap(
                        spacing: 5,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Text(
                            'Already registered?',
                            style: GoogleFonts.poppins(
                              fontSize: 14,
                              color: AppColors.white.withValues(alpha: 0.8),
                            ),
                          ),
                          TextButton(
                            onPressed: () {
                              Navigator.of(context).pushReplacement(
                                MaterialPageRoute<void>(
                                  builder: (_) => const LoginScreen(),
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
                              'Sign in to Terminal',
                              style: GoogleFonts.poppins(
                                fontSize: 16,
                                decoration: TextDecoration.underline,
                                decorationColor: AppColors.primary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SignUpField extends StatelessWidget {
  const _SignUpField({
    required this.label,
    required this.hint,
    required this.controller,
    this.obscure = false,
  });

  final String label;
  final String hint;
  final TextEditingController controller;
  final bool obscure;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 12,
            letterSpacing: 2.1,
            color: AppColors.white.withValues(alpha: 0.9),
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          obscureText: obscure,
          style: GoogleFonts.poppins(
            fontSize: 23,
            color: const Color(0xFFB89297),
            letterSpacing: 0.2,
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: GoogleFonts.poppins(
              fontSize: 23,
              color: const Color(0xFFB89297).withValues(alpha: 0.85),
            ),
            prefixIcon: Icon(
              Icons.adjust_outlined,
              size: 14,
              color: const Color(0xFFB89297).withValues(alpha: 0.8),
            ),
            filled: true,
            fillColor: const Color(0xFFE8E8E8),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 14,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(0),
              borderSide: BorderSide.none,
            ),
            focusedBorder: const OutlineInputBorder(
              borderRadius: BorderRadius.zero,
              borderSide: BorderSide(color: AppColors.primary, width: 1.2),
            ),
          ),
        ),
      ],
    );
  }
}
