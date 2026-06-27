import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:video_player/video_player.dart';

import '../core/constants/app_colors.dart';
import 'dashboard_widgets.dart';
import 'media_detection_screen.dart';

class VisionScreen extends StatelessWidget {
  const VisionScreen({super.key, this.visionStreamController});

  /// When set (and initialized), video is drawn under the HUD. Otherwise the “waiting” plate shows.
  final VideoPlayerController? visionStreamController;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const DashboardTopBar(),
          const SizedBox(height: 14),
          const _StatusCard(),
          const SizedBox(height: 12),
          _UploadDetectionCard(
            onOpen: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const MediaDetectionScreen(),
                ),
              );
            },
          ),
          const SizedBox(height: 22),
          const _MetricsGrid(),
          const SizedBox(height: 24),
          _PrimaryVisionStreamStage(streamController: visionStreamController),
          const SizedBox(height: 18),
          Row(
            children: [
              const _SectionHeader(title: 'NEURAL LOGS'),
              const Spacer(),
              Text(
                'VIEW ALL',
                style: GoogleFonts.poppins(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                  letterSpacing: 0.8,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const _LogCard(),
        ],
      ),
    );
  }
}

class _StatusCard extends StatelessWidget {
  const _StatusCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: Colors.white.withValues(alpha: 0.05),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Row(
        children: [
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.primary,
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.5),
                  blurRadius: 10,
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'SYSTEM STATUS',
                  style: GoogleFonts.poppins(
                    fontSize: 10,
                    color: AppColors.grey,
                    letterSpacing: 1.3,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  'ACTIVE_CORE',
                  style: GoogleFonts.poppins(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.white,
                  ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                'UPTIME',
                style: GoogleFonts.poppins(
                  fontSize: 10,
                  color: AppColors.grey,
                  letterSpacing: 1.3,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                '142:12:05',
                style: GoogleFonts.poppins(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: AppColors.white,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _UploadDetectionCard extends StatelessWidget {
  const _UploadDetectionCard({required this.onOpen});

  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: Colors.white.withValues(alpha: 0.04),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              color: AppColors.statusBlue.withValues(alpha: 0.16),
            ),
            child: const Icon(
              Icons.upload_file_rounded,
              color: AppColors.statusBlue,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Upload Detection',
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.white,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Upload image/video from gallery and run detection',
                  style: GoogleFonts.poppins(
                    fontSize: 10,
                    color: AppColors.mutedWhite.withValues(alpha: 0.82),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          OutlinedButton(
            onPressed: onOpen,
            style: OutlinedButton.styleFrom(
              side: BorderSide(color: AppColors.statusBlue.withValues(alpha: 0.7)),
            ),
            child: Text(
              'OPEN',
              style: GoogleFonts.poppins(
                fontSize: 10,
                color: AppColors.statusBlue,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MetricsGrid extends StatelessWidget {
  const _MetricsGrid();

  @override
  Widget build(BuildContext context) {
    return const Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _MetricCard(
                accent: Color(0xFF5CC2D7),
                icon: Icons.speed_rounded,
                label: 'VLM LATENCY',
                value: '120 ms',
              ),
            ),
            SizedBox(width: 12),
            Expanded(
              child: _MetricCard(
                accent: AppColors.primary,
                icon: Icons.camera_alt_outlined,
                label: 'OBJECTS',
                value: '1,234',
              ),
            ),
          ],
        ),
        SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _MetricCard(
                accent: Color(0xFF37D600),
                icon: Icons.refresh_rounded,
                label: 'AVG FPS',
                value: '58',
              ),
            ),
            SizedBox(width: 12),
            Expanded(
              child: _MetricCard(
                accent: Color(0xFF24C6FF),
                icon: Icons.check_circle_outline_rounded,
                label: 'SUCCESS',
                value: '94 %',
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.accent,
    required this.icon,
    required this.label,
    required this.value,
  });

  final Color accent;
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 104,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        color: Colors.white.withValues(alpha: 0.05),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: accent.withValues(alpha: 0.14),
            ),
            child: Icon(icon, size: 14, color: accent),
          ),
          const Spacer(),
          Text(
            label,
            style: GoogleFonts.poppins(
              fontSize: 10,
              color: AppColors.grey,
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: GoogleFonts.poppins(
              fontSize: 24,
              color: AppColors.white,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: GoogleFonts.poppins(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        color: AppColors.grey,
        letterSpacing: 1.4,
      ),
    );
  }
}

/// Mockup palette: pure red / cyan HUD on black.
abstract final class _HudPalette {
  static const red = Color(0xFFFF0033);
  static const cyan = Color(0xFF00FFFF);
  static const black = Color(0xFF000000);
  static const labelGrey = Color(0xFF8A8A8A);
}

/// Primary vision viewport: cyber HUD + “waiting” state.
/// Pass [streamController] once your pipeline has an initialized [VideoPlayerController].
class _PrimaryVisionStreamStage extends StatefulWidget {
  const _PrimaryVisionStreamStage({this.streamController});

  final VideoPlayerController? streamController;

  @override
  State<_PrimaryVisionStreamStage> createState() => _PrimaryVisionStreamStageState();
}

class _PrimaryVisionStreamStageState extends State<_PrimaryVisionStreamStage> {
  static const _engineOptions = ['Yolov11', 'VLM'];
  static const _viewModeOptions = ['Bounding boxes', 'Raw feed'];

  final TransformationController _zoomTransform = TransformationController();

  String _selectedEngine = _engineOptions.first;
  String _selectedViewMode = _viewModeOptions.first;

  bool _muted = true;
  bool _recording = false;
  BoxFit _videoFit = BoxFit.cover;
  bool _appliedInitialVolume = false;

  void _onVideoTick() {
    final c = widget.streamController;
    if (c == null || !c.value.isInitialized) return;
    if (!_appliedInitialVolume) {
      c.setVolume(_muted ? 0 : 1);
      _appliedInitialVolume = true;
      if (mounted) setState(() {});
    }
  }

  @override
  void initState() {
    super.initState();
    widget.streamController?.addListener(_onVideoTick);
    _onVideoTick();
  }

  @override
  void didUpdateWidget(covariant _PrimaryVisionStreamStage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.streamController != widget.streamController) {
      _appliedInitialVolume = false;
    }
    oldWidget.streamController?.removeListener(_onVideoTick);
    widget.streamController?.addListener(_onVideoTick);
    _onVideoTick();
  }

  @override
  void dispose() {
    widget.streamController?.removeListener(_onVideoTick);
    _zoomTransform.dispose();
    super.dispose();
  }

  double _stageHeight(BuildContext context, double width) {
    final screen = MediaQuery.sizeOf(context);
    final ideal = width * 9 / 16;
    return math.min(ideal, screen.height * 0.52).clamp(228.0, 560.0);
  }

  void _toggleMute() {
    HapticFeedback.lightImpact();
    setState(() {
      _muted = !_muted;
      widget.streamController?.setVolume(_muted ? 0 : 1);
    });
  }

  void _toggleLayoutFit() {
    HapticFeedback.selectionClick();
    setState(() {
      _videoFit = _videoFit == BoxFit.cover ? BoxFit.contain : BoxFit.cover;
    });
  }

  void _toggleRecording() {
    HapticFeedback.mediumImpact();
    setState(() => _recording = !_recording);
  }

  void _resetZoom() {
    _zoomTransform.value = Matrix4.identity();
    HapticFeedback.lightImpact();
  }

  bool get _videoReady {
    final c = widget.streamController;
    return c != null && c.value.isInitialized;
  }

  Widget _buildHeadingAndDropdowns(double sectionWidth) {
    final dropdownW = math.min(168.0, math.max(124.0, (sectionWidth - 140) / 2 - 8));

    final engineDropdown = _HudStyledDropdown(
      width: dropdownW,
      label: 'ACTIVE ENGINE',
      value: _selectedEngine,
      options: _engineOptions,
      valueColor: _HudPalette.red,
      onChanged: (v) {
        HapticFeedback.selectionClick();
        setState(() => _selectedEngine = v);
      },
    );
    final viewDropdown = _HudStyledDropdown(
      width: dropdownW,
      label: 'VIEW MODE',
      value: _selectedViewMode,
      options: _viewModeOptions,
      valueColor: Colors.white,
      onChanged: (v) {
        HapticFeedback.selectionClick();
        setState(() => _selectedViewMode = v);
      },
    );

    if (sectionWidth < 400) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionHeader(title: 'PRIMARY VISION STREAM'),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [engineDropdown, viewDropdown],
          ),
        ],
      );
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        const Expanded(
          child: _SectionHeader(title: 'PRIMARY VISION STREAM'),
        ),
        const SizedBox(width: 8),
        engineDropdown,
        const SizedBox(width: 8),
        viewDropdown,
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final w = constraints.maxWidth;
        final h = _stageHeight(context, w);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildHeadingAndDropdowns(w),
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: SizedBox(
                height: h,
                width: double.infinity,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    const ColoredBox(color: _HudPalette.black),
                    if (_videoReady)
                      _buildInteractiveVideoLayer(
                        widget.streamController!,
                        stageW: w,
                        stageH: h,
                      ),
                    if (!_videoReady)
                      Positioned.fill(
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () => HapticFeedback.selectionClick(),
                            splashColor: _HudPalette.red.withValues(alpha: 0.12),
                            highlightColor: _HudPalette.red.withValues(alpha: 0.06),
                            child: const _StreamWaitingLayer(),
                          ),
                        ),
                      ),
                    const IgnorePointer(child: CustomPaint(painter: _HudCornersPainter())),
                    const IgnorePointer(child: _HudScanline()),
                    Positioned(
                      left: 10,
                      right: 10,
                      bottom: 10,
                      child: _StreamBottomBar(
                        videoReady: _videoReady,
                        recording: _recording,
                        videoMuted: _muted,
                        coverFit: _videoFit == BoxFit.cover,
                        onRecord: _toggleRecording,
                        onToggleMute: _videoReady ? _toggleMute : null,
                        onToggleLayout: _videoReady ? _toggleLayoutFit : null,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildInteractiveVideoLayer(
    VideoPlayerController c, {
    required double stageW,
    required double stageH,
  }) {
    return Stack(
      fit: StackFit.expand,
      children: [
        GestureDetector(
          onDoubleTap: _resetZoom,
          behavior: HitTestBehavior.deferToChild,
          child: InteractiveViewer(
            transformationController: _zoomTransform,
            clipBehavior: Clip.hardEdge,
            minScale: 1,
            maxScale: 4,
            boundaryMargin: const EdgeInsets.all(24),
            child: SizedBox(
              width: stageW,
              height: stageH,
              child: FittedBox(
                fit: _videoFit,
                clipBehavior: Clip.hardEdge,
                child: SizedBox(
                  width: c.value.size.width,
                  height: c.value.size.height,
                  child: VideoPlayer(c),
                ),
              ),
            ),
          ),
        ),
        const IgnorePointer(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0x73000000),
                  Colors.transparent,
                  Color(0x80000000),
                ],
                stops: [0.0, 0.4, 1.0],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _StreamWaitingLayer extends StatelessWidget {
  const _StreamWaitingLayer();

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        const CustomPaint(painter: _GridPainter()),
        Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'WAITING FOR SIGNAL...',
                textAlign: TextAlign.center,
                style: GoogleFonts.orbitron(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: _HudPalette.red,
                  letterSpacing: 1.2,
                  shadows: [
                    Shadow(
                      color: _HudPalette.red.withValues(alpha: 0.55),
                      blurRadius: 18,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              Text(
                'LATENCY: -- MS',
                style: GoogleFonts.rajdhani(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: _HudPalette.labelGrey,
                  letterSpacing: 0.8,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'ENCRYPTION: AES-256',
                style: GoogleFonts.rajdhani(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: _HudPalette.labelGrey,
                  letterSpacing: 0.8,
                ),
              ),
              const SizedBox(height: 22),
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  border: Border.all(color: _HudPalette.red.withValues(alpha: 0.95), width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: _HudPalette.red.withValues(alpha: 0.35),
                      blurRadius: 12,
                      spreadRadius: 0,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _HudStyledDropdown extends StatelessWidget {
  const _HudStyledDropdown({
    required this.width,
    required this.label,
    required this.value,
    required this.options,
    required this.valueColor,
    required this.onChanged,
  });

  final double width;
  final String label;
  final String value;
  final List<String> options;
  final Color valueColor;
  final ValueChanged<String> onChanged;

  static const _accent = _HudPalette.red;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: Container(
        padding: const EdgeInsets.fromLTRB(10, 6, 4, 6),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.72),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: _accent.withValues(alpha: 0.85)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: GoogleFonts.rajdhani(
                fontSize: 9,
                fontWeight: FontWeight.w600,
                color: _HudPalette.labelGrey,
                letterSpacing: 1.1,
              ),
            ),
            Theme(
              data: Theme.of(context).copyWith(
                canvasColor: const Color(0xFF050508),
                splashColor: _accent.withValues(alpha: 0.12),
                highlightColor: _accent.withValues(alpha: 0.08),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: value,
                  isDense: true,
                  isExpanded: true,
                  borderRadius: BorderRadius.circular(8),
                  dropdownColor: const Color(0xFF0D0D10),
                  icon: Icon(Icons.arrow_drop_down_rounded, color: _accent, size: 22),
                  style: GoogleFonts.rajdhani(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: valueColor,
                    letterSpacing: 0.3,
                  ),
                  items: options
                      .map(
                        (o) => DropdownMenuItem<String>(
                          value: o,
                          child: Text(
                            o,
                            style: GoogleFonts.rajdhani(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                              letterSpacing: 0.2,
                            ),
                          ),
                        ),
                      )
                      .toList(),
                  onChanged: (v) {
                    if (v != null) onChanged(v);
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StreamBottomBar extends StatelessWidget {
  const _StreamBottomBar({
    required this.videoReady,
    required this.recording,
    required this.videoMuted,
    required this.coverFit,
    required this.onRecord,
    this.onToggleMute,
    this.onToggleLayout,
  });

  final bool videoReady;
  final bool recording;
  final bool videoMuted;
  final bool coverFit;
  final VoidCallback onRecord;
  final VoidCallback? onToggleMute;
  final VoidCallback? onToggleLayout;

  @override
  Widget build(BuildContext context) {
    return FittedBox(
      fit: BoxFit.scaleDown,
      alignment: Alignment.bottomRight,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _HudPill(
                borderColor: _HudPalette.red,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 260),
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _HudPalette.red,
                        boxShadow: [
                          BoxShadow(
                            color: _HudPalette.red.withValues(alpha: recording ? 0.95 : 0.55),
                            blurRadius: recording ? 14 : 8,
                            spreadRadius: recording ? 1 : 0,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      recording ? 'REC • STREAM 01' : 'LIVE STREAM 01',
                      style: GoogleFonts.rajdhani(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                        letterSpacing: 0.6,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 6),
              _HudPill(
                borderColor: _HudPalette.red,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                child: Text(
                  videoReady ? 'FPS: —' : 'FPS: 0.0',
                  style: GoogleFonts.rajdhani(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: _HudPalette.cyan,
                    letterSpacing: 0.5,
                    shadows: [
                      Shadow(
                        color: _HudPalette.cyan.withValues(alpha: 0.45),
                        blurRadius: 10,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const Spacer(),
          Tooltip(
            message: videoReady
                ? (coverFit ? 'Fill frame (cover)' : 'Letterbox (contain)')
                : 'Connect a stream to use',
            child: _HudIconButton(
              icon: coverFit ? Icons.crop_free_rounded : Icons.fit_screen_rounded,
              onPressed: onToggleLayout,
            ),
          ),
          const SizedBox(width: 8),
          Tooltip(
            message: videoReady
                ? (videoMuted ? 'Unmute' : 'Mute')
                : 'Connect a stream to use',
            child: _HudIconButton(
              icon: videoMuted ? Icons.videocam_off_outlined : Icons.videocam_outlined,
              onPressed: onToggleMute,
            ),
          ),
          const SizedBox(width: 10),
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onRecord,
              borderRadius: BorderRadius.circular(10),
              child: Ink(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: recording ? const Color(0xFFAA0028) : _HudPalette.red,
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(
                      color: (recording ? const Color(0xFFAA0028) : _HudPalette.red)
                          .withValues(alpha: 0.45),
                      blurRadius: 14,
                      spreadRadius: 0,
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      recording ? Icons.stop_circle_outlined : Icons.podcasts_rounded,
                      color: Colors.white,
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      recording ? 'STOP' : 'RECORD',
                      style: GoogleFonts.rajdhani(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        letterSpacing: 1.0,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HudPill extends StatelessWidget {
  const _HudPill({
    required this.borderColor,
    required this.child,
    this.padding = const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
  });

  final Color borderColor;
  final EdgeInsets padding;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.78),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: borderColor.withValues(alpha: 0.9)),
      ),
      child: child,
    );
  }
}

class _HudIconButton extends StatelessWidget {
  const _HudIconButton({required this.icon, this.onPressed});

  final IconData icon;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(8),
        child: Ink(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: enabled ? 0.75 : 0.45),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: _HudPalette.red.withValues(alpha: enabled ? 0.85 : 0.35),
            ),
          ),
          child: Icon(
            icon,
            color: Colors.white.withValues(alpha: enabled ? 0.92 : 0.38),
            size: 20,
          ),
        ),
      ),
    );
  }
}

class _HudCornersPainter extends CustomPainter {
  const _HudCornersPainter();

  static const _red = _HudPalette.red;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = _red.withValues(alpha: 0.9)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    const len = 36.0;
    const inset = 10.0;

    // Top-right
    final tr = Offset(size.width - inset, inset);
    canvas.drawPath(
      Path()
        ..moveTo(tr.dx - len, tr.dy)
        ..lineTo(tr.dx, tr.dy)
        ..lineTo(tr.dx, tr.dy + len),
      paint,
    );

    // Bottom-right
    final br = Offset(size.width - inset, size.height - inset);
    canvas.drawPath(
      Path()
        ..moveTo(br.dx, br.dy - len)
        ..lineTo(br.dx, br.dy)
        ..lineTo(br.dx - len, br.dy),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _HudScanline extends StatelessWidget {
  const _HudScanline();

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: CustomPaint(painter: _HudScanlinePainter()),
    );
  }
}

class _HudScanlinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final y = size.height * 0.5;
    final p = Paint()
      ..shader = LinearGradient(
        colors: [
          Colors.transparent,
          _HudPalette.cyan.withValues(alpha: 0.25),
          Colors.transparent,
        ],
      ).createShader(Rect.fromLTWH(0, y - 2, size.width, 4));
    canvas.drawRect(Rect.fromLTWH(0, y - 1, size.width, 2), p);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _LogCard extends StatelessWidget {
  const _LogCard();

  @override
  Widget build(BuildContext context) {
    const items = [
      ('Object classified: Unidentified\nDrone', '12:44:01'),
      ('Query resolved: "Perimeter\nstatus?"', '12:43:58'),
      ('Sync protocol complete', '12:43:42'),
    ];

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        color: Colors.white.withValues(alpha: 0.05),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        children: List.generate(items.length, (index) {
          final item = items[index];
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                child: Row(
                  children: [
                    Container(
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                      ),
                      child: const Icon(
                        Icons.mail_outline_rounded,
                        color: AppColors.grey,
                        size: 12,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        item.$1,
                        style: GoogleFonts.robotoMono(
                          fontSize: 11,
                          height: 1.35,
                          color: AppColors.white,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      item.$2,
                      style: GoogleFonts.poppins(
                        fontSize: 10,
                        color: AppColors.grey,
                      ),
                    ),
                  ],
                ),
              ),
              if (index != items.length - 1)
                Divider(
                  height: 1,
                  color: Colors.white.withValues(alpha: 0.08),
                ),
            ],
          );
        }),
      ),
    );
  }
}

class _GridPainter extends CustomPainter {
  const _GridPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.06)
      ..strokeWidth = 1;

    for (double x = 20; x < size.width; x += 22) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 18; y < size.height; y += 18) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }

    final glow = Paint()..color = const Color(0x6624C6FF);
    canvas.drawCircle(Offset(size.width * 0.68, size.height * 0.44), 6, glow);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
