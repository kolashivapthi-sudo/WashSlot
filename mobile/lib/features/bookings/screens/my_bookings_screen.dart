import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/bookings_provider.dart';
import '../models/booking.dart';

class MyBookingsScreen extends ConsumerWidget {
  const MyBookingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(bookingsProvider);
    final colors = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colors.surface,
      appBar: AppBar(
        backgroundColor: colors.surface,
        elevation: 0,
        title: const Text('My Bookings', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.read(bookingsProvider.notifier).fetchAll(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(bookingsProvider.notifier).fetchAll(),
        child: state.isLoading
            ? const Center(child: CircularProgressIndicator())
            : state.error != null
                ? _ErrorView(
                    error: state.error!,
                    onRetry: () => ref.read(bookingsProvider.notifier).fetchAll(),
                  )
                : _BookingsList(state: state),
      ),
    );
  }
}

// ─── Bookings List ────────────────────────────────────────────────────────────

class _BookingsList extends ConsumerWidget {
  final BookingsState state;
  const _BookingsList({required this.state});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pastBookings = state.bookings
        .where((b) => b.status != BookingStatus.confirmed)
        .toList();

    return CustomScrollView(
      slivers: [
        // ─── Active booking card ─────────────────────────────────────────
        if (state.activeBooking != null)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: _ActiveBookingCard(booking: state.activeBooking!),
            ),
          ),

        // ─── No active booking state ─────────────────────────────────────
        if (state.activeBooking == null)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF9FAFB),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.calendar_today_outlined,
                        color: Colors.grey.shade400, size: 20),
                    const SizedBox(width: 12),
                    Text(
                      'No active booking. Browse slots to book.',
                      style: TextStyle(color: Colors.grey.shade500, fontSize: 14),
                    ),
                  ],
                ),
              ),
            ),
          ),

        // ─── Past bookings header ────────────────────────────────────────
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
            child: Text(
              'History',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade500,
                letterSpacing: 0.5,
              ),
            ),
          ),
        ),

        // ─── Past bookings list ──────────────────────────────────────────
        if (pastBookings.isEmpty)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                'No past bookings yet.',
                style: TextStyle(color: Colors.grey.shade400, fontSize: 14),
              ),
            ),
          )
        else
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, i) => Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                child: _PastBookingRow(booking: pastBookings[i]),
              ),
              childCount: pastBookings.length,
            ),
          ),

        const SliverToBoxAdapter(child: SizedBox(height: 32)),
      ],
    );
  }
}

// ─── Active Booking Card ──────────────────────────────────────────────────────

class _ActiveBookingCard extends ConsumerWidget {
  final Booking booking;
  const _ActiveBookingCard({required this.booking});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isActing = ref.watch(bookingsProvider).isActing;
    final slot = booking.slot;
    final machine = booking.machine;
    final isRunning = slot?.isActive ?? false;
    final colors = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isRunning
              ? [const Color(0xFFFFF7ED), const Color(0xFFFEF3C7)]
              : [const Color(0xFFF0FDF4), const Color(0xFFDCFCE7)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isRunning
              ? const Color(0xFFFCD34D)
              : const Color(0xFF86EFAC),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isRunning
                      ? const Color(0xFFD97706)
                      : const Color(0xFF2D6A4F),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  isRunning ? '● In Progress' : '✓ Confirmed',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const Spacer(),
              if (machine != null)
                Text(
                  machine.name,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: colors.onSurfaceVariant,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),

          // Time
          if (slot != null)
            Text(
              slot.timeRangeLabel,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1a1a2e),
              ),
            ),

          const SizedBox(height: 4),

          // Date
          if (slot != null)
            Text(
              _formatDate(slot.startTime),
              style: TextStyle(fontSize: 13, color: colors.onSurfaceVariant),
            ),

          const SizedBox(height: 16),

          // Cancel button — only if cancellable
          if (booking.isCancellable)
            SizedBox(
              width: double.infinity,
              height: 42,
              child: OutlinedButton(
                onPressed: isActing ? null : () => _confirmCancel(context, ref),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFDC2626),
                  side: const BorderSide(color: Color(0xFFFCA5A5)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: isActing
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Color(0xFFDC2626),
                        ),
                      )
                    : const Text('Cancel Booking'),
              ),
            ),

          if (isRunning)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text(
                'Slot has started — cancellation is no longer available.',
                style: TextStyle(fontSize: 12, color: colors.onSurfaceVariant),
              ),
            ),
        ],
      ),
    );
  }

  void _confirmCancel(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Booking'),
        content: const Text(
          'Are you sure? This still counts against your weekly booking limit.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Keep It'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await ref
                  .read(bookingsProvider.notifier)
                  .cancel(booking.id);
              if (context.mounted) {
                final msg = success
                    ? 'Booking cancelled.'
                    : ref.read(bookingsProvider).actionError ?? 'Failed to cancel.';
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(msg),
                    backgroundColor: success
                        ? const Color(0xFF2D6A4F)
                        : Theme.of(context).colorScheme.error,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              }
            },
            style: TextButton.styleFrom(foregroundColor: const Color(0xFFDC2626)),
            child: const Text('Cancel Booking'),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime dt) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return '${days[dt.weekday % 7]}, ${dt.day} ${months[dt.month - 1]}';
  }
}

// ─── Past Booking Row ─────────────────────────────────────────────────────────

class _PastBookingRow extends StatelessWidget {
  final Booking booking;
  const _PastBookingRow({required this.booking});

  @override
  Widget build(BuildContext context) {
    final slot = booking.slot;
    final machine = booking.machine;

    final statusColor = _statusColor(booking.status);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFF3F4F6)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        children: [
          // Status dot
          Container(
            width: 10,
            height: 10,
            margin: const EdgeInsets.only(right: 12, top: 2),
            decoration: BoxDecoration(
              color: statusColor,
              shape: BoxShape.circle,
            ),
          ),

          // Time + machine
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  slot?.timeRangeLabel ?? '—',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1a1a2e),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  machine?.name ?? '—',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
                ),
              ],
            ),
          ),

          // Status badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              booking.statusLabel,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: statusColor,
              ),
            ),
          ),
        ],
      ),
    );
  }

  static Color _statusColor(BookingStatus status) {
    switch (status) {
      case BookingStatus.completed:
        return const Color(0xFF2D6A4F);
      case BookingStatus.cancelled:
        return const Color(0xFF6B7280);
      case BookingStatus.noShow:
        return const Color(0xFFDC2626);
      case BookingStatus.confirmed:
        return const Color(0xFF2D6A4F);
    }
  }
}

// ─── Error View ───────────────────────────────────────────────────────────────

class _ErrorView extends StatelessWidget {
  final String error;
  final VoidCallback onRetry;
  const _ErrorView({required this.error, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.wifi_off_rounded,
                size: 48, color: Theme.of(context).colorScheme.error),
            const SizedBox(height: 12),
            Text(error,
                textAlign: TextAlign.center,
                style: TextStyle(color: Theme.of(context).colorScheme.error)),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}
