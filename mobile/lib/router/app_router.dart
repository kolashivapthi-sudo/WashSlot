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

// Shell with bottom navigation bar for main app screens
class _AppShell extends StatelessWidget {
  final Widget child;
  const _AppShell({required this.child});

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: location == '/my-bookings' ? 1 : 0,
        onDestinationSelected: (index) {
          if (index == 0) context.go('/slots');
          if (index == 1) context.go('/my-bookings');
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.calendar_view_week_outlined),
            selectedIcon: Icon(Icons.calendar_view_week),
            label: 'Slots',
          ),
          NavigationDestination(
            icon: Icon(Icons.local_laundry_service_outlined),
            selectedIcon: Icon(Icons.local_laundry_service),
            label: 'My Bookings',
          ),
        ],
      ),
    );
  }
}

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/login',
    refreshListenable: _AuthStateListenable(ref),
    redirect: (context, state) {
      final isLoading = authState.isLoading;
      final isAuthenticated = authState.isAuthenticated;
      final isOnAuthPage =
          state.matchedLocation == '/login' || state.matchedLocation == '/register';

      if (isLoading) return '/splash';
      if (!isAuthenticated && !isOnAuthPage) return '/login';
      if (isAuthenticated && isOnAuthPage) return '/slots';

      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (ctx, state) => const _SplashScreen()),
      GoRoute(path: '/login', builder: (ctx, state) => const LoginScreen()),
      GoRoute(path: '/register', builder: (ctx, state) => const RegisterScreen()),
      // Shell route wraps the main app screens with bottom nav
      ShellRoute(
        builder: (ctx, state, child) => _AppShell(child: child),
        routes: [
          GoRoute(path: '/slots', builder: (ctx, state) => const SlotsScreen()),
          GoRoute(path: '/my-bookings', builder: (ctx, state) => const MyBookingsScreen()),
        ],
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
