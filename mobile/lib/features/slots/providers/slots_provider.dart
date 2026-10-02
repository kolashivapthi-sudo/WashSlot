import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_error.dart';
import '../models/slot.dart';

// ─── State ────────────────────────────────────────────────────────────────────

class SlotsState {
  final List<Slot> slots;
  final bool isLoading;
  final String? error;
  final DateTime? lastUpdated;

  const SlotsState({
    this.slots = const [],
    this.isLoading = false,
    this.error,
    this.lastUpdated,
  });

  /// Slots filtered to a specific machine
  List<Slot> forMachine(String machineId) =>
      slots.where((s) => s.machineId == machineId).toList();

  SlotsState copyWith({
    List<Slot>? slots,
    bool? isLoading,
    String? error,
    DateTime? lastUpdated,
  }) {
    return SlotsState(
      slots: slots ?? this.slots,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }
}

// ─── Notifier ─────────────────────────────────────────────────────────────────

class SlotsNotifier extends StateNotifier<SlotsState> {
  Timer? _pollingTimer;

  SlotsNotifier() : super(const SlotsState(isLoading: true)) {
    fetch();
    _startPolling();
  }

  /// Poll every 20 seconds — picks up booking changes from other users in near real-time
  void _startPolling() {
    _pollingTimer = Timer.periodic(
      const Duration(seconds: 20),
      (_) => fetch(silent: true),
    );
  }

  Future<void> fetch({bool silent = false}) async {
    if (!silent) {
      state = state.copyWith(isLoading: true, error: null);
    }
    try {
      final response = await apiClient.get('/slots/next24');
      final data = response.data as List<dynamic>;
      final slots = data
          .map((json) => Slot.fromJson(json as Map<String, dynamic>))
          .toList();
      state = state.copyWith(
        slots: slots,
        isLoading: false,
        lastUpdated: DateTime.now(),
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: parseApiError(e),
      );
    }
  }

  /// Called locally after a booking or cancellation so the UI updates
  /// instantly without waiting for the next poll.
  void updateSlotStatus(String slotId, SlotStatus newStatus) {
    final updated = state.slots.map((s) {
      if (s.id == slotId) {
        return Slot(
          id: s.id,
          machineId: s.machineId,
          startTime: s.startTime,
          endTime: s.endTime,
          status: newStatus,
          bookedByUserId: s.bookedByUserId,
        );
      }
      return s;
    }).toList();
    state = state.copyWith(slots: updated);
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

final slotsProvider = StateNotifierProvider<SlotsNotifier, SlotsState>((ref) {
  return SlotsNotifier();
});
