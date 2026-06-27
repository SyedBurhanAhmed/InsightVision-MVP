import 'package:shared_preferences/shared_preferences.dart';

import '../../models/app_user.dart';
import 'api_client.dart';

class AuthService {
  AuthService._();
  static final AuthService instance = AuthService._();

  static const _tokenKey = 'auth_token';

  final ApiClient _api = ApiClient();
  AppUser? currentUser;

  ApiClient get api => _api;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_tokenKey);
    if (token == null) return;
    _api.setToken(token);
    try {
      final data = await _api.get('/api/auth/me');
      currentUser = AppUser.fromJson(data['user'] as Map<String, dynamic>);
    } catch (_) {
      await clearSession();
    }
  }

  Future<AppUser> register({
    required String name,
    required String email,
    required String password,
  }) async {
    final data = await _api.post(
      '/api/auth/register',
      body: {'name': name, 'email': email, 'password': password},
    );
    return _persistAuth(data);
  }

  Future<AppUser> login({
    required String email,
    required String password,
  }) async {
    final data = await _api.post(
      '/api/auth/login',
      body: {'email': email, 'password': password},
    );
    return _persistAuth(data);
  }

  Future<AppUser> _persistAuth(Map<String, dynamic> data) async {
    final token = data['token'] as String;
    final user = AppUser.fromJson(data['user'] as Map<String, dynamic>);
    _api.setToken(token);
    currentUser = user;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    return user;
  }

  Future<void> clearSession() async {
    _api.setToken(null);
    currentUser = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }

  bool get isLoggedIn => currentUser != null;
}
