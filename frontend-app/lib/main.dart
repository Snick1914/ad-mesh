import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'pages/login_page.dart';
import 'pages/register_page.dart';
import 'pages/admin_dashboard_page.dart';
import 'pages/admin_users_page.dart';
import 'pages/client_dashboard_page.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    const darkBg = Color(0xFF05070A);
    const cardBg = Color(0xFF121824);
    const primaryColor = Color(0xFF00F0FF);

    return MaterialApp(
      title: 'ad-mesh Admin Console',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: darkBg,
        primaryColor: primaryColor,
        colorScheme: ColorScheme.dark(
          primary: primaryColor,
          background: darkBg,
          surface: cardBg,
          onPrimary: Colors.black,
          onBackground: Colors.white,
          onSurface: Colors.white.withOpacity(0.9),
        ),
        textTheme: GoogleFonts.interTextTheme(
          ThemeData.dark().textTheme,
        ),
      ),
      initialRoute: '/login',
      routes: {
        '/login': (context) => const LoginPage(),
        '/register': (context) => const RegisterPage(),
        '/admin': (context) => const AdminDashboardPage(),
        '/admin/users': (context) => const AdminUsersPage(),
        '/devices': (context) => const ClientDashboardPage(initialTab: 2),
        '/media': (context) => const ClientDashboardPage(initialTab: 0),
        '/playlists': (context) => const ClientDashboardPage(initialTab: 1),
        '/telemetry': (context) => const ClientDashboardPage(initialTab: 3),
      },
    );
  }
}
