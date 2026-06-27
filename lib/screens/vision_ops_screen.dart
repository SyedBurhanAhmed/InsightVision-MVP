import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/constants/app_colors.dart';

class VisionOpsScreen extends StatefulWidget {
  const VisionOpsScreen({super.key});

  @override
  State<VisionOpsScreen> createState() => _VisionOpsScreenState();
}

class _VisionOpsScreenState extends State<VisionOpsScreen> {
  final TextEditingController _queryController = TextEditingController();
  int _activeMode = 0;
  int _activeCluster = 0;

  final List<String> _modes = const ['PROMPT', 'TUNING'];

  @override
  void dispose() {
    _queryController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const clusters = [
      (
        title: 'Anomalous Trajectory',
        value: '98.4%',
        info:
            "Subject identified as HUMAN matching Sample_01 behavior; rapid movement near restricted Zone_B.",
        cam: 'CAM_01',
      ),
      (
        title: 'Static Target Match',
        value: '82.1%',
        info:
            "Object matching VEHICLE_TARGET metadata detected in stationary position for >300s.",
        cam: 'CAM_15',
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          'VISION OPERATIONS',
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
              'NATURAL LANGUAGE VLM QUERY',
              style: GoogleFonts.poppins(
                fontSize: 10,
                color: AppColors.primary,
                letterSpacing: 0.9,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: _panelDecoration(),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _queryController,
                      style: GoogleFonts.poppins(
                        fontSize: 11,
                        color: AppColors.white,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Search objects, behavior, events...',
                        hintStyle: GoogleFonts.poppins(
                          fontSize: 10,
                          color: AppColors.grey,
                        ),
                        isDense: true,
                        border: InputBorder.none,
                      ),
                    ),
                  ),
                  ElevatedButton(
                    onPressed: () {
                      final text = _queryController.text.trim();
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            text.isEmpty
                                ? 'Enter a query to execute.'
                                : 'Query submitted: $text',
                          ),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: AppColors.white,
                      minimumSize: const Size(74, 30),
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                    ),
                    child: Text(
                      'EXECUTE',
                      style: GoogleFonts.poppins(
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                _section('FEW-SHOT\nCONFIGURATION'),
                const Spacer(),
                Wrap(
                  spacing: 6,
                  children: List.generate(_modes.length, (i) {
                    final active = i == _activeMode;
                    return InkWell(
                      onTap: () => setState(() => _activeMode = i),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(999),
                          color: active
                              ? AppColors.statusBlue.withValues(alpha: 0.2)
                              : Colors.white.withValues(alpha: 0.04),
                        ),
                        child: Text(
                          _modes[i],
                          style: GoogleFonts.poppins(
                            fontSize: 8,
                            color: active ? AppColors.statusBlue : AppColors.grey,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    );
                  }),
                ),
              ],
            ),
            const SizedBox(height: 10),
            const Row(
              children: [
                Expanded(
                  child: _FewShotCard(
                    title: 'HUMAN_SAMPLE_05',
                    subtitle: 'USE AS EXAMPLE',
                  ),
                ),
                SizedBox(width: 8),
                Expanded(
                  child: _FewShotCard(
                    title: 'VEH_TARGET_09',
                    subtitle: 'USE AS TARGET',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {},
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: AppColors.primary.withValues(alpha: 0.5)),
                    ),
                    child: Text(
                      'ADD SAMPLE',
                      style: GoogleFonts.poppins(
                        fontSize: 9,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {},
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: Colors.white.withValues(alpha: 0.2)),
                    ),
                    child: Text(
                      'RUN PIPELINE',
                      style: GoogleFonts.poppins(
                        fontSize: 9,
                        color: AppColors.mutedWhite,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _section('DETECTION\nCLUSTERS'),
            const SizedBox(height: 10),
            ...List.generate(clusters.length, (i) {
              final c = clusters[i];
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _ClusterCard(
                  title: c.title,
                  confidence: c.value,
                  info: c.info,
                  camera: c.cam,
                  selected: _activeCluster == i,
                  onTap: () => setState(() => _activeCluster = i),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  BoxDecoration _panelDecoration() {
    return BoxDecoration(
      borderRadius: BorderRadius.circular(14),
      color: Colors.white.withValues(alpha: 0.04),
      border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
    );
  }

  Widget _section(String text) {
    return Text(
      text,
      style: GoogleFonts.orbitron(
        fontSize: 18,
        color: AppColors.white,
        fontWeight: FontWeight.w600,
      ),
    );
  }
}

class _FewShotCard extends StatelessWidget {
  const _FewShotCard({
    required this.title,
    required this.subtitle,
  });

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 78,
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        color: Colors.white.withValues(alpha: 0.03),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                gradient: const LinearGradient(
                  colors: [Color(0xFF403E42), Color(0xFF12141B)],
                ),
              ),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: GoogleFonts.poppins(fontSize: 8, color: AppColors.white),
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            subtitle,
            style: GoogleFonts.poppins(fontSize: 7, color: AppColors.grey),
          ),
        ],
      ),
    );
  }
}

class _ClusterCard extends StatelessWidget {
  const _ClusterCard({
    required this.title,
    required this.confidence,
    required this.info,
    required this.camera,
    required this.selected,
    required this.onTap,
  });

  final String title;
  final String confidence;
  final String info;
  final String camera;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? AppColors.statusBlue : Colors.white.withValues(alpha: 0.08),
          ),
          color: Colors.white.withValues(alpha: 0.03),
        ),
        child: Column(
          children: [
            Container(
              height: 92,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(10),
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF1B426B), Color(0xFF0E1117)],
                ),
              ),
              child: Align(
                alignment: Alignment.topLeft,
                child: Container(
                  margin: const EdgeInsets.all(6),
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(999),
                    color: Colors.black.withValues(alpha: 0.5),
                  ),
                  child: Text(
                    camera,
                    style: GoogleFonts.poppins(
                      fontSize: 8,
                      color: AppColors.statusBlue,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: GoogleFonts.poppins(
                      fontSize: 11,
                      color: AppColors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Text(
                  confidence,
                  style: GoogleFonts.orbitron(
                    fontSize: 17,
                    color: AppColors.statusBlue,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              info,
              style: GoogleFonts.poppins(
                fontSize: 9,
                color: AppColors.mutedWhite,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
