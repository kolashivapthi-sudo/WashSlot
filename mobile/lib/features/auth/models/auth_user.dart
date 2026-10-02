/// Represents the logged-in user returned from the API.
class AuthUser {
  final String id;
  final String email;
  final String name;
  final String role;
  final bool isActive;
  final int noShowCount;

  const AuthUser({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    required this.isActive,
    required this.noShowCount,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String,
      role: json['role'] as String,
      isActive: json['isActive'] as bool? ?? true,
      noShowCount: json['noShowCount'] as int? ?? 0,
    );
  }

  bool get isAdmin => role == 'ADMIN' || role == 'SUPER_ADMIN';
  bool get isSuperAdmin => role == 'SUPER_ADMIN';
}
