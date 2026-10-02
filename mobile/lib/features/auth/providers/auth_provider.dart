import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../models/auth_user.dart';

const _storage = FlutterSecureStorage();
const _tokenKey = 'jwt_token';

// ─── Auth State ───────────────────────────────────────────────────────────────

class AuthState {
  final AuthUser? user;
  final bool isLoading;
  final String? error;

  const AuthState({this.user, this.isLoading = false, this.error});

  bool get isAuthenticated => user != null;

  AuthState copyWith({AuthUser? user, bool? isLoading, String? error}) {
    return AuthState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

// ─── Auth Notifier ────────────────────────────────────────────────────────────

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState(isLoading: true)) {
    _init();
  }

  /// On app start — check if a token exists and fetch user profile
  Future<void> _init() async {
    try {
      final token = await _storage.read(key: _tokenKey);
      if (token == null) {
        state = const AuthState();
        return;
      }
      final response = await apiClient.get('/auth/me');
      final user = AuthUser.fromJson(response.data as Map<String, dynamic>);
      state = AuthState(user: user);
    } catch (_) {
      // Token invalid or expired — clear it
      await _storage.delete(key: _tokenKey);
      state = const AuthState();
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await apiClient.post(
        '/auth/login',
        data: {'email': email, 'password': password},
      );
      final token = response.data['token'] as String;
      final user = AuthUser.fromJson(response.data['user'] as Map<String, dynamic>);
      await _storage.write(key: _tokenKey, value: token);
      state = AuthState(user: user);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _extractError(e));
    }
  }

  Future<void> register(String email, String password, String name) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await apiClient.post(
        '/auth/register',
        data: {'email': email, 'password': password, 'name': name},
      );
      final token = response.data['token'] as String;
      final user = AuthUser.fromJson(response.data['user'] as Map<String, dynamic>);
      await _storage.write(key: _tokenKey, value: token);
      state = AuthState(user: user);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _extractError(e));
    }
  }

  Future<void> logout() async {
    await _storage.delete(key: _tokenKey);
    state = const AuthState();
  }

  String _extractError(Object e) {
    // Use the shared API error parser
    return parseApiError(e);
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
