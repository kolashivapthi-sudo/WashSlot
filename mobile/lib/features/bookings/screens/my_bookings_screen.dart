import 'package:flutter/material.dart';

class MyBookingsScreen extends StatelessWidget {
  const MyBookingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Bookings')),
      body: const Center(
        // TODO Phase 6: Active and past bookings list
        child: Text('My bookings — coming in Phase 6'),
      ),
    );
  }
}
