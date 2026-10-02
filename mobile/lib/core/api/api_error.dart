import 'package:dio/dio.dart';

/// Extracts a readable error message from Dio exceptions.
/// Returns user-friendly strings — never raw stack traces.
String parseApiError(Object error) {
  if (error is DioException) {
    final data = error.response?.data;

    // NestJS validation errors come as a list under "message"
    if (data is Map && data['message'] != null) {
      final msg = data['message'];
      if (msg is List && msg.isNotEmpty) return msg.first.toString();
      if (msg is String) return msg;
    }

    switch (error.response?.statusCode) {
      case 400:
        return 'Invalid request. Please check your details.';
      case 401:
        return 'Invalid email or password.';
      case 403:
        return 'You do not have permission for this action.';
      case 404:
        return 'Not found.';
      case 409:
        return 'An account with this email already exists.';
      case 500:
        return 'Server error. Please try again later.';
    }

    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout) {
      return 'Connection timed out. Check your internet connection.';
    }
    if (error.type == DioExceptionType.connectionError) {
      return 'Could not reach the server. Check your connection.';
    }
  }
  return 'Something went wrong. Please try again.';
}
