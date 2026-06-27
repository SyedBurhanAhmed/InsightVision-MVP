class AppUser {
  const AppUser({
    required this.id,
    required this.name,
    required this.email,
    required this.region,
    required this.accessLevel,
  });

  final String id;
  final String name;
  final String email;
  final String region;
  final String accessLevel;

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      region: json['region'] as String? ?? 'NORTH_CLUSTER_01',
      accessLevel: json['accessLevel'] as String? ?? 'SECURE_LINK / ACTIVE',
    );
  }
}
