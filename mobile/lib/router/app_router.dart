import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../features/auth/screens/login_screen.dart';
import '../features/auth/screens/register_screen.dart';
import '../features/slots/screens/slots_screen.dart';
import '../features/bookings/screens/my_bookings_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/login',
    routes: [
      GoRoute(path: '/login', builder: (ctx, state) => const LoginScreen()),
      GoRoute(path: '/register', builder: (ctx, state) => const RegisterScreen()),
      GoRoute(path: '/slots', builder: (ctx, state) => const SlotsScreen()),
      GoRoute(path: '/my-bookings', builder: (ctx, state) => const MyBookingsScreen()),
    ],
  );
});
