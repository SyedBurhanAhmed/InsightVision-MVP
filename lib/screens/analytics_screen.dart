import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/constants/app_colors.dart';
import '../core/services/data_service.dart';
import '../models/analytics_summary.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  static const _rangeFilters = ['LIVE', '1H', '24H'];
  int _selectedRangeIndex = 0;
  int _selectedLatencyBar = 4;
  bool _showCriticalNodesOnly = false;
  AnalyticsSummary? _summary;

  @override
  void initState() {
    super.initState();
    _loadSummary();
  }

  Future<void> _loadSummary() async {
    try {
      final summary = await DataService.instance.fetchAnalyticsSummary();
      if (mounted) setState(() => _summary = summary);
    } catch (_) {
      // Keep local chart defaults if API is unavailable.
    }
  }

  final List<_LatencyPoint> _latencyData = const [
    _LatencyPoint('00:00', 0.58),
    _LatencyPoint('00:05', 0.72),
    _LatencyPoint('00:10', 0.46),
    _LatencyPoint('00:15', 0.64),
    _LatencyPoint('00:20', 0.78),
    _LatencyPoint('00:25', 0.68),
    _LatencyPoint('00:30', 0.63),
    _LatencyPoint('00:35', 0.45),
    _LatencyPoint('00:40', 0.30),
    _LatencyPoint('00:45', 0.62),
    _LatencyPoint('00:50', 0.70),
    _LatencyPoint('00:55', 0.76),
  ];

  final List<_NodeHealth> _nodeHealth = const [
    _NodeHealth(id: 'NODE_TX_04', status: 'STABLE', latencyMs: 12),
    _NodeHealth(id: 'NODE_TX_05', status: 'STABLE', latencyMs: 13),
    _NodeHealth(id: 'NODE_SG_01', status: 'CRITICAL', latencyMs: 46),
    _NodeHealth(id: 'NODE_IN_03', status: 'WARNING', latencyMs: 31),
  ];

  List<_NodeHealth> get _visibleNodes {
    if (!_showCriticalNodesOnly) return _nodeHealth;
    return _nodeHealth
        .where((node) => node.status == 'CRITICAL' || node.status == 'WARNING')
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final selectedPoint = _latencyData[_selectedLatencyBar];

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeader(context),
          const SizedBox(height: 14),
          _buildMetricGrid(),
          const SizedBox(height: 10),
          _buildLatencyTrendsCard(selectedPoint),
          const SizedBox(height: 10),
          _buildDetectionFrequencyCard(),
          const SizedBox(height: 10),
          _buildFpsStabilityCard(),
          const SizedBox(height: 10),
          _buildNodeHealthCard(),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'INSIGHTVISION AI',
              style: GoogleFonts.poppins(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppColors.white.withValues(alpha: 0.95),
                letterSpacing: 1.0,
              ),
            ),
            const Spacer(),
            Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.2),
                ),
              ),
              child: const Icon(Icons.person_rounded, size: 16, color: AppColors.white),
            ),
          ],
        ),
        const SizedBox(height: 14),
        Text(
          'PERFORMANCE_ANALYTICS',
          style: GoogleFonts.orbitron(
            fontSize: 26,
            color: AppColors.white,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.1,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          _summary == null
              ? 'SYSTEM_STATUS: OPTIMAL // LIVE_STREAM_ACTIVE'
              : 'SYSTEM_STATUS: ${_summary!.systemStatus} // DETECTIONS: ${_summary!.totalDetections} // FLAGGED: ${_summary!.flaggedCount}',
          style: GoogleFonts.poppins(
            fontSize: 10,
            color: AppColors.primary,
            letterSpacing: 1.1,
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: List.generate(_rangeFilters.length, (index) {
            final active = index == _selectedRangeIndex;
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: InkWell(
                borderRadius: BorderRadius.circular(999),
                onTap: () => setState(() => _selectedRangeIndex = index),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(999),
                    color: active
                        ? AppColors.primary.withValues(alpha: 0.2)
                        : Colors.white.withValues(alpha: 0.04),
                    border: Border.all(
                      color: active
                          ? AppColors.primary
                          : Colors.white.withValues(alpha: 0.10),
                    ),
                  ),
                  child: Text(
                    _rangeFilters[index],
                    style: GoogleFonts.poppins(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: active ? AppColors.primary : AppColors.mutedWhite,
                    ),
                  ),
                ),
              ),
            );
          }),
        ),
      ],
    );
  }

  Widget _buildMetricGrid() {
    final s = _summary;
    return GridView.count(
      crossAxisCount: 2,
      mainAxisSpacing: 8,
      crossAxisSpacing: 8,
      childAspectRatio: 2.25,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      children: [
        _MetricCard(
          label: 'AVG_LATENCY',
          value: '${s?.avgLatencyMs ?? 24}',
          unit: 'MS',
        ),
        _MetricCard(
          label: 'DETECTIONS',
          value: '${s?.totalDetections ?? 0}',
          unit: 'TTL',
        ),
        _MetricCard(
          label: 'COMPLETED',
          value: '${s?.completedCount ?? 0}',
          unit: 'OK',
        ),
        _MetricCard(
          label: 'VLM_QUERIES',
          value: '${s?.totalQueries ?? 0}',
          unit: 'LOG',
        ),
      ],
    );
  }

  Widget _buildLatencyTrendsCard(_LatencyPoint selectedPoint) {
    return _AnalyticsCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _sectionTitle('LATENCY_TRENDS'),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(999),
                  color: AppColors.primary.withValues(alpha: 0.18),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.45)),
                ),
                child: Text(
                  _rangeFilters[_selectedRangeIndex],
                  style: GoogleFonts.poppins(
                    fontSize: 9,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ],
          ),
          Text(
            'REAL-TIME INFERENCE DELAY (MS)',
            style: GoogleFonts.poppins(
              fontSize: 9,
              color: AppColors.grey,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 96,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: List.generate(_latencyData.length, (index) {
                final active = index == _selectedLatencyBar;
                return Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _selectedLatencyBar = index),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      height: 20 + (_latencyData[index].normalized * 70),
                      decoration: BoxDecoration(
                        color: active
                            ? AppColors.primary
                            : AppColors.white.withValues(alpha: 0.22),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                selectedPoint.timeLabel,
                style: GoogleFonts.poppins(fontSize: 9, color: AppColors.grey),
              ),
              const Spacer(),
              Text(
                'Selected: ${(selectedPoint.normalized * 40 + 12).toStringAsFixed(1)}ms',
                style: GoogleFonts.poppins(
                  fontSize: 10,
                  color: AppColors.white.withValues(alpha: 0.85),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDetectionFrequencyCard() {
    return _AnalyticsCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle('DETECTION_FREQUENCY'),
          Text(
            'OBJECT CLASS DISTRIBUTION RATE',
            style: GoogleFonts.poppins(
              fontSize: 9,
              color: AppColors.grey,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 12),
          const _ClassMetric(
            label: 'HUMAN_CLASS',
            value: 0.842,
            color: AppColors.primary,
          ),
          const SizedBox(height: 10),
          const _ClassMetric(
            label: 'VEHICLE_CLASS',
            value: 0.421,
            color: AppColors.statusBlue,
          ),
          const SizedBox(height: 10),
          const _ClassMetric(
            label: 'ANOMALY_CLASS',
            value: 0.185,
            color: AppColors.statusGreen,
          ),
        ],
      ),
    );
  }

  Widget _buildFpsStabilityCard() {
    const stability = 0.90;
    return _AnalyticsCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle('FPS_STABILITY'),
          const SizedBox(height: 12),
          Center(
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 96,
                  height: 96,
                  child: CircularProgressIndicator(
                    value: stability,
                    strokeWidth: 5,
                    color: AppColors.primary,
                    backgroundColor: Colors.white.withValues(alpha: 0.1),
                  ),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '90',
                      style: GoogleFonts.orbitron(
                        fontSize: 28,
                        color: AppColors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      'FPS',
                      style: GoogleFonts.poppins(
                        fontSize: 9,
                        color: AppColors.mutedWhite,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Center(
            child: Text(
              'Consistent frame pacing across nodes.',
              style: GoogleFonts.poppins(
                fontSize: 10,
                color: AppColors.mutedWhite,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNodeHealthCard() {
    return _AnalyticsCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _sectionTitle('NODE_HEALTH_LOGS'),
              const Spacer(),
              InkWell(
                borderRadius: BorderRadius.circular(10),
                onTap: () => setState(() {
                  _showCriticalNodesOnly = !_showCriticalNodesOnly;
                }),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(8),
                    color: _showCriticalNodesOnly
                        ? AppColors.primary.withValues(alpha: 0.16)
                        : Colors.white.withValues(alpha: 0.04),
                    border: Border.all(
                      color: _showCriticalNodesOnly
                          ? AppColors.primary
                          : Colors.white.withValues(alpha: 0.08),
                    ),
                  ),
                  child: Text(
                    _showCriticalNodesOnly ? 'CRITICAL' : 'ALL',
                    style: GoogleFonts.poppins(
                      fontSize: 9,
                      fontWeight: FontWeight.w600,
                      color: _showCriticalNodesOnly ? AppColors.primary : AppColors.mutedWhite,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ..._visibleNodes.map((node) {
            final color = switch (node.status) {
              'STABLE' => AppColors.primary,
              'WARNING' => Colors.amberAccent,
              _ => Colors.redAccent,
            };
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: color),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      node.id,
                      style: GoogleFonts.orbitron(
                        fontSize: 12,
                        color: AppColors.white,
                      ),
                    ),
                  ),
                  Text(
                    node.status,
                    style: GoogleFonts.poppins(
                      fontSize: 10,
                      color: color,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${node.latencyMs}ms',
                    style: GoogleFonts.poppins(
                      fontSize: 10,
                      color: AppColors.grey,
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _sectionTitle(String text) {
    return Text(
      text,
      style: GoogleFonts.orbitron(
        fontSize: 22,
        color: AppColors.white,
        fontWeight: FontWeight.w600,
      ),
    );
  }
}

class _AnalyticsCard extends StatelessWidget {
  const _AnalyticsCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(10, 10, 10, 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF11141B), Color(0xFF0A0C11)],
        ),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: child,
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.label,
    required this.value,
    required this.unit,
  });

  final String label;
  final String value;
  final String unit;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        color: Colors.white.withValues(alpha: 0.04),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: GoogleFonts.poppins(
              fontSize: 9,
              color: AppColors.grey,
              letterSpacing: 0.8,
            ),
          ),
          const Spacer(),
          RichText(
            text: TextSpan(
              style: GoogleFonts.orbitron(
                fontSize: 32,
                fontWeight: FontWeight.w700,
                color: AppColors.white,
              ),
              children: [
                TextSpan(text: value),
                TextSpan(
                  text: ' $unit',
                  style: GoogleFonts.poppins(
                    fontSize: 10,
                    color: AppColors.mutedWhite,
                    letterSpacing: 0.7,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ClassMetric extends StatelessWidget {
  const _ClassMetric({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final double value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              label,
              style: GoogleFonts.poppins(
                fontSize: 10,
                color: AppColors.white,
              ),
            ),
            const Spacer(),
            Text(
              '${(value * 100).toStringAsFixed(1)}%',
              style: GoogleFonts.poppins(
                fontSize: 10,
                color: color,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 5),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            value: value,
            minHeight: 3,
            color: color,
            backgroundColor: Colors.white.withValues(alpha: 0.08),
          ),
        ),
      ],
    );
  }
}

class _LatencyPoint {
  const _LatencyPoint(this.timeLabel, this.normalized);
  final String timeLabel;
  final double normalized;
}

class _NodeHealth {
  const _NodeHealth({
    required this.id,
    required this.status,
    required this.latencyMs,
  });

  final String id;
  final String status;
  final int latencyMs;
}
