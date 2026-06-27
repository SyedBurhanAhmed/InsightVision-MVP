import 'dart:io';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:video_player/video_player.dart';

import '../core/constants/app_colors.dart';

enum _MediaType { image, video }

class MediaDetectionScreen extends StatefulWidget {
  const MediaDetectionScreen({super.key});

  @override
  State<MediaDetectionScreen> createState() => _MediaDetectionScreenState();
}

class _MediaDetectionScreenState extends State<MediaDetectionScreen> {
  final ImagePicker _picker = ImagePicker();

  _MediaType _selectedType = _MediaType.image;
  XFile? _selectedMedia;
  VideoPlayerController? _videoController;
  bool _isPicking = false;
  bool _isDetecting = false;
  bool _showResults = false;

  @override
  void dispose() {
    _videoController?.dispose();
    super.dispose();
  }

  Future<void> _pickMedia() async {
    if (_isPicking) return;
    setState(() => _isPicking = true);

    try {
      final XFile? picked = _selectedType == _MediaType.image
          ? await _picker.pickImage(source: ImageSource.gallery)
          : await _picker.pickVideo(source: ImageSource.gallery);

      if (picked == null) return;

      if (_selectedType == _MediaType.video) {
        final controller = VideoPlayerController.file(File(picked.path));
        await controller.initialize();
        await controller.setLooping(true);
        await controller.play();
        _videoController?.dispose();
        _videoController = controller;
      } else {
        _videoController?.dispose();
        _videoController = null;
      }

      if (!mounted) return;
      setState(() {
        _selectedMedia = picked;
        _showResults = false;
      });
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to pick media. Please try again.')),
      );
    } finally {
      if (mounted) {
        setState(() => _isPicking = false);
      }
    }
  }

  Future<void> _runDetection() async {
    if (_selectedMedia == null || _isDetecting) return;
    setState(() {
      _isDetecting = true;
      _showResults = false;
    });
    await Future<void>.delayed(const Duration(seconds: 2));
    if (!mounted) return;
    setState(() {
      _isDetecting = false;
      _showResults = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          'UPLOAD DETECTION',
          style: GoogleFonts.orbitron(
            fontSize: 16,
            color: AppColors.white,
            fontWeight: FontWeight.w600,
            letterSpacing: 1,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(14, 0, 14, 18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'DETECTION SOURCE',
              style: GoogleFonts.poppins(
                fontSize: 10,
                color: AppColors.primary,
                letterSpacing: 0.9,
              ),
            ),
            const SizedBox(height: 8),
            _MediaTypeSwitcher(
              selectedType: _selectedType,
              onSelected: (type) {
                if (type == _selectedType) return;
                setState(() {
                  _selectedType = type;
                  _selectedMedia = null;
                  _showResults = false;
                });
                _videoController?.dispose();
                _videoController = null;
              },
            ),
            const SizedBox(height: 14),
            _PreviewCard(
              selectedType: _selectedType,
              selectedMedia: _selectedMedia,
              videoController: _videoController,
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _isPicking ? null : _pickMedia,
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(
                        color: AppColors.primary.withValues(alpha: 0.6),
                      ),
                    ),
                    icon: Icon(
                      _selectedType == _MediaType.image
                          ? Icons.add_photo_alternate_outlined
                          : Icons.video_library_outlined,
                      color: AppColors.primary,
                    ),
                    label: Text(
                      _isPicking
                          ? 'PICKING...'
                          : _selectedType == _MediaType.image
                              ? 'UPLOAD IMAGE'
                              : 'UPLOAD VIDEO',
                      style: GoogleFonts.poppins(
                        fontSize: 10,
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _selectedMedia == null || _isDetecting
                        ? null
                        : _runDetection,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: AppColors.white,
                      disabledBackgroundColor: AppColors.primary.withValues(
                        alpha: 0.35,
                      ),
                    ),
                    icon: _isDetecting
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: AppColors.white,
                            ),
                          )
                        : const Icon(Icons.play_arrow_rounded),
                    label: Text(
                      _isDetecting ? 'DETECTING...' : 'RUN DETECTION',
                      style: GoogleFonts.poppins(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.6,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            if (_showResults) const _DetectionResultsCard(),
          ],
        ),
      ),
    );
  }
}

class _MediaTypeSwitcher extends StatelessWidget {
  const _MediaTypeSwitcher({
    required this.selectedType,
    required this.onSelected,
  });

  final _MediaType selectedType;
  final ValueChanged<_MediaType> onSelected;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _SwitcherButton(
            label: 'IMAGE',
            icon: Icons.image_outlined,
            active: selectedType == _MediaType.image,
            onTap: () => onSelected(_MediaType.image),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _SwitcherButton(
            label: 'VIDEO',
            icon: Icons.videocam_outlined,
            active: selectedType == _MediaType.video,
            onTap: () => onSelected(_MediaType.video),
          ),
        ),
      ],
    );
  }
}

class _SwitcherButton extends StatelessWidget {
  const _SwitcherButton({
    required this.label,
    required this.icon,
    required this.active,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: active
              ? AppColors.primary.withValues(alpha: 0.16)
              : Colors.white.withValues(alpha: 0.03),
          border: Border.all(
            color: active
                ? AppColors.primary
                : Colors.white.withValues(alpha: 0.08),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 16, color: active ? AppColors.primary : AppColors.grey),
            const SizedBox(width: 6),
            Text(
              label,
              style: GoogleFonts.poppins(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: active ? AppColors.primary : AppColors.grey,
                letterSpacing: 0.6,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PreviewCard extends StatelessWidget {
  const _PreviewCard({
    required this.selectedType,
    required this.selectedMedia,
    required this.videoController,
  });

  final _MediaType selectedType;
  final XFile? selectedMedia;
  final VideoPlayerController? videoController;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 240,
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: Colors.white.withValues(alpha: 0.04),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      clipBehavior: Clip.hardEdge,
      child: selectedMedia == null
          ? Center(
              child: Text(
                selectedType == _MediaType.image
                    ? 'No image selected'
                    : 'No video selected',
                style: GoogleFonts.poppins(
                  fontSize: 12,
                  color: AppColors.grey,
                ),
              ),
            )
          : selectedType == _MediaType.image
              ? Image.file(File(selectedMedia!.path), fit: BoxFit.cover)
              : videoController == null || !videoController!.value.isInitialized
                  ? const Center(child: CircularProgressIndicator())
                  : AspectRatio(
                      aspectRatio: videoController!.value.aspectRatio,
                      child: VideoPlayer(videoController!),
                    ),
    );
  }
}

class _DetectionResultsCard extends StatelessWidget {
  const _DetectionResultsCard();

  @override
  Widget build(BuildContext context) {
    final detections = [
      ('PERSON', '96.4%', AppColors.statusBlue),
      ('BACKPACK', '88.1%', AppColors.primary),
      ('VEHICLE', '81.9%', AppColors.statusGreen),
    ];

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        color: Colors.white.withValues(alpha: 0.03),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'DETECTION RESULTS',
            style: GoogleFonts.poppins(
              fontSize: 11,
              color: AppColors.white,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 10),
          ...detections.map(
            (d) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Icon(Icons.circle, size: 8, color: d.$3),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      d.$1,
                      style: GoogleFonts.poppins(
                        fontSize: 11,
                        color: AppColors.mutedWhite,
                      ),
                    ),
                  ),
                  Text(
                    d.$2,
                    style: GoogleFonts.orbitron(
                      fontSize: 14,
                      color: d.$3,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
