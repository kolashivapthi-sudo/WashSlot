import 'package:flutter/material.dart';
import '../models/slot.dart';

/// Grid of color-coded slot cards for a single machine.
/// Green = available, Grey = booked, Orange = running now, Red = blocked.
class SlotGrid extends StatelessWidget {
  final List<Slot> slots;

  /// Called when user taps a bookable slot
  final void Function(Slot slot)? onBookSlot;

  const SlotGrid({
    super.key,
    required this.slots,
    this.onBookSlot,
  });

  @override
  Widget build(BuildContext context) {
    if (slots.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            children: [
              Icon(Icons.calendar_today_outlined,
                  size: 40, color: Colors.grey.shade300),
              const SizedBox(height: 12),
              Text(
                'No slots available in the next 24 hours.',
                style: TextStyle(color: Colors.grey.shade500, fontSize: 14),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 1.1,
      ),
      itemCount: slots.length,
      itemBuilder: (context, i) => _SlotCard(
        slot: slots[i],
        onTap: slots[i].isBookable ? () => onBookSlot?.call(slots[i]) : null,
      ),
    );
  }
}

// ─── Individual Slot Card ─────────────────────────────────────────────────────

class _SlotCard extends StatelessWidget {
  final Slot slot;
  final VoidCallback? onTap;

  const _SlotCard({required this.slot, this.onTap});

  @override
  Widget build(BuildContext context) {
    final isInteractive = onTap != null;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          color: slot.cardColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: slot.statusColor.withOpacity(0.3),
            width: 1.5,
          ),
          boxShadow: isInteractive
              ? [
                  BoxShadow(
                    color: slot.statusColor.withOpacity(0.15),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // ─── Active pulse indicator ────────────────────
              if (slot.isActive) ...[
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: slot.statusColor,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(height: 4),
              ],

              // ─── Time label ────────────────────────────────
              Text(
                _startTimeOnly(slot.startTime),
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: slot.isPast
                      ? Colors.grey.shade400
                      : slot.statusColor,
                ),
              ),
              const SizedBox(height: 3),

              // ─── Status label ──────────────────────────────
              Text(
                slot.statusLabel,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w500,
                  color: slot.isPast
                      ? Colors.grey.shade400
                      : slot.statusColor.withOpacity(0.85),
                ),
                textAlign: TextAlign.center,
              ),

              // ─── Tap hint for available slots ──────────────
              if (isInteractive) ...[
                const SizedBox(height: 4),
                Icon(
                  Icons.add_circle_outline_rounded,
                  size: 14,
                  color: slot.statusColor.withOpacity(0.7),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String _startTimeOnly(DateTime dt) {
    final hour = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
    final minute = dt.minute.toString().padLeft(2, '0');
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    return '$hour:$minute\n$period';
  }
}
