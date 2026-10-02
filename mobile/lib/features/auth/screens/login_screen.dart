import 'package:flutter/material.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('WashSlot', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              const Text('Book your laundry slot', style: TextStyle(color: Colors.grey)),
              const SizedBox(height: 40),
              // TODO Phase 2: Login form
              const Text('Login form — coming in Phase 2', style: TextStyle(color: Colors.grey)),
            ],
          ),
        ),
      ),
    );
  }
}
