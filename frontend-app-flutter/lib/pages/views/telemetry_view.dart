import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../services/api_service.dart';

class TelemetryView extends StatefulWidget {
  const TelemetryView({super.key});

  @override
  State<TelemetryView> createState() => _TelemetryViewState();
}

class _TelemetryViewState extends State<TelemetryView> {
  bool _isLoading = true;
  List<dynamic> _devices = [];
  dynamic _selectedDevice;
  List<dynamic> _telemetryLogs = [];
  Timer? _timer;
  String _searchTerm = '';

  @override
  void initState() {
    super.initState();
    _loadDevices();
    // Setup polling every 5 seconds to get fresh telemetry data
    _timer = Timer.periodic(const Duration(seconds: 5), (timer) {
      if (mounted && !_isLoading) {
        _pollLatestTelemetry();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _loadDevices() async {
    try {
      final devs = await ApiService.getDevices();
      setState(() {
        _devices = devs;
        if (devs.isNotEmpty) {
          _selectedDevice = devs[0];
        }
        _isLoading = false;
      });
      if (_selectedDevice != null) {
        _loadTelemetryLogs(_selectedDevice['serial_number']);
      }
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loadTelemetryLogs(String serialNumber) async {
    try {
      final logs = await ApiService.getDeviceTelemetry(serialNumber);
      setState(() {
        _telemetryLogs = logs;
      });
    } catch (e) {
      // Ignore
    }
  }

  Future<void> _pollLatestTelemetry() async {
    if (_selectedDevice == null) return;
    final serial = _selectedDevice['serial_number'];
    final logs = await ApiService.getDeviceTelemetry(serial);
    if (mounted) {
      setState(() {
        _telemetryLogs = logs;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    const primaryColor = Color(0xFF00F0FF);
    const cardBg = Color(0xFF121824);
    const darkBg = Color(0xFF05070A);

    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation(primaryColor)),
      );
    }

    final filteredDevices = _devices.where((d) {
      final name = (d['name'] ?? '').toString().toLowerCase();
      final serial = (d['serial_number'] ?? '').toString().toLowerCase();
      return name.contains(_searchTerm.toLowerCase()) || serial.contains(_searchTerm.toLowerCase());
    }).toList();

    // Get latest metrics
    double cpuTemp = 42.0;
    double cpuUsage = 15.0;
    double ramUsage = 38.0;
    double sensorVal = 0.0;
    String lastSeen = 'No hay reportes';

    if (_telemetryLogs.isNotEmpty) {
      final latest = _telemetryLogs.last;
      cpuTemp = (latest['cpu_temp'] ?? 42.0).toDouble();
      cpuUsage = (latest['cpu_usage'] ?? 15.0).toDouble();
      ramUsage = (latest['ram_usage'] ?? 38.0).toDouble();
      sensorVal = (latest['sensor_value'] ?? 0.0).toDouble();
      
      final rawTime = latest['timestamp'] != null ? DateTime.tryParse(latest['timestamp']) : null;
      if (rawTime != null) {
        final diff = DateTime.now().difference(rawTime.toLocal());
        if (diff.inSeconds < 10) {
          lastSeen = 'Justo ahora';
        } else if (diff.inMinutes < 1) {
          lastSeen = 'Hace ${diff.inSeconds} seg';
        } else {
          lastSeen = 'Hace ${diff.inMinutes} min';
        }
      }
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Left Sidebar: Devices List
        SizedBox(
          width: 300,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    'Dispositivos IoT',
                    style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    width: 6,
                    height: 6,
                    decoration: const BoxDecoration(color: Color(0xFF10B981), shape: BoxShape.circle),
                  ),
                ],
              ),
              const Text('Telemetría en tiempo real de reproductores', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
              const SizedBox(height: 16),

              // Search Box
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.white.withOpacity(0.05)),
                ),
                child: TextField(
                  style: const TextStyle(color: Colors.white, fontSize: 12),
                  decoration: const InputDecoration(
                    icon: Icon(Icons.search, color: Color(0xFF94A3B8), size: 16),
                    hintText: 'Buscar pantalla...',
                    hintStyle: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                    border: InputBorder.none,
                    isDense: true,
                  ),
                  onChanged: (val) => setState(() => _searchTerm = val),
                ),
              ),
              const SizedBox(height: 16),

              // Screens List
              Expanded(
                child: filteredDevices.isEmpty
                    ? const Center(child: Text('No hay pantallas vinculadas', style: TextStyle(color: Colors.white38, fontSize: 12)))
                    : ListView.separated(
                        itemCount: filteredDevices.length,
                        separatorBuilder: (c, i) => const SizedBox(height: 10),
                        itemBuilder: (context, idx) {
                          final dev = filteredDevices[idx];
                          final isSel = _selectedDevice != null && _selectedDevice['id'] == dev['id'];
                          bool isOnline = dev['status'] == 'online' || dev['status'] == 'syncing';

                          return InkWell(
                            onTap: () {
                              setState(() {
                                _selectedDevice = dev;
                                _telemetryLogs = [];
                              });
                              _loadTelemetryLogs(dev['serial_number']);
                            },
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: cardBg,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: isSel ? primaryColor : Colors.white.withOpacity(0.05)),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.monitor_rounded,
                                    color: isOnline ? const Color(0xFF10B981) : Colors.redAccent,
                                    size: 18,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          dev['name'] ?? 'Pantalla',
                                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        Text(
                                          'S/N: ${dev['serial_number']}',
                                          style: GoogleFonts.robotoMono(color: Colors.white30, fontSize: 9),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    width: 6,
                                    height: 6,
                                    decoration: BoxDecoration(
                                      color: isOnline ? const Color(0xFF10B981) : Colors.redAccent,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 24),

        // Right details panel
        Expanded(
          child: _selectedDevice == null
              ? const Center(
                  child: Text('Selecciona un dispositivo para monitorear', style: TextStyle(color: Colors.white38, fontSize: 13)),
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header of active device
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: primaryColor.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: primaryColor.withOpacity(0.2)),
                                  ),
                                  child: const Text('ACTIVO', style: TextStyle(color: primaryColor, fontSize: 9, fontWeight: FontWeight.bold)),
                                ),
                                const SizedBox(width: 10),
                                Text(
                                  _selectedDevice['name'] ?? 'Dispositivo',
                                  style: GoogleFonts.inter(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'S/N: ${_selectedDevice['serial_number']} • ${_selectedDevice['description'] ?? 'Sin descripción'}',
                              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                            ),
                          ],
                        ),
                        Text(
                          'Último ping: $lastSeen',
                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Metric Tiles Cards
                    Row(
                      children: [
                        Expanded(
                          child: _buildMetricCard(
                            title: 'TEMPERATURA CPU',
                            value: '${cpuTemp.toStringAsFixed(1)} °C',
                            color: const Color(0xFFEF4444),
                            icon: Icons.thermostat_outlined,
                            subtitle: cpuTemp > 65 ? 'Temperatura elevada' : 'Rendimiento estable',
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: _buildMetricCard(
                            title: 'USO DE CPU',
                            value: '${cpuUsage.toStringAsFixed(1)} %',
                            color: primaryColor,
                            icon: Icons.memory_outlined,
                            subtitle: 'Hilos activos de reproducción',
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: _buildMetricCard(
                            title: 'MEMORIA RAM',
                            value: '${ramUsage.toStringAsFixed(1)} %',
                            color: const Color(0xFF7000FF),
                            icon: Icons.donut_large_rounded,
                            subtitle: 'Uso de memoria caché local',
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Historical chart or placeholder
                    Expanded(
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: cardBg,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.white.withOpacity(0.05)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Historial de Telemetría (MQTT Ingest)',
                                      style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 14),
                                    ),
                                    const Text('Historial de carga e índice de rendimiento del reproductor', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                                  ],
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(6)),
                                  child: const Row(
                                    children: [
                                      Icon(Icons.wifi_tethering, color: Color(0xFF10B981), size: 12),
                                      SizedBox(width: 6),
                                      Text('Canal MQTT activo', style: TextStyle(color: Color(0xFF10B981), fontSize: 9, fontWeight: FontWeight.bold)),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 24),
                            Expanded(
                              child: _telemetryLogs.isEmpty
                                  ? Center(
                                      child: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(Icons.wifi_tethering_off_outlined, color: Colors.white24, size: 40),
                                          const SizedBox(height: 12),
                                          const Text(
                                            'Esperando reportes de telemetría vía MQTT...',
                                            style: TextStyle(color: Colors.white38, fontSize: 12),
                                          ),
                                          const SizedBox(height: 4),
                                          const Text(
                                            'Los datos simulados se han eliminado. El reproductor físico debe publicar a: devices/<serial>/telemetry',
                                            style: TextStyle(color: Colors.white24, fontSize: 10),
                                            textAlign: TextAlign.center,
                                          ),
                                        ],
                                      ),
                                    )
                                  : LayoutBuilder(
                                      builder: (context, constraints) {
                                        final double chartWidth = constraints.maxWidth;
                                        final double chartHeight = constraints.maxHeight;
                                        
                                        // Draw simplified bar graph based on cpu_temp
                                        return Row(
                                          crossAxisAlignment: CrossAxisAlignment.end,
                                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                                          children: _telemetryLogs.map<Widget>((log) {
                                            double heightPct = ((log['cpu_temp'] ?? 42.0) - 20) / 80.0;
                                            if (heightPct < 0.1) heightPct = 0.1;
                                            if (heightPct > 1.0) heightPct = 1.0;
                                            
                                            return Column(
                                              mainAxisAlignment: MainAxisAlignment.end,
                                              children: [
                                                Text('${(log['cpu_temp'] ?? 42.0).toInt()}°C', style: const TextStyle(color: Colors.white70, fontSize: 8)),
                                                const SizedBox(height: 4),
                                                Container(
                                                  width: (chartWidth / _telemetryLogs.length) * 0.6,
                                                  height: chartHeight * heightPct * 0.75,
                                                  decoration: BoxDecoration(
                                                    gradient: const LinearGradient(
                                                      colors: [primaryColor, Color(0xFF7000FF)],
                                                      begin: Alignment.topCenter,
                                                      end: Alignment.bottomCenter,
                                                    ),
                                                    borderRadius: BorderRadius.circular(4),
                                                  ),
                                                ),
                                                const SizedBox(height: 6),
                                                Text(
                                                  log['timestamp'] != null
                                                      ? DateTime.tryParse(log['timestamp'])?.toLocal().toString().split(' ')[1].substring(0, 5) ?? ''
                                                      : '',
                                                  style: const TextStyle(color: Colors.white30, fontSize: 7),
                                                ),
                                              ],
                                            );
                                          }).toList(),
                                        );
                                      },
                                    ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
        ),
      ],
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String value,
    required Color color,
    required IconData icon,
    required String subtitle,
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
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: GoogleFonts.robotoMono(color: const Color(0xFF64748B), fontSize: 9, fontWeight: FontWeight.bold),
              ),
              Icon(icon, color: color.withOpacity(0.7), size: 16),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: GoogleFonts.inter(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: const TextStyle(color: Color(0xFF64748B), fontSize: 10),
          ),
        ],
      ),
    );
  }
}
