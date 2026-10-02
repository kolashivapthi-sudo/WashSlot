import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_error.dart';
import '../models/booking.dart';

// ─── State ────────────────────────────────────────────────────────────────────

class BookingsState {
  final List<Booking> bookings;
  final Booking? activeBooking;
  final bool isLoading;
  final bool isActing; // true while booking/cancelling
  final String? error;
  final String? actionError;
  final String? successMessage;

  const BookingsState({
    this.bookings = const [],
    this.activeBooking,
    this.isLoading = false,
    this.isActing = false,
    this.error,
    this.actionError,
    this.successMessage,
  });

  BookingsState copyWith({
    List<Booking>? bookings,
    Booking? activeBooking,
    bool clearActive = false,
    bool? isLoading,
    bool? isActing,
    String? error,
    String? actionError,
    String? successMessage,
  }) {
    return BookingsState(
      bookings: bookings ?? this.bookings,
      activeBooking: clearActive ? null : (activeBooking ?? this.activeBooking),
      isLoading: isLoading ?? this.isLoading,
      isActing: isActing ?? this.isActing,
      error: error,
      actionError: actionError,
      successMessage: successMessage,
    );
  }
}

// ─── Notifier ─────────────────────────────────────────────────────────────────

class BookingsNotifier extends StateNotifier<BookingsState> {
  BookingsNotifier() : super(const BookingsState(isLoading: true)) {
    fetchAll();
  }

  Future<void> fetchAll() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final results = await Future.wait([
        apiClient.get('/bookings/my'),
        apiClient.get('/bookings/active'),
      ]);

      final allData = results[0].data as List<dynamic>;
      final bookings = allData
          .map((j) => Booking.fromJson(j as Map<String, dynamic>))
          .toList();

      final activeData = results[1].data;
      final activeBooking = activeData != null
          ? Booking.fromJson(activeData as Map<String, dynamic>)
          : null;

      state = state.copyWith(
        bookings: bookings,
        activeBooking: activeBooking,
        clearActive: activeBooking == null,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: parseApiError(e));
    }
  }

  // ─── Book ──────────────────────────────────────────────────────────────────

  Future<bool> book(String slotId) async {
    state = state.copyWith(isActing: true, actionError: null, successMessage: null);
    try {
      final response = await apiClient.post('/bookings/$slotId');
      final newBooking = Booking.fromJson(response.data as Map<String, dynamic>);

      state = state.copyWith(
        bookings: [newBooking, ...state.bookings],
        activeBooking: newBooking,
        isActing: false,
        successMessage: 'Slot booked! You\'ll get a reminder 30 min before.',
      );
      return true;
    } catch (e) {
      state = state.copyWith(isActing: false, actionError: parseApiError(e));
      return false;
    }
  }

  // ─── Cancel ────────────────────────────────────────────────────────────────

  Future<bool> cancel(String bookingId) async {
    state = state.copyWith(isActing: true, actionError: null, successMessage: null);
    try {
      await apiClient.delete('/bookings/$bookingId');

      // Update local state — mark booking as cancelled
      final updated = state.bookings.map((b) {
        if (b.id == bookingId) {
          return Booking(
            id: b.id,
            userId: b.userId,
            slotId: b.slotId,
            status: BookingStatus.cancelled,
            bookedAt: b.bookedAt,
            cancelledAt: DateTime.now(),
            slot: b.slot,
            machine: b.machine,
          );
        }
        return b;
      }).toList();

      state = state.copyWith(
        bookings: updated,
        clearActive: true,
        isActing: false,
        successMessage: 'Booking cancelled.',
      );
      return true;
    } catch (e) {
      state = state.copyWith(isActing: false, actionError: parseApiError(e));
      return false;
    }
  }

  void clearMessages() {
    state = state.copyWith(actionError: null, successMessage: null);
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

final bookingsProvider = StateNotifierProvider<BookingsNotifier, BookingsState>((ref) {
  return BookingsNotifier();
});
