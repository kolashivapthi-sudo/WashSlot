import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_error.dart';
import '../models/machine.dart';

// ─── State ────────────────────────────────────────────────────────────────────

class MachinesState {
  final List<Machine> machines;
  final bool isLoading;
  final String? error;
  final DateTime? lastUpdated;

  const MachinesState({
    this.machines = const [],
    this.isLoading = false,
    this.error,
    this.lastUpdated,
  });

  MachinesState copyWith({
    List<Machine>? machines,
    bool? isLoading,
    String? error,
    DateTime? lastUpdated,
  }) {
    return MachinesState(
      machines: machines ?? this.machines,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }
}

// ─── Notifier ─────────────────────────────────────────────────────────────────

class MachinesNotifier extends StateNotifier<MachinesState> {
  Timer? _pollingTimer;

  MachinesNotifier() : super(const MachinesState(isLoading: true)) {
    fetch();
    _startPolling();
  }

  /// Polls every 15 seconds to reflect machine status changes made by admin
  void _startPolling() {
    _pollingTimer = Timer.periodic(const Duration(seconds: 15), (_) => fetch(silent: true));
  }

  Future<void> fetch({bool silent = false}) async {
    if (!silent) {
      state = state.copyWith(isLoading: true, error: null);
    }
    try {
      final response = await apiClient.get('/machines');
      final data = response.data as List<dynamic>;
      final machines = data
          .map((json) => Machine.fromJson(json as Map<String, dynamic>))
          .toList();
      state = state.copyWith(
        machines: machines,
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

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

final machinesProvider = StateNotifierProvider<MachinesNotifier, MachinesState>((ref) {
  return MachinesNotifier();
});
