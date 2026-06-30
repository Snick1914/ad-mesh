class User {
  final int id;
  final String fullName;
  final String email;
  final String phone;
  final bool isActive;
  final bool isSuperuser;
  final int maxDevices;
  final double maxStorageGb;

  User({
    required this.id,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.isActive,
    required this.isSuperuser,
    required this.maxDevices,
    required this.maxStorageGb,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? 0,
      fullName: json['full_name'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      isActive: json['is_active'] ?? false,
      isSuperuser: json['is_superuser'] ?? false,
      maxDevices: json['max_devices'] ?? 0,
      maxStorageGb: (json['max_storage_gb'] ?? 0.0).toDouble(),
    );
  }

  User copyWith({
    int? id,
    String? fullName,
    String? email,
    String? phone,
    bool? isActive,
    bool? isSuperuser,
    int? maxDevices,
    double? maxStorageGb,
  }) {
    return User(
      id: id ?? this.id,
      fullName: fullName ?? this.fullName,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      isActive: isActive ?? this.isActive,
      isSuperuser: isSuperuser ?? this.isSuperuser,
      maxDevices: maxDevices ?? this.maxDevices,
      maxStorageGb: maxStorageGb ?? this.maxStorageGb,
    );
  }

  static List<User> mockList() {
    return [
      User(id: 1, fullName: "Roberto Olmos", email: "roberto@admesh.com", phone: "5512345678", isActive: true, isSuperuser: true, maxDevices: 20, maxStorageGb: 100.0),
      User(id: 2, fullName: "Gimnasio FitZone", email: "admin@fitzone.com", phone: "5598765432", isActive: true, isSuperuser: false, maxDevices: 8, maxStorageGb: 25.0),
      User(id: 3, fullName: "Restaurante El Gourmet", email: "contacto@elgourmet.mx", phone: "5577665544", isActive: true, isSuperuser: false, maxDevices: 4, maxStorageGb: 15.0),
      User(id: 4, fullName: "Tienda ModaExpress", email: "compras@modaexpress.com", phone: "5522334455", isActive: false, isSuperuser: false, maxDevices: 5, maxStorageGb: 10.0),
    ];
  }
}
