import 'package:flutter/material.dart';

class SlotsScreen extends StatelessWidget {
  const SlotsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Available Slots')),
      body: const Center(
        // TODO Phase 5: Slot grid with color coding (green/grey/red)
        child: Text('Slots view — coming in Phase 5'),
      ),
    );
  }
}
