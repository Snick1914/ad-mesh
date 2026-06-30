import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../services/api_service.dart';

class OverviewView extends StatefulWidget {
  final Function(int) onNavigate;
  const OverviewView({super.key, required this.onNavigate});

  @override
  State<OverviewView> createState() => _OverviewViewState();
}

class _OverviewViewState extends State<OverviewView> {
  bool _isLoading = true;
  int _screensCount = 0;
  int _playlistsCount = 0;
  double _storageUsedGb = 0.0;
  double _storageLimitGb = 10.0;
  int _screensLimit = 5;
  List<dynamic> _recentDevices = [];

  Future<void> _loadDashboardData() async {
    try {
      final devs = await ApiService.getDevices();
      final playlists = await ApiService.getPlaylists();
      
      // Calculate storage used
      double used = 0.0;
      for (var dev in devs) {
        used += (dev['storage_used_gb'] ?? 0.0).toDouble();
      }

      final payload = await ApiService.decodeToken();
      int maxD = payload['max_devices'] ?? 5;
      double maxS = (payload['max_storage_gb'] ?? 10.0).toDouble();

      setState(() {
        _screensCount = devs.length;
        _playlistsCount = playlists.length;
        _storageUsedGb = used > maxS ? maxS : used;
        _storageLimitGb = maxS;
        _screensLimit = maxD;
        _recentDevices = devs.take(3).toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  @override
  Widget build(BuildContext context) {
    const primaryColor = Color(0xFF00F0FF);
    const accentColor = Color(0xFF7000FF);
    const cardBg = Color(0xFF121824);

    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation(primaryColor)),
      );
    }

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Welcome Banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [accentColor.withOpacity(0.3), primaryColor.withOpacity(0.05)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: primaryColor.withOpacity(0.15)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '¡Bienvenido a ad-mesh!',
                  style: GoogleFonts.inter(
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Gestiona, programa y monitorea tus pantallas publicitarias e IoT de forma inteligente desde una sola consola unificada.',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: const Color(0xFF94A3B8),
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),

          // Setup Stepper Wizard
          Text(
            'Asistente de Configuración Rápida',
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Sigue este workflow simple para comenzar a reproducir contenido en tus pantallas.',
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
          ),
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: MediaQuery.of(context).size.width > 1200 ? 4 : (MediaQuery.of(context).size.width > 800 ? 2 : 1),
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            shrinkWrap: true,
            childAspectRatio: 1.4,
            physics: const NeverScrollableScrollPhysics(),
            children: [
              _buildStepCard(
                stepNum: '1',
                title: 'Subir Contenido',
                desc: 'Sube tus imágenes o videos publicitarios a tu biblioteca multimedia.',
                buttonText: 'Ir a Contenido',
                onTap: () => widget.onNavigate(2), // Tab 2 (Playlists & Media)
                icon: Icons.cloud_upload_outlined,
              ),
              _buildStepCard(
                stepNum: '2',
                title: 'Crear Playlist',
                desc: 'Agrupa tus archivos en listas de reproducción ordenadas con tiempos definidos.',
                buttonText: 'Crear Playlist',
                onTap: () => widget.onNavigate(2), // Tab 2
                icon: Icons.playlist_add_rounded,
              ),
              _buildStepCard(
                stepNum: '3',
                title: 'Vincular Pantalla',
                desc: 'Empareja tu dispositivo físico usando el código de vinculación de 6 dígitos.',
                buttonText: 'Vincular Pantalla',
                onTap: () => widget.onNavigate(1), // Tab 1 (Devices)
                icon: Icons.add_to_queue_rounded,
              ),
              _buildStepCard(
                stepNum: '4',
                title: 'Asignar Playlist',
                desc: 'Configura las zonas de tu pantalla y programa la playlist a reproducir.',
                buttonText: 'Programar Pantalla',
                onTap: () => widget.onNavigate(1), // Tab 1 (Devices)
                icon: Icons.schedule_rounded,
              ),
            ],
          ),
          const SizedBox(height: 28),

          // Overview Metrics & Quick Status Row
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Metrics (Left side)
              Expanded(
                flex: 3,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Rendimiento y Cuotas contratadas',
                      style: GoogleFonts.inter(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: _buildMetricTile(
                            title: 'PANTALLAS EN USO',
                            value: '$_screensCount / $_screensLimit',
                            subText: 'Pantallas vinculadas activas',
                            progress: _screensCount / _screensLimit,
                            color: primaryColor,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: _buildMetricTile(
                            title: 'ESPACIO EN DISCO',
                            value: '${_storageUsedGb.toStringAsFixed(1)} / ${_storageLimitGb.toInt()} GB',
                            subText: 'Almacenamiento multimedia',
                            progress: _storageUsedGb / _storageLimitGb,
                            color: accentColor,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 24),
              // Recent paired players
              Expanded(
                flex: 2,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Últimos Dispositivos',
                      style: GoogleFonts.inter(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: cardBg,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white.withOpacity(0.05)),
                      ),
                      child: _recentDevices.isEmpty
                          ? const Center(
                              child: Padding(
                                padding: EdgeInsets.all(20.0),
                                child: Text('No hay pantallas vinculadas', style: TextStyle(color: Colors.white38, fontSize: 13)),
                              ),
                            )
                          : Column(
                              children: _recentDevices.map((dev) {
                                bool isOnline = dev['status'] == 'online' || dev['status'] == 'syncing';
                                return Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 8.0),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Row(
                                        children: [
                                          Icon(
                                            Icons.monitor_rounded,
                                            size: 16,
                                            color: isOnline ? const Color(0xFF10B981) : Colors.redAccent,
                                          ),
                                          const SizedBox(width: 12),
                                          Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                dev['name'] ?? 'Dispositivo',
                                                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                                              ),
                                              Text(
                                                'ID: ${dev['serial_number']}',
                                                style: GoogleFonts.robotoMono(color: const Color(0xFF94A3B8), fontSize: 10),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: isOnline ? const Color(0xFF10B981).withOpacity(0.1) : Colors.redAccent.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          dev['status'] ?? 'offline',
                                          style: TextStyle(
                                            color: isOnline ? const Color(0xFF10B981) : Colors.redAccent,
                                            fontSize: 9,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              }).toList(),
                            ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStepCard({
    required String stepNum,
    required String title,
    required String desc,
    required String buttonText,
    required VoidCallback onTap,
    required IconData icon,
  }) {
    const cardBg = Color(0xFF121824);
    const primaryColor = Color(0xFF00F0FF);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    alignment: Alignment.center,
                    width: 28,
                    height: 28,
                    decoration: const BoxDecoration(
                      color: primaryColor,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      stepNum,
                      style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: Colors.black, fontSize: 13),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    title,
                    style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 14),
                  ),
                ],
              ),
              Icon(icon, color: const Color(0xFF94A3B8), size: 20),
            ],
          ),
          const SizedBox(height: 12),
          Expanded(
            child: Text(
              desc,
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, height: 1.4),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: onTap,
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryColor.withOpacity(0.1),
                foregroundColor: primaryColor,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                  side: BorderSide(color: primaryColor.withOpacity(0.2)),
                ),
                padding: const EdgeInsets.symmetric(vertical: 10),
              ),
              child: Text(buttonText, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildMetricTile({
    required String title,
    required String value,
    required String subText,
    required double progress,
    required Color color,
  }) {
    const cardBg = Color(0xFF121824);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.robotoMono(color: const Color(0xFF64748B), fontSize: 9, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: GoogleFonts.inter(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          Text(
            subText,
            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
          ),
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress.isNaN || progress.isInfinite ? 0.0 : progress,
              backgroundColor: Colors.white.withOpacity(0.05),
              valueColor: AlwaysStoppedAnimation(color),
              minHeight: 6,
            ),
          ),
        ],
      ),
    );
  }
}
