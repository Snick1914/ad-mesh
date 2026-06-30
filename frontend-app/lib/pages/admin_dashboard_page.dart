import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';
import 'login_page.dart';
import 'views/admin_stats_view.dart';
import 'views/admin_users_view.dart';

class AdminDashboardPage extends StatefulWidget {
  final int initialTab;
  const AdminDashboardPage({super.key, this.initialTab = 0});

  @override
  State<AdminDashboardPage> createState() => _AdminDashboardPageState();
}

class _AdminDashboardPageState extends State<AdminDashboardPage> {
  late int _activeTabIndex;
  bool _isLoading = true;
  String _adminName = 'Owner Admin';
  String _adminEmail = 'admin@ad-mesh.com';

  final List<Widget> _views = [
    const AdminStatsView(),
    const AdminUsersView(),
  ];

  final List<String> _tabNames = [
    'Consola Global',
    'Gestión de Clientes',
  ];

  final List<IconData> _tabIcons = [
    Icons.space_dashboard_outlined,
    Icons.people_alt_outlined,
  ];

  Future<void> _checkSessionStatus() async {
    final payload = await ApiService.decodeToken();
    String name = payload['full_name'] ?? 'Usuario Admin';
    String email = payload['email'] ?? 'admin@admesh.com';

    setState(() {
      _adminName = name;
      _adminEmail = email;
      _isLoading = false;
    });
  }

  Future<void> _handleLogout() async {
    await ApiService.clearToken();
    if (mounted) {
      Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
    }
  }

  @override
  void initState() {
    super.initState();
    _activeTabIndex = widget.initialTab;
    _checkSessionStatus();
  }

  @override
  Widget build(BuildContext context) {
    const primaryColor = Color(0xFF00F0FF);
    const darkBg = Color(0xFF05070A);
    const cardBg = Color(0xFF121824);

    final isDesktop = MediaQuery.of(context).size.width >= 900;

    if (_isLoading) {
      return const Scaffold(
        backgroundColor: darkBg,
        body: Center(
          child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation(primaryColor)),
        ),
      );
    }

    return Scaffold(
      backgroundColor: darkBg,
      drawer: isDesktop ? null : Drawer(child: _buildSidebar(context)),
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (isDesktop) SizedBox(width: 260, child: _buildSidebar(context)),
          Expanded(
            child: Column(
              children: [
                // Top Header
                Container(
                  height: 80,
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  decoration: BoxDecoration(
                    color: cardBg.withOpacity(0.5),
                    border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.05))),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          if (!isDesktop)
                            Builder(
                              builder: (context) => IconButton(
                                icon: const Icon(Icons.menu, color: Colors.white),
                                onPressed: () {
                                  final state = Scaffold.maybeOf(context);
                                  if (state != null) state.openDrawer();
                                },
                              ),
                            ),
                          const SizedBox(width: 8),
                          Text(
                            _activeTabIndex == 0 ? 'Consola de Control SaaS' : 'Gestión de Clientes',
                            style: GoogleFonts.inter(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          // Notifications Bell
                          IconButton(
                            onPressed: () {},
                            icon: const Icon(Icons.notifications_none_outlined, color: Colors.white70),
                            tooltip: 'Notificaciones',
                          ),
                          const SizedBox(width: 16),
                          Container(
                            height: 40,
                            width: 1,
                            color: Colors.white12,
                          ),
                          const SizedBox(width: 16),
                          Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                _adminName,
                                style: GoogleFonts.inter(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                              ),
                              Text(
                                _adminEmail,
                                style: GoogleFonts.inter(color: const Color(0xFF94A3B8), fontSize: 11),
                              ),
                            ],
                          ),
                          const SizedBox(width: 12),
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.05),
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white12),
                            ),
                            child: const Icon(Icons.shield_outlined, color: Colors.white70, size: 20),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Tab View Content
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: _views[_activeTabIndex],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSidebar(BuildContext context) {
    const cardBg = Color(0xFF161C2D);
    const primaryColor = Color(0xFF00F0FF);
    const adminAccent = Color(0xFF7000FF);

    return Material(
      color: cardBg,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Logo header matching React
          Container(
            height: 80,
            padding: const EdgeInsets.symmetric(horizontal: 24),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.05))),
            ),
            child: Row(
              children: [
                const Icon(Icons.hub, color: primaryColor, size: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'ad-mesh Console',
                    style: GoogleFonts.robotoMono(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: adminAccent,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Text(
                    'Admin',
                    style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),

          // Menu Title
          Padding(
            padding: const EdgeInsets.only(left: 20, right: 20, top: 24, bottom: 8),
            child: Text(
              'CONSOLA GLOBAL',
              style: GoogleFonts.robotoMono(
                color: const Color(0xFF64748B),
                fontSize: 9,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),

          _buildSidebarItem(0, _tabNames[0], _tabIcons[0]),
          _buildSidebarItem(1, _tabNames[1], _tabIcons[1]),

          const Spacer(),

          // Bottom Quick Switch and Logout
          Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ElevatedButton(
                  onPressed: () {
                    final scaffoldState = Scaffold.maybeOf(context);
                    if (scaffoldState != null && scaffoldState.isDrawerOpen) {
                      Navigator.pop(context);
                    }
                    Navigator.pushReplacementNamed(context, '/overview');
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white.withOpacity(0.05),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    side: BorderSide(color: Colors.white.withOpacity(0.05)),
                    elevation: 0,
                  ),
                  child: const Text('Vista Cliente', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: _handleLogout,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF64748B),
                    side: BorderSide(color: Colors.white.withOpacity(0.05)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(Icons.logout_rounded, size: 18),
                  label: const Text('Cerrar Sesión'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSidebarItem(int index, String name, IconData icon) {
    final isSelected = _activeTabIndex == index;
    const adminAccent = Color(0xFF7000FF);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
      child: InkWell(
        onTap: () {
          final scaffoldState = Scaffold.maybeOf(context);
          if (scaffoldState != null && scaffoldState.isDrawerOpen) {
            Navigator.pop(context);
          }
          setState(() {
            _activeTabIndex = index;
          });
        },
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? adminAccent.withOpacity(0.15) : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? adminAccent.withOpacity(0.3) : Colors.transparent,
            ),
          ),
          child: Row(
            children: [
              Icon(icon, color: isSelected ? const Color(0xFFB280FF) : const Color(0xFF94A3B8), size: 20),
              const SizedBox(width: 12),
              Text(
                name,
                style: GoogleFonts.inter(
                  color: isSelected ? Colors.white : const Color(0xFF94A3B8),
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
