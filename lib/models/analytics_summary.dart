class AnalyticsSummary {
  const AnalyticsSummary({
    required this.totalDetections,
    required this.flaggedCount,
    required this.completedCount,
    required this.totalQueries,
    required this.systemStatus,
    required this.avgLatencyMs,
  });

  final int totalDetections;
  final int flaggedCount;
  final int completedCount;
  final int totalQueries;
  final String systemStatus;
  final int avgLatencyMs;

  factory AnalyticsSummary.fromJson(Map<String, dynamic> json) {
    final s = json['summary'] as Map<String, dynamic>;
    return AnalyticsSummary(
      totalDetections: s['totalDetections'] as int? ?? 0,
      flaggedCount: s['flaggedCount'] as int? ?? 0,
      completedCount: s['completedCount'] as int? ?? 0,
      totalQueries: s['totalQueries'] as int? ?? 0,
      systemStatus: s['systemStatus'] as String? ?? 'STABLE',
      avgLatencyMs: s['avgLatencyMs'] as int? ?? 14,
    );
  }
}
