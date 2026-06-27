import '../../models/analytics_summary.dart';
import '../../models/history_session.dart';
import '../../models/vlm_query_record.dart';
import 'auth_service.dart';

class DataService {
  DataService._();
  static final DataService instance = DataService._();

  Future<List<HistorySession>> fetchDetections() async {
    final data = await AuthService.instance.api.get('/api/detections');
    final list = data['detections'] as List<dynamic>;
    return list
        .map((e) => HistorySession.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<VlmQueryRecord>> fetchQueries() async {
    final data = await AuthService.instance.api.get('/api/queries');
    final list = data['queries'] as List<dynamic>;
    return list
        .map((e) => VlmQueryRecord.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<AnalyticsSummary> fetchAnalyticsSummary() async {
    final data = await AuthService.instance.api.get('/api/analytics/summary');
    return AnalyticsSummary.fromJson(data);
  }
}
