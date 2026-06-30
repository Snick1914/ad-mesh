import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import 'admin_dashboard_page.dart';
import 'login_page.dart';
import 'views/overview_view.dart';
import 'views/media_view.dart';
import 'views/playlists_view.dart';
import 'views/devices_view.dart';
import 'views/telemetry_view.dart';

class ClientDashboardPage extends StatefulWidget {
  final int initialTab;
  const ClientDashboardPage({super.key, this.initialTab = 0});

  @override
  State<ClientDashboardPage> createState() => _ClientDashboardPageState();
}

class _ClientDashboardPageState extends State<ClientDashboardPage> {
  late int _activeTabIndex;
  String _activeModule = 'dashboard';
  bool _isSuperuser = false;
  bool _isImpersonating = false;
  String _clientName = 'Cliente ad-mesh';
  String _clientEmail = '';
  bool _hasTelemetry = true;
  bool _hasAds = true;
  bool _isLoading = true;

  late final List<Widget> _views;

  final List<String> _tabNames = [
    'Panel de Control',
    'Mis Pantallas',
    'Playlists y Contenido',
    'Telemetría IoT',
  ];

  final List<IconData> _tabIcons = [
    Icons.space_dashboard_outlined,
    Icons.monitor_rounded,
    Icons.queue_music_outlined,
    Icons.offline_bolt_outlined,
  ];

  Future<void> _checkSessionStatus() async {
    final prefs = await SharedPreferences.getInstance();
    final adminToken = prefs.getString('admin_token');
    
    final payload = await ApiService.decodeToken();
    bool isSuper = payload['is_superuser'] ?? false;
    String name = payload['full_name'] ?? 'Usuario Cliente';
    String email = payload['email'] ?? 'cliente@admesh.com';
    bool hasTel = payload['has_telemetry'] ?? true;
    bool hasAd = payload['has_ads'] ?? true;

    // Smart redirection if current tab is unauthorized
    int activeTab = widget.initialTab;
    if (!hasAd && (activeTab == 1 || activeTab == 2)) {
      activeTab = hasTel ? 3 : 0; // Telemetry or Overview
    }
    if (!hasTel && activeTab == 3) {
      activeTab = hasAd ? 1 : 0; // Screens or Overview
    }

    String activeModule = 'dashboard';
    if (activeTab == 1 || activeTab == 2) {
      activeModule = 'ads';
    } else if (activeTab == 3) {
      activeModule = 'telemetry';
    }

    setState(() {
      _isSuperuser = isSuper;
      _isImpersonating = adminToken != null;
      _clientName = name;
      _clientEmail = email;
      _hasTelemetry = hasTel;
      _hasAds = hasAd;
      _activeTabIndex = activeTab;
      _activeModule = activeModule;
      _isLoading = false;
    });
  }

  Future<void> _handleReturnToAdmin() async {
    final prefs = await SharedPreferences.getInstance();
    final adminToken = prefs.getString('admin_token');
    if (adminToken != null) {
      await prefs.setString('token', adminToken);
      await prefs.remove('admin_token');
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const AdminDashboardPage()),
        );
      }
    }
  }

  Future<void> _handleLogout() async {
    await ApiService.clearToken();
    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const LoginPage()),
      );
    }
  }

  @override
  void initState() {
    super.initState();
    _activeTabIndex = widget.initialTab;
    _views = [
      OverviewView(onNavigate: (index) {
        String routeName;
        switch (index) {
          case 0: routeName = '/overview'; break;
          case 1: routeName = '/devices'; break;
          case 2: routeName = '/playlists'; break;
          case 3: routeName = '/telemetry'; break;
          default: routeName = '/overview';
        }
        Navigator.pushReplacementNamed(context, routeName);
      }),
      const DevicesView(),
      const PlaylistsView(),
      const TelemetryView(),
    ];
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
      body: Column(
        children: [
          // Support Impersonation Banner
          if (_isImpersonating)
            Container(
              color: const Color(0xFF7000FF),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const BlinkingDot(),
                      const SizedBox(width: 10),
                      Text(
                        'Estás simulando la cuenta de un cliente (Modo de Soporte).',
                        style: GoogleFonts.inter(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  ElevatedButton(
                    onPressed: _handleReturnToAdmin,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white24,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text('Volver a Admin', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),

          // Main Layout
          Expanded(
            child: Row(
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
                                _buildTopNavbar(),
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
                                // User Info Avatar
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
                                      _clientName,
                                      style: GoogleFonts.inter(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                                    ),
                                    Text(
                                      _clientEmail,
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
                                  child: const Icon(Icons.person_outline, color: Colors.white70, size: 20),
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
          ),
        ],
      ),
    );
  }

  Widget _buildSidebar(BuildContext context) {
    const cardBg = Color(0xFF161C2D);
    const primaryColor = Color(0xFF00F0FF);

    return Material(
      color: cardBg,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Logo header
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
                Text(
                  'ad-mesh Console',
                  style: GoogleFonts.robotoMono(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ],
            ),
          ),

          // Active Module Items
          if (_activeModule == 'dashboard') ...[
            Padding(
              padding: const EdgeInsets.only(left: 20, right: 20, top: 24, bottom: 8),
              child: Text(
                'INICIO',
                style: GoogleFonts.robotoMono(
                  color: const Color(0xFF64748B),
                  fontSize: 9,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            _buildSidebarItem(0, _tabNames[0], _tabIcons[0]),
          ] else if (_activeModule == 'ads' && _hasAds) ...[
            Padding(
              padding: const EdgeInsets.only(left: 20, right: 20, top: 24, bottom: 8),
              child: Text(
                'DISTRIBUCIÓN Y CONTENIDO',
                style: GoogleFonts.robotoMono(
                  color: const Color(0xFF64748B),
                  fontSize: 9,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            _buildSidebarItem(1, _tabNames[1], _tabIcons[1]),
            _buildSidebarItem(2, _tabNames[2], _tabIcons[2]),
          ] else if (_activeModule == 'telemetry' && _hasTelemetry) ...[
            Padding(
              padding: const EdgeInsets.only(left: 20, right: 20, top: 24, bottom: 8),
              child: Text(
                'MONITOREO',
                style: GoogleFonts.robotoMono(
                  color: const Color(0xFF64748B),
                  fontSize: 9,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            _buildSidebarItem(3, _tabNames[3], _tabIcons[3]),
          ],

          const Spacer(),

          // Admin Console Redirect & Logout
          Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_isSuperuser)
                  ElevatedButton(
                    onPressed: () {
                      final scaffoldState = Scaffold.maybeOf(context);
                      if (scaffoldState != null && scaffoldState.isDrawerOpen) {
                        Navigator.pop(context);
                      }
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(builder: (context) => const AdminDashboardPage()),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF7000FF),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      shadowColor: const Color(0xFF7000FF).withOpacity(0.4),
                      elevation: 8,
                    ),
                    child: const Text('Consola Admin', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
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
    const primaryColor = Color(0xFF00F0FF);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
      child: InkWell(
        onTap: () {
          final scaffoldState = Scaffold.maybeOf(context);
          if (scaffoldState != null && scaffoldState.isDrawerOpen) {
            Navigator.pop(context);
          }
          String routeName;
          switch (index) {
            case 0:
              routeName = '/overview';
              break;
            case 1:
              routeName = '/devices';
              break;
            case 2:
              routeName = '/playlists';
              break;
            case 3:
              routeName = '/telemetry';
              break;
            default:
              routeName = '/overview';
          }
          Navigator.pushReplacementNamed(context, routeName);
        },
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? primaryColor.withOpacity(0.1) : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? primaryColor.withOpacity(0.2) : Colors.transparent,
            ),
          ),
          child: Row(
            children: [
              Icon(icon, color: isSelected ? primaryColor : const Color(0xFF94A3B8), size: 20),
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

  Widget _buildTopNavbar() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _buildNavbarTab(
          label: 'Inicio',
          icon: Icons.space_dashboard_outlined,
          isActive: _activeModule == 'dashboard',
          onTap: () {
            setState(() {
              _activeModule = 'dashboard';
              _activeTabIndex = 0;
            });
          },
        ),
        if (_hasAds) ...[
          const SizedBox(width: 12),
          _buildNavbarTab(
            label: 'Anuncios y Contenido',
            icon: Icons.play_circle_outline,
            isActive: _activeModule == 'ads',
            onTap: () {
              setState(() {
                _activeModule = 'ads';
                _activeTabIndex = 1;
              });
            },
          ),
        ],
        if (_hasTelemetry) ...[
          const SizedBox(width: 12),
          _buildNavbarTab(
            label: 'Telemetría IoT',
            icon: Icons.analytics_outlined,
            isActive: _activeModule == 'telemetry',
            onTap: () {
              setState(() {
                _activeModule = 'telemetry';
                _activeTabIndex = 3;
              });
            },
          ),
        ],
      ],
    );
  }

  Widget _buildNavbarTab({
    required String label,
    required IconData icon,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    const primaryColor = Color(0xFF00F0FF);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? primaryColor.withOpacity(0.12) : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isActive ? primaryColor.withOpacity(0.3) : Colors.transparent,
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 16,
              color: isActive ? primaryColor : const Color(0xFF94A3B8),
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: isActive ? FontWeight.bold : FontWeight.w500,
                color: isActive ? Colors.white : const Color(0xFF94A3B8),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class BlinkingDot extends StatefulWidget {
  const BlinkingDot({super.key});

  @override
  State<BlinkingDot> createState() => _BlinkingDotState();
}

class _BlinkingDotState extends State<BlinkingDot> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Stack(
          alignment: Alignment.center,
          children: [
            Container(
              width: 8 + 8 * _controller.value,
              height: 8 + 8 * _controller.value,
              decoration: BoxDecoration(
                color: const Color(0xFF34D399).withOpacity(1.0 - _controller.value),
                shape: BoxShape.circle,
              ),
            ),
            Container(
              width: 8,
              height: 8,
              decoration: const BoxDecoration(
                color: Color(0xFF10B981),
                shape: BoxShape.circle,
              ),
            ),
          ],
        );
      },
    );
  }
}
