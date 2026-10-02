/// Mirrors the Machine Prisma model returned from the API.
enum MachineStatus { available, inUse, underRepair }

class Machine {
  final String id;
  final String name;
  final String? description;
  final MachineStatus status;
  final bool isActive;
  final DateTime createdAt;

  const Machine({
    required this.id,
    required this.name,
    this.description,
    required this.status,
    required this.isActive,
    required this.createdAt,
  });

  factory Machine.fromJson(Map<String, dynamic> json) {
    return Machine(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      status: _parseStatus(json['status'] as String),
      isActive: json['isActive'] as bool? ?? true,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  static MachineStatus _parseStatus(String raw) {
    switch (raw) {
      case 'IN_USE':
        return MachineStatus.inUse;
      case 'UNDER_REPAIR':
        return MachineStatus.underRepair;
      case 'AVAILABLE':
      default:
        return MachineStatus.available;
    }
  }

  /// Human-readable status label
  String get statusLabel {
    switch (status) {
      case MachineStatus.available:
        return 'Available';
      case MachineStatus.inUse:
        return 'In Use';
      case MachineStatus.underRepair:
        return 'Under Repair';
    }
  }

  /// Whether this machine can be booked
  bool get isBookable => status == MachineStatus.available && isActive;
}
