import '../../slots/models/slot.dart';
import '../../machines/models/machine.dart';

enum BookingStatus { confirmed, cancelled, completed, noShow }

class Booking {
  final String id;
  final String userId;
  final String slotId;
  final BookingStatus status;
  final DateTime bookedAt;
  final DateTime? cancelledAt;
  final DateTime? completedAt;
  final Slot? slot;
  final Machine? machine;

  const Booking({
    required this.id,
    required this.userId,
    required this.slotId,
    required this.status,
    required this.bookedAt,
    this.cancelledAt,
    this.completedAt,
    this.slot,
    this.machine,
  });

  factory Booking.fromJson(Map<String, dynamic> json) {
    // slot is nested: json['slot'] contains machine inside it
    final slotJson = json['slot'] as Map<String, dynamic>?;
    final machineJson = slotJson?['machine'] as Map<String, dynamic>?;

    return Booking(
      id: json['id'] as String,
      userId: json['userId'] as String,
      slotId: json['slotId'] as String,
      status: _parseStatus(json['status'] as String),
      bookedAt: DateTime.parse(json['bookedAt'] as String).toLocal(),
      cancelledAt: json['cancelledAt'] != null
          ? DateTime.parse(json['cancelledAt'] as String).toLocal()
          : null,
      completedAt: json['completedAt'] != null
          ? DateTime.parse(json['completedAt'] as String).toLocal()
          : null,
      slot: slotJson != null ? Slot.fromJson(slotJson) : null,
      machine: machineJson != null ? Machine.fromJson(machineJson) : null,
    );
  }

  static BookingStatus _parseStatus(String raw) {
    switch (raw) {
      case 'CANCELLED':
        return BookingStatus.cancelled;
      case 'COMPLETED':
        return BookingStatus.completed;
      case 'NO_SHOW':
        return BookingStatus.noShow;
      case 'CONFIRMED':
      default:
        return BookingStatus.confirmed;
    }
  }

  bool get isActive => status == BookingStatus.confirmed;

  bool get isCancellable {
    if (status != BookingStatus.confirmed) return false;
    if (slot == null) return false;
    return DateTime.now().isBefore(slot!.startTime);
  }

  String get statusLabel {
    switch (status) {
      case BookingStatus.confirmed:
        return slot?.isActive == true ? 'In Progress' : 'Confirmed';
      case BookingStatus.cancelled:
        return 'Cancelled';
      case BookingStatus.completed:
        return 'Completed';
      case BookingStatus.noShow:
        return 'No Show';
    }
  }
}
