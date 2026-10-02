import 'package:flutter/material.dart';

enum SlotStatus { available, booked, blocked, completed, noShow }

class Slot {
  final String id;
  final String machineId;
  final DateTime startTime;
  final DateTime endTime;
  final SlotStatus status;
  final String? bookedByUserId; // non-null when booked

  const Slot({
    required this.id,
    required this.machineId,
    required this.startTime,
    required this.endTime,
    required this.status,
    this.bookedByUserId,
  });

  factory Slot.fromJson(Map<String, dynamic> json) {
    return Slot(
      id: json['id'] as String,
      machineId: json['machineId'] as String,
      startTime: DateTime.parse(json['startTime'] as String).toLocal(),
      endTime: DateTime.parse(json['endTime'] as String).toLocal(),
      status: _parseStatus(json['status'] as String),
      bookedByUserId: (json['booking'] as Map<String, dynamic>?)?['userId'] as String?,
    );
  }

  static SlotStatus _parseStatus(String raw) {
    switch (raw) {
      case 'BOOKED':
        return SlotStatus.booked;
      case 'BLOCKED':
        return SlotStatus.blocked;
      case 'COMPLETED':
        return SlotStatus.completed;
      case 'NO_SHOW':
        return SlotStatus.noShow;
      case 'AVAILABLE':
      default:
        return SlotStatus.available;
    }
  }

  // ─── Display helpers ───────────────────────────────────────────────────────

  /// Whether this slot can be booked by the current user
  bool get isBookable => status == SlotStatus.available;

  /// Whether the slot is currently active (running right now)
  bool get isActive {
    final now = DateTime.now();
    return now.isAfter(startTime) && now.isBefore(endTime);
  }

  /// Whether the slot is in the past
  bool get isPast => DateTime.now().isAfter(endTime);

  /// Formatted time range: "6:00 – 6:30 AM"
  String get timeRangeLabel {
    final start = _formatTime(startTime);
    final end = _formatTime(endTime);
    return '$start – $end';
  }

  String _formatTime(DateTime dt) {
    final hour = dt.hour;
    final minute = dt.minute.toString().padLeft(2, '0');
    final period = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour % 12 == 0 ? 12 : hour % 12;
    return '$displayHour:$minute $period';
  }

  // ─── Color coding ──────────────────────────────────────────────────────────
  // green = available, grey = booked, red = blocked/repair, orange = active/running

  Color get cardColor {
    if (isPast) return const Color(0xFFF3F4F6);
    switch (status) {
      case SlotStatus.available:
        return const Color(0xFFDCFCE7); // light green
      case SlotStatus.booked:
        return isActive
            ? const Color(0xFFFFF7ED) // orange tint if running now
            : const Color(0xFFF3F4F6); // grey
      case SlotStatus.blocked:
        return const Color(0xFFFEE2E2); // light red
      case SlotStatus.completed:
      case SlotStatus.noShow:
        return const Color(0xFFF3F4F6);
    }
  }

  Color get statusColor {
    if (isPast) return const Color(0xFF9CA3AF);
    switch (status) {
      case SlotStatus.available:
        return const Color(0xFF2D6A4F); // green
      case SlotStatus.booked:
        return isActive
            ? const Color(0xFFD97706) // orange — running
            : const Color(0xFF6C757D); // grey
      case SlotStatus.blocked:
        return const Color(0xFFDC2626); // red
      case SlotStatus.completed:
      case SlotStatus.noShow:
        return const Color(0xFF9CA3AF);
    }
  }

  String get statusLabel {
    if (isPast && status == SlotStatus.available) return 'Passed';
    switch (status) {
      case SlotStatus.available:
        return 'Available';
      case SlotStatus.booked:
        return isActive ? 'In Use' : 'Booked';
      case SlotStatus.blocked:
        return 'Blocked';
      case SlotStatus.completed:
        return 'Done';
      case SlotStatus.noShow:
        return 'No Show';
    }
  }
}
