class SummaryData {
  final UserSummary users;
  final DeviceSummary devices;
  final StorageSummary storage;
  final ServerSummary server;

  SummaryData({
    required this.users,
    required this.devices,
    required this.storage,
    required this.server,
  });

  factory SummaryData.fromJson(Map<String, dynamic> json) {
    return SummaryData(
      users: UserSummary.fromJson(json['users']),
      devices: DeviceSummary.fromJson(json['devices']),
      storage: StorageSummary.fromJson(json['storage']),
      server: ServerSummary.fromJson(json['server']),
    );
  }

  factory SummaryData.mock() {
    return SummaryData(
      users: UserSummary(total: 12, active: 10, suspended: 2),
      devices: DeviceSummary(total: 45, online: 38, offline: 7),
      storage: StorageSummary(totalGb: 250, usedGb: 108),
      server: ServerSummary(cpuUsage: 18.4, memoryUsage: 44.1, dbStatus: 'online'),
    );
  }
}

class UserSummary {
  final int total;
  final int active;
  final int suspended;

  UserSummary({required this.total, required this.active, required this.suspended});

  factory UserSummary.fromJson(Map<String, dynamic> json) {
    return UserSummary(
      total: json['total'] ?? 0,
      active: json['active'] ?? 0,
      suspended: json['suspended'] ?? 0,
    );
  }
}

class DeviceSummary {
  final int total;
  final int online;
  final int offline;

  DeviceSummary({required this.total, required this.online, required this.offline});

  factory DeviceSummary.fromJson(Map<String, dynamic> json) {
    return DeviceSummary(
      total: json['total'] ?? 0,
      online: json['online'] ?? 0,
      offline: json['offline'] ?? 0,
    );
  }
}

class StorageSummary {
  final double totalGb;
  final double usedGb;

  StorageSummary({required this.totalGb, required this.usedGb});

  factory StorageSummary.fromJson(Map<String, dynamic> json) {
    return StorageSummary(
      totalGb: (json['total_gb'] ?? 0.0).toDouble(),
      usedGb: (json['used_gb'] ?? 0.0).toDouble(),
    );
  }
}

class ServerSummary {
  final double cpuUsage;
  final double memoryUsage;
  final String dbStatus;

  ServerSummary({required this.cpuUsage, required this.memoryUsage, required this.dbStatus});

  factory ServerSummary.fromJson(Map<String, dynamic> json) {
    return ServerSummary(
      cpuUsage: (json['cpu_usage'] ?? 0.0).toDouble(),
      memoryUsage: (json['memory_usage'] ?? 0.0).toDouble(),
      dbStatus: json['db_status'] ?? 'offline',
    );
  }
}
