import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/constants/app_colors.dart';
import 'dashboard_widgets.dart';

/// Mock-aligned palette (dark UI + red + cyan data).
abstract final class _QueryPalette {
  static const surface = Color(0xFF1A1A1A);
  static const red = Color(0xFFE61E32);
  static const cyan = Color(0xFF00FFFF);
  static const labelRed = Color(0xFFE61E32);
}

class QueryScreen extends StatefulWidget {
  const QueryScreen({super.key});

  @override
  State<QueryScreen> createState() => _QueryScreenState();
}

class _QueryScreenState extends State<QueryScreen> {
  final TextEditingController _queryController = TextEditingController();
  final FocusNode _queryFocus = FocusNode();

  static const _fewShotModes = ['PROMPT_TUNING', 'FEW_SHOT_LITE', 'ZERO_SHOT'];
  String _fewShotMode = _fewShotModes.first;

  @override
  void dispose() {
    _queryController.dispose();
    _queryFocus.dispose();
    super.dispose();
  }

  void _executeQuery() {
    HapticFeedback.mediumImpact();
    final q = _queryController.text.trim();
    if (q.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Enter a query to execute.', style: GoogleFonts.poppins()),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Executing: $q', style: GoogleFonts.poppins()),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _onMic() {
    HapticFeedback.lightImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Voice capture not wired yet.', style: GoogleFonts.poppins()),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _onAddSample() {
    HapticFeedback.selectionClick();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Add sample: open camera or gallery when wired.', style: GoogleFonts.poppins()),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _openClusterDetail(String title, String body) {
    HapticFeedback.lightImpact();
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: const Color(0xFF12121A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white)),
            const SizedBox(height: 12),
            Text(body, style: GoogleFonts.poppins(fontSize: 14, height: 1.45, color: AppColors.mutedWhite)),
            const SizedBox(height: 16),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: Text('DISMISS', style: GoogleFonts.poppins(color: _QueryPalette.red, fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(14, 0, 14, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const DashboardTopBar(),
          const SizedBox(height: 18),
          _NlQuerySection(
            controller: _queryController,
            focusNode: _queryFocus,
            onExecute: _executeQuery,
            onMic: _onMic,
          ),
          const SizedBox(height: 26),
          _FewShotSection(
            mode: _fewShotMode,
            modes: _fewShotModes,
            onModeChanged: (m) => setState(() => _fewShotMode = m),
            onAddSample: _onAddSample,
          ),
          const SizedBox(height: 26),
          _DetectionClustersSection(onCardTap: _openClusterDetail),
          const SizedBox(height: 22),
          const _QueryFooterStrip(),
        ],
      ),
    );
  }
}

class _NlQuerySection extends StatelessWidget {
  const _NlQuerySection({
    required this.controller,
    required this.focusNode,
    required this.onExecute,
    required this.onMic,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final VoidCallback onExecute;
  final VoidCallback onMic;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.auto_awesome_rounded, color: _QueryPalette.red, size: 16),
            const SizedBox(width: 8),
            Text(
              'NATURAL LANGUAGE VL-QUERY',
              style: GoogleFonts.poppins(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: _QueryPalette.red,
                letterSpacing: 1.2,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.fromLTRB(4, 4, 4, 4),
          decoration: BoxDecoration(
            color: _QueryPalette.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
          ),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: controller,
                  focusNode: focusNode,
                  minLines: 1,
                  maxLines: 3,
                  style: GoogleFonts.poppins(fontSize: 14, color: Colors.white),
                  cursorColor: _QueryPalette.red,
                  decoration: InputDecoration(
                    isDense: true,
                    hintText: 'Search objects, behavior, events...',
                    hintStyle: GoogleFonts.poppins(fontSize: 13, color: AppColors.grey),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  ),
                ),
              ),
              IconButton.filledTonal(
                onPressed: onMic,
                style: IconButton.styleFrom(
                  backgroundColor: Colors.white.withValues(alpha: 0.06),
                  foregroundColor: Colors.white,
                ),
                icon: const Icon(Icons.mic_none_rounded, size: 22),
              ),
              const SizedBox(width: 4),
              Material(
                color: _QueryPalette.red,
                borderRadius: BorderRadius.circular(10),
                child: InkWell(
                  onTap: onExecute,
                  borderRadius: BorderRadius.circular(10),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    child: Text(
                      'EXECUTE',
                      style: GoogleFonts.poppins(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        letterSpacing: 1.0,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _FewShotSection extends StatelessWidget {
  const _FewShotSection({
    required this.mode,
    required this.modes,
    required this.onModeChanged,
    required this.onAddSample,
  });

  final String mode;
  final List<String> modes;
  final ValueChanged<String> onModeChanged;
  final VoidCallback onAddSample;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'FEW-SHOT CONFIGURATION',
                style: GoogleFonts.poppins(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                  letterSpacing: 1.1,
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.45),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: _QueryPalette.cyan.withValues(alpha: 0.35)),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: mode,
                  isDense: true,
                  dropdownColor: const Color(0xFF0D0D12),
                  borderRadius: BorderRadius.circular(8),
                  icon: Icon(Icons.arrow_drop_down_rounded, color: _QueryPalette.cyan.withValues(alpha: 0.9), size: 20),
                  style: GoogleFonts.robotoMono(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: _QueryPalette.cyan,
                    letterSpacing: 0.4,
                  ),
                  selectedItemBuilder: (context) => modes
                      .map(
                        (m) => Align(
                          alignment: Alignment.centerRight,
                          child: Text.rich(
                            TextSpan(
                              children: [
                                TextSpan(text: 'MODE: ', style: GoogleFonts.robotoMono(fontSize: 9, color: _QueryPalette.cyan.withValues(alpha: 0.75))),
                                TextSpan(text: m, style: GoogleFonts.robotoMono(fontSize: 10, fontWeight: FontWeight.w700, color: _QueryPalette.cyan)),
                              ],
                            ),
                          ),
                        ),
                      )
                      .toList(),
                  items: modes
                      .map(
                        (m) => DropdownMenuItem(
                          value: m,
                          child: Text('MODE: $m', style: GoogleFonts.robotoMono(fontSize: 10, color: Colors.white)),
                        ),
                      )
                      .toList(),
                  onChanged: (v) {
                    if (v != null) {
                      HapticFeedback.selectionClick();
                      onModeChanged(v);
                    }
                  },
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _SampleSlotCard(label: 'LABEL: SUBJECT_RED', icon: Icons.person_rounded, tint: const Color(0xFF2A4A6A))),
            const SizedBox(width: 10),
            Expanded(child: _SampleSlotCard(label: 'LABEL: TARGET_VEHICLE', icon: Icons.directions_car_filled_rounded, tint: const Color(0xFF1A1A2E))),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(child: _DashedActionTile(icon: Icons.add_a_photo_rounded, title: 'ADD SAMPLE', onTap: onAddSample)),
            const SizedBox(width: 10),
            Expanded(
              child: _DashedActionTile(
                icon: Icons.hourglass_empty_rounded,
                title: 'WAITING FOR INPUT...',
                onTap: () {
                  HapticFeedback.selectionClick();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Assign labels after capture.', style: GoogleFonts.poppins()), behavior: SnackBarBehavior.floating),
                  );
                },
                accent: AppColors.grey,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _SampleSlotCard extends StatelessWidget {
  const _SampleSlotCard({required this.label, required this.icon, required this.tint});

  final String label;
  final IconData icon;
  final Color tint;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          HapticFeedback.lightImpact();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Edit $label', style: GoogleFonts.poppins()), behavior: SnackBarBehavior.floating),
          );
        },
        borderRadius: BorderRadius.circular(12),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [tint, Colors.black],
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AspectRatio(
                aspectRatio: 1.15,
                child: Stack(
                  children: [
                    Center(child: Icon(icon, size: 40, color: Colors.white.withValues(alpha: 0.35))),
                    Positioned(
                      top: 6,
                      right: 6,
                      child: Container(
                        padding: const EdgeInsets.all(3),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.55),
                          shape: BoxShape.circle,
                          border: Border.all(color: _QueryPalette.red.withValues(alpha: 0.8)),
                        ),
                        child: Icon(Icons.check_rounded, size: 14, color: _QueryPalette.red),
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.fromLTRB(8, 8, 8, 10),
                color: Colors.black.withValues(alpha: 0.55),
                child: Text(
                  label,
                  style: GoogleFonts.robotoMono(fontSize: 9, color: _QueryPalette.cyan, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DashedActionTile extends StatelessWidget {
  const _DashedActionTile({
    required this.icon,
    required this.title,
    required this.onTap,
    this.accent,
  });

  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final c = accent ?? _QueryPalette.red;
    return CustomPaint(
      painter: _DashedBorderPainter(color: c.withValues(alpha: 0.55)),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 8),
            child: Column(
              children: [
                Icon(icon, color: c, size: 26),
                const SizedBox(height: 8),
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.poppins(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.mutedWhite),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DashedBorderPainter extends CustomPainter {
  _DashedBorderPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final r = RRect.fromRectAndRadius(Offset.zero & size, const Radius.circular(12));
    final path = Path()..addRRect(r);
    const dash = 5.0;
    const gap = 4.0;
    for (final metric in path.computeMetrics()) {
      double d = 0;
      while (d < metric.length) {
        final extract = metric.extractPath(d, math.min(d + dash, metric.length));
        canvas.drawPath(
          extract,
          Paint()
            ..color = color
            ..style = PaintingStyle.stroke
            ..strokeWidth = 1.2,
        );
        d += dash + gap;
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _DetectionClustersSection extends StatelessWidget {
  const _DetectionClustersSection({required this.onCardTap});

  final void Function(String title, String body) onCardTap;

  @override
  Widget build(BuildContext context) {
    const matches = 5;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'DETECTION CLUSTERS',
              style: GoogleFonts.poppins(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: Colors.white,
                letterSpacing: 1.0,
              ),
            ),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: _QueryPalette.surface,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
              ),
              child: Text(
                '${matches.toString().padLeft(2, '0')} MATCHES FOUND',
                style: GoogleFonts.robotoMono(fontSize: 10, fontWeight: FontWeight.w600, color: _QueryPalette.cyan),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _ClusterCard(
          camLabel: 'CAM_04',
          title: 'Anomalous Trajectory',
          time: '03:14:22 UTC',
          confidence: '98.4% CONFIDENCE',
          spans: const [
            _SpanSeg('Subject identified as ', false),
            _SpanSeg('HUMAN', true),
            _SpanSeg(' matching Sample_01 behavior: rapid movement near Restricted_Zone_B.', false),
          ],
          tags: const ['HUMANOID', 'VELOCITY_HIGH', 'NIGHT_VISION'],
          imageTint: const Color(0xFF1A3A5C),
          onTap: () => onCardTap(
            'Anomalous Trajectory',
            'Full trajectory replay, linked cameras, and export will connect here.',
          ),
        ),
        const SizedBox(height: 12),
        _ClusterCard(
          camLabel: 'CAM_12',
          title: 'Static Target Match',
          time: '02:58:01 UTC',
          confidence: '82.1% CONFIDENCE',
          spans: const [
            _SpanSeg('Object matching ', false),
            _SpanSeg('VEHICLE_TARGET', true),
            _SpanSeg(' metadata detected in stationary position for >300s.', false),
          ],
          tags: const ['AUTOMOBILE', 'LOITERING'],
          imageTint: const Color(0xFF2A2A2A),
          monoChrome: true,
          onTap: () => onCardTap(
            'Static Target Match',
            'Open loitering timeline, plate OCR, and neighbor cams from this stub.',
          ),
        ),
      ],
    );
  }
}

class _SpanSeg {
  const _SpanSeg(this.text, this.highlight);
  final String text;
  final bool highlight;
}

class _ClusterCard extends StatelessWidget {
  const _ClusterCard({
    required this.camLabel,
    required this.title,
    required this.time,
    required this.confidence,
    required this.spans,
    required this.tags,
    required this.imageTint,
    required this.onTap,
    this.monoChrome = false,
  });

  final String camLabel;
  final String title;
  final String time;
  final String confidence;
  final List<_SpanSeg> spans;
  final List<String> tags;
  final Color imageTint;
  final bool monoChrome;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: _QueryPalette.surface,
      borderRadius: BorderRadius.circular(14),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AspectRatio(
              aspectRatio: 16 / 9,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: monoChrome
                            ? [const Color(0xFF3A3A3A), const Color(0xFF101010)]
                            : [imageTint, const Color(0xFF0A1520)],
                      ),
                    ),
                  ),
                  Center(
                    child: Icon(Icons.videocam_outlined, size: 42, color: Colors.white.withValues(alpha: 0.2)),
                  ),
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.55),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        camLabel,
                        style: GoogleFonts.robotoMono(fontSize: 10, color: _QueryPalette.cyan, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: GoogleFonts.poppins(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white)),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(time, style: GoogleFonts.robotoMono(fontSize: 10, color: AppColors.grey)),
                      const Spacer(),
                      Text(
                        confidence,
                        style: GoogleFonts.robotoMono(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: _QueryPalette.cyan,
                          shadows: [Shadow(color: _QueryPalette.cyan.withValues(alpha: 0.35), blurRadius: 8)],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  RichText(
                    text: TextSpan(
                      style: GoogleFonts.poppins(fontSize: 12, height: 1.45, color: AppColors.mutedWhite),
                      children: [
                        for (final s in spans)
                          TextSpan(
                            text: s.text,
                            style: s.highlight
                                ? GoogleFonts.poppins(
                                    fontSize: 12,
                                    height: 1.45,
                                    color: _QueryPalette.labelRed,
                                    fontWeight: FontWeight.w700,
                                  )
                                : null,
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      for (final t in tags)
                        ActionChip(
                          label: Text(t, style: GoogleFonts.robotoMono(fontSize: 9, fontWeight: FontWeight.w600)),
                          onPressed: () {
                            HapticFeedback.selectionClick();
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Filter by $t', style: GoogleFonts.poppins()), behavior: SnackBarBehavior.floating),
                            );
                          },
                          backgroundColor: Colors.black.withValues(alpha: 0.35),
                          side: BorderSide(color: Colors.white.withValues(alpha: 0.15)),
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          visualDensity: VisualDensity.compact,
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QueryFooterStrip extends StatelessWidget {
  const _QueryFooterStrip();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFF16D764)),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'INFERENCE ENGINE ACTIVE',
              style: GoogleFonts.robotoMono(fontSize: 10, fontWeight: FontWeight.w600, color: Colors.white),
            ),
          ),
          Text(
            'MODEL: VISION-GPT-4V-2',
            style: GoogleFonts.robotoMono(fontSize: 9, color: _QueryPalette.cyan, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }
}
