import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _baseUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://10.0.2.2:3000/api/v1', // Android emulator → localhost
);

const _storage = FlutterSecureStorage();

/// Singleton Dio client with auth interceptor.
/// Usage: apiClient.get('/slots/next24')
final Dio apiClient = _buildClient();

Dio _buildClient() {
  final dio = Dio(
    BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {'Content-Type': 'application/json'},
    ),
  );

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Attach JWT token to every request if present
        final token = await _storage.read(key: 'jwt_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) {
        // 401 — token expired or invalid, let auth state handle it
        if (error.response?.statusCode == 401) {
          _storage.delete(key: 'jwt_token');
        }
        return handler.next(error);
      },
    ),
  );

  return dio;
}
