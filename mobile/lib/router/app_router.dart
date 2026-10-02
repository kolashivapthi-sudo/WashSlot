import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../features/auth/providers/auth_provider.dart';
import '../features/auth/screens/login_screen.dart';
import '../features/auth/screens/register_screen.dart';
import '../features/slots/screens/slots_screen.dart';
import '../features/bookings/screens/my_bookings_screen.dart';

// Splash/loading widget shown while auth state initializes
class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.local_laundry_service, size: 56, color: Color(0xFF2D6A4F)),
            SizedBox(height: 16),
            CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/login',
    // Refresh router whenever auth state changes
    refreshListenable: _AuthStateListenable(ref),
    redirect: (context, state) {
      final isLoading = authState.isLoading;
      final isAuthenticated = authState.isAuthenticated;
      final isOnAuthPage =
          state.matchedLocation == '/login' || state.matchedLocation == '/register';

      // Still initializing — show splash
      if (isLoading) return '/splash';

      // Not logged in and not on an auth page → redirect to login
      if (!isAuthenticated && !isOnAuthPage) return '/login';

      // Logged in and on an auth page → redirect to slots
      if (isAuthenticated && isOnAuthPage) return '/slots';

      return null; // No redirect needed
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (ctx, state) => const _SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (ctx, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (ctx, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/slots',
        builder: (ctx, state) => const SlotsScreen(),
      ),
      GoRoute(
        path: '/my-bookings',
        builder: (ctx, state) => const MyBookingsScreen(),
      ),
    ],
  );
});

/// Notifies GoRouter when auth state changes so redirect logic re-runs
class _AuthStateListenable extends ChangeNotifier {
  _AuthStateListenable(ProviderRef ref) {
    ref.listen(authProvider, (_, __) => notifyListeners());
  }
}
