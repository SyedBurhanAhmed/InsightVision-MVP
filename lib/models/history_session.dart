class HistorySession {
  const HistorySession({
    required this.id,
    required this.title,
    required this.summary,
    required this.time,
    required this.source,
    required this.status,
    required this.trackedObjects,
  });

  final String id;
  final String title;
  final String summary;
  final String time;
  final String source;
  final String status;
  final List<String> trackedObjects;

  factory HistorySession.fromJson(Map<String, dynamic> json) {
    return HistorySession(
      id: json['id'] as String,
      title: json['title'] as String,
      summary: json['summary'] as String,
      time: json['time'] as String,
      source: json['source'] as String,
      status: json['status'] as String,
      trackedObjects: (json['trackedObjects'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
    );
  }
}
