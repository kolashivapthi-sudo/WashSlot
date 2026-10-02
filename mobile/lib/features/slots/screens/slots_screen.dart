import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../../machines/providers/machines_provider.dart';
import '../../machines/widgets/machine_status_card.dart';
import '../../machines/models/machine.dart';
import '../providers/slots_provider.dart';
import '../widgets/slot_grid.dart';
import '../models/slot.dart';
import '../../bookings/providers/bookings_provider.dart';

class SlotsScreen extends ConsumerStatefulWidget {
  const SlotsScreen({super.key});

  @override
  ConsumerState<SlotsScreen> createState() => _SlotsScreenState();
}

class _SlotsScreenState extends ConsumerState<SlotsScreen>
    with SingleTickerProviderStateMixin {
  TabController? _tabController;
  int _selectedMachineIndex = 0;

  @override
  void dispose() {
    _tabController?.dispose();
    super.dispose();
  }

  void _initTabController(int count) {
    if (_tabController == null || _tabController!.length != count) {
      _tabController?.dispose();
      _tabController = TabController(length: count, vsync: this);
      _tabController!.addListener(() {
        if (!_tabController!.indexIsChanging) {
          setState(() => _selectedMachineIndex = _tabController!.index);
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final machinesState = ref.watch(machinesProvider);
    final slotsState = ref.watch(slotsProvider);
    final authState = ref.watch(authProvider);
    final colors = Theme.of(context).colorScheme;

    final machines = machinesState.machines;
    if (machines.isNotEmpty) _initTabController(machines.length);

    return Scaffold(
      backgroundColor: colors.surface,
      appBar: AppBar(
        backgroundColor: colors.surface,
        elevation: 0,
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: colors.primary,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.local_laundry_service, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 10),
            const Text('WashSlot', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        actions: [
          // Refresh button
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh',
            onPressed: () {
              ref.read(slotsProvider.notifier).fetch();
              ref.read(machinesProvider.notifier).fetch();
            },
          ),
          // Profile / logout menu
          PopupMenuButton<String>(
            icon: CircleAvatar(
              radius: 14,
              backgroundColor: colors.primaryContainer,
              child: Text(
                authState.user?.name.substring(0, 1).toUpperCase() ?? 'U',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: colors.primary,
                ),
              ),
            ),
            onSelected: (value) {
              if (value == 'logout') {
                ref.read(authProvider.notifier).logout();
              }
            },
            itemBuilder: (_) => [
              PopupMenuItem(
                enabled: false,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      authState.user?.name ?? '',
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                    Text(
                      authState.user?.email ?? '',
                      style: TextStyle(fontSize: 11, color: colors.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem(value: 'logout', child: Text('Sign Out')),
            ],
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await ref.read(slotsProvider.notifier).fetch();
          await ref.read(machinesProvider.notifier).fetch();
        },
        child: _buildBody(machines, machinesState, slotsState, colors),
      ),
    );
  }

  Widget _buildBody(
    List<Machine> machines,
    MachinesState machinesState,
    SlotsState slotsState,
    ColorScheme colors,
  ) {
    // Loading
    if (machinesState.isLoading && machines.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    // Error
    if (machinesState.error != null && machines.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.wifi_off_rounded, size: 48, color: colors.error),
              const SizedBox(height: 12),
              Text(machinesState.error!, textAlign: TextAlign.center,
                  style: TextStyle(color: colors.error)),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => ref.read(machinesProvider.notifier).fetch(),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    // No machines configured
    if (machines.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.local_laundry_service_outlined,
                  size: 56, color: colors.onSurfaceVariant.withOpacity(0.3)),
              const SizedBox(height: 16),
              Text(
                'No machines available.',
                style: TextStyle(color: colors.onSurfaceVariant, fontSize: 16),
              ),
              const SizedBox(height: 8),
              Text(
                'Ask your warden to configure the washing machines.',
                style: TextStyle(color: colors.onSurfaceVariant, fontSize: 13),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return CustomScrollView(
      slivers: [
        // ─── Machine Status Cards (horizontal scroll) ───────────────────────
        SliverToBoxAdapter(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Text(
                  'Machines',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: colors.onSurfaceVariant,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              SizedBox(
                height: 88,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: machines.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                  itemBuilder: (context, i) => SizedBox(
                    width: 260,
                    child: MachineStatusCard(
                      machine: machines[i],
                      onTap: () {
                        setState(() => _selectedMachineIndex = i);
                        _tabController?.animateTo(i);
                      },
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),

        // ─── Machine Tabs ───────────────────────────────────────────────────
        if (_tabController != null)
          SliverToBoxAdapter(
            child: TabBar(
              controller: _tabController,
              isScrollable: machines.length > 3,
              labelColor: colors.primary,
              unselectedLabelColor: colors.onSurfaceVariant,
              indicatorColor: colors.primary,
              indicatorSize: TabBarIndicatorSize.label,
              labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
              tabs: machines
                  .map((m) => Tab(text: m.name))
                  .toList(),
            ),
          ),

        // ─── Last updated + slots header ────────────────────────────────────
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
            child: Row(
              children: [
                Text(
                  'Next 24 Hours',
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
                const Spacer(),
                if (slotsState.lastUpdated != null)
                  Text(
                    'Updated ${_relativeTime(slotsState.lastUpdated!)}',
                    style: TextStyle(fontSize: 11, color: colors.onSurfaceVariant),
                  ),
              ],
            ),
          ),
        ),

        // ─── Color legend ───────────────────────────────────────────────────
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Wrap(
              spacing: 16,
              children: const [
                _LegendChip(color: Color(0xFF2D6A4F), label: 'Available'),
                _LegendChip(color: Color(0xFF6C757D), label: 'Booked'),
                _LegendChip(color: Color(0xFFD97706), label: 'In Use'),
                _LegendChip(color: Color(0xFFDC2626), label: 'Blocked'),
              ],
            ),
          ),
        ),

        // ─── Slots loading / error ──────────────────────────────────────────
        if (slotsState.isLoading && slotsState.slots.isEmpty)
          const SliverFillRemaining(
            child: Center(child: CircularProgressIndicator()),
          )
        else if (slotsState.error != null && slotsState.slots.isEmpty)
          SliverFillRemaining(
            child: Center(
              child: Text(
                slotsState.error!,
                style: TextStyle(color: colors.error),
                textAlign: TextAlign.center,
              ),
            ),
          )
        else
          // ─── Slot Grid for selected machine ─────────────────────────────
          SliverToBoxAdapter(
            child: Builder(
              builder: (context) {
                if (machines.isEmpty || _tabController == null) {
                  return const SizedBox.shrink();
                }
                final machine = machines[_selectedMachineIndex];
                final machineSlots = slotsState.forMachine(machine.id);

                // Under repair — show banner instead of grid
                if (machine.status == MachineStatus.underRepair) {
                  return _RepairBanner(machineName: machine.name);
                }

                return SlotGrid(
                  slots: machineSlots,
                  onBookSlot: (slot) => _confirmBook(context, slot, machine),
                );
              },
            ),
          ),

        const SliverToBoxAdapter(child: SizedBox(height: 32)),
      ],
    );
  }

  // ─── Book confirmation bottom sheet ────────────────────────────────────────

  void _confirmBook(BuildContext context, Slot slot, Machine machine) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _BookConfirmSheet(
        slot: slot,
        machine: machine,
        onConfirm: () async {
          Navigator.pop(ctx);

          // Optimistic UI update — slot appears booked instantly
          ref.read(slotsProvider.notifier).updateSlotStatus(slot.id, SlotStatus.booked);

          // Call API
          final success = await ref.read(bookingsProvider.notifier).book(slot.id);

          if (!success && mounted) {
            // Revert optimistic update on failure
            ref.read(slotsProvider.notifier).updateSlotStatus(slot.id, SlotStatus.available);

            final err = ref.read(bookingsProvider).actionError ?? 'Booking failed.';
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(err),
                backgroundColor: Theme.of(context).colorScheme.error,
                behavior: SnackBarBehavior.floating,
              ),
            );
          } else if (success && mounted) {
            final msg = ref.read(bookingsProvider).successMessage ?? 'Slot booked!';
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(msg),
                backgroundColor: const Color(0xFF2D6A4F),
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        },
      ),
    );
  }

  String _relativeTime(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inSeconds < 60) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    return '${diff.inHours}h ago';
  }
}

// ─── Legend Chip ──────────────────────────────────────────────────────────────

class _LegendChip extends StatelessWidget {
  final Color color;
  final String label;
  const _LegendChip({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF6C757D))),
      ],
    );
  }
}

// ─── Under Repair Banner ──────────────────────────────────────────────────────

class _RepairBanner extends StatelessWidget {
  final String machineName;
  const _RepairBanner({required this.machineName});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: const Color(0xFFFEE2E2),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFFCA5A5)),
        ),
        child: Column(
          children: [
            const Icon(Icons.build_outlined, size: 36, color: Color(0xFFDC2626)),
            const SizedBox(height: 12),
            Text(
              '$machineName is Under Repair',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: Color(0xFFDC2626),
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Slots are unavailable until the warden marks it as repaired.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFF991B1B), fontSize: 13),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Book Confirm Bottom Sheet ────────────────────────────────────────────────

class _BookConfirmSheet extends ConsumerWidget {
  final Slot slot;
  final Machine machine;
  final Future<void> Function() onConfirm;

  const _BookConfirmSheet({
    required this.slot,
    required this.machine,
    required this.onConfirm,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isActing = ref.watch(bookingsProvider).isActing;
    final colors = Theme.of(context).colorScheme;

    return Padding(
      padding: EdgeInsets.fromLTRB(24, 20, 24, MediaQuery.of(context).viewInsets.bottom + 36),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: colors.outlineVariant,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),
          const Text('Confirm Booking',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),

          // Slot details
          _DetailRow(icon: Icons.local_laundry_service, label: 'Machine', value: machine.name),
          const SizedBox(height: 10),
          _DetailRow(
            icon: Icons.schedule_rounded,
            label: 'Time',
            value: slot.timeRangeLabel,
          ),
          const SizedBox(height: 24),

          // Note
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: colors.primaryContainer.withOpacity(0.4),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              'Once your slot starts you cannot cancel it.\nYou can cancel up until the slot begins.',
              style: TextStyle(fontSize: 12, color: colors.onSurfaceVariant),
            ),
          ),
          const SizedBox(height: 20),

          // Confirm button
          SizedBox(
            width: double.infinity,
            height: 50,
            child: FilledButton(
              onPressed: isActing ? null : () => onConfirm(),
              style: FilledButton.styleFrom(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: isActing
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Book This Slot', style: TextStyle(fontSize: 16)),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            height: 44,
            child: TextButton(
              onPressed: isActing ? null : () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _DetailRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: Theme.of(context).colorScheme.primary),
        const SizedBox(width: 10),
        Text('$label: ', style: const TextStyle(color: Color(0xFF6C757D), fontSize: 14)),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
      ],
    );
  }
}
