class VlmQueryRecord {
  const VlmQueryRecord({
    required this.id,
    required this.prompt,
    required this.result,
    required this.time,
  });

  final String id;
  final String prompt;
  final String result;
  final String time;

  factory VlmQueryRecord.fromJson(Map<String, dynamic> json) {
    return VlmQueryRecord(
      id: json['id'] as String,
      prompt: json['prompt'] as String,
      result: json['result'] as String,
      time: json['time'] as String,
    );
  }
}
