import 'package:flutter/material.dart';
import '../models/machine.dart';

/// Displays a single washing machine's name, status, and color indicator.
/// Used on the main slots screen to show machine overview at a glance.
class MachineStatusCard extends StatelessWidget {
  final Machine machine;

  /// Optional tap handler — e.g. to filter slots by machine
  final VoidCallback? onTap;

  const MachineStatusCard({
    super.key,
    required this.machine,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor(machine.status);
    final statusIcon = _statusIcon(machine.status);
    final colors = Theme.of(context).colorScheme;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: colors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: statusColor.withOpacity(0.3),
            width: 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            // ─── Machine icon with status color background ──────────
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                Icons.local_laundry_service_rounded,
                color: statusColor,
                size: 26,
              ),
            ),
            const SizedBox(width: 14),

            // ─── Machine name + description ─────────────────────────
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    machine.name,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: colors.onSurface,
                        ),
                  ),
                  if (machine.description != null && machine.description!.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      machine.description!,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: colors.onSurfaceVariant,
                          ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),

            // ─── Status badge ───────────────────────────────────────
            _StatusBadge(label: machine.statusLabel, color: statusColor, icon: statusIcon),
          ],
        ),
      ),
    );
  }

  static Color _statusColor(MachineStatus status) {
    switch (status) {
      case MachineStatus.available:
        return const Color(0xFF2D6A4F); // Green
      case MachineStatus.inUse:
        return const Color(0xFF6C757D); // Grey
      case MachineStatus.underRepair:
        return const Color(0xFFDC2626); // Red
    }
  }

  static IconData _statusIcon(MachineStatus status) {
    switch (status) {
      case MachineStatus.available:
        return Icons.check_circle_outline_rounded;
      case MachineStatus.inUse:
        return Icons.autorenew_rounded;
      case MachineStatus.underRepair:
        return Icons.build_outlined;
    }
  }
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

class _StatusBadge extends StatelessWidget {
  final String label;
  final Color color;
  final IconData icon;

  const _StatusBadge({
    required this.label,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
