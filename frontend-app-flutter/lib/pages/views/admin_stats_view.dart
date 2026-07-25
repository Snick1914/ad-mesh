import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../models/summary_data.dart';
import '../../services/api_service.dart';

class AdminStatsView extends StatefulWidget {
  const AdminStatsView({super.key});

  @override
  State<AdminStatsView> createState() => _AdminStatsViewState();
}

class _AdminStatsViewState extends State<AdminStatsView> {
  SummaryData? _data;
  bool _isLoading = true;

  Future<void> _fetchData() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    final summary = await ApiService.getSummary();
    if (!mounted) return;
    setState(() {
      _data = summary;
      _isLoading = false;
    });
  }

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  @override
  Widget build(BuildContext context) {
    const primaryColor = Color(0xFF00F0FF);
    const cardBg = Color(0xFF121824);

    final isDesktop = MediaQuery.of(context).size.width >= 900;

    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation(primaryColor)),
      );
    }

    final storagePercentage = _data != null && _data!.storage.totalGb > 0
        ? (_data!.storage.usedGb / _data!.storage.totalGb)
        : 0.0;

    return RefreshIndicator(
      onRefresh: _fetchData,
      color: primaryColor,
      backgroundColor: cardBg,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Welcome
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Consola de Control',
                      style: GoogleFonts.inter(
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Monitoreo técnico de la red de pantallas ad-mesh.',
                      style: TextStyle(
                        fontSize: 13,
                        color: Color(0xFF94A3B8),
                      ),
                    ),
                  ],
                ),
                ElevatedButton.icon(
                  onPressed: _fetchData,
                  icon: const Icon(Icons.refresh, size: 16),
                  label: const Text('Actualizar'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white.withOpacity(0.05),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: Colors.white.withOpacity(0.08)),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),

            // Cards Grid
            GridView.count(
              crossAxisCount: isDesktop ? 4 : 2,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              childAspectRatio: isDesktop ? 1.4 : 1.1,
              children: [
                _buildMetricCard(
                  title: 'CLIENTES',
                  value: '${_data?.users.total ?? 0}',
                  subtitle: '${_data?.users.active ?? 0} Activos | ${_data?.users.suspended ?? 0} Sus.',
                  icon: Icons.people_outline,
                  glowColor: const Color(0xFF7000FF),
                ),
                _buildMetricCard(
                  title: 'PANTALLAS',
                  value: '${_data?.devices.total ?? 0}',
                  subtitle: '${_data?.devices.online ?? 0} En Línea | ${_data?.devices.offline ?? 0} Off.',
                  icon: Icons.monitor_rounded,
                  glowColor: primaryColor,
                ),
                _buildMetricCard(
                  title: 'ALMACENAMIENTO',
                  value: '${_data?.storage.usedGb.toInt() ?? 0} GB',
                  subtitle: 'Total: ${_data?.storage.totalGb.toInt() ?? 0} GB',
                  icon: Icons.storage_rounded,
                  glowColor: const Color(0xFF10B981),
                ),
                _buildMetricCard(
                  title: 'SISTEMA',
                  value: _data?.server.dbStatus == 'online' ? 'Estable' : 'Falla',
                  subtitle: 'Base de datos en línea',
                  icon: Icons.dns_rounded,
                  glowColor: const Color(0xFFB8FF33),
                ),
              ],
            ),
            const SizedBox(height: 32),

            // Charts and metrics
            LayoutBuilder(
              builder: (context, constraints) {
                final chartWidth = constraints.maxWidth;
                final useRow = chartWidth >= 800;

                final widgets = [
                  // Server Health Card
                  Container(
                    padding: const EdgeInsets.all(24.0),
                    decoration: BoxDecoration(
                      color: cardBg,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withOpacity(0.05)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Salud del Servidor Cloud',
                          style: GoogleFonts.inter(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Uso en tiempo real del contenedor de la API.',
                          style: TextStyle(
                            fontSize: 12,
                            color: Color(0xFF94A3B8),
                          ),
                        ),
                        const SizedBox(height: 24),
                        _buildStatBar(
                          title: 'Procesador (CPU)',
                          value: _data?.server.cpuUsage ?? 0,
                          color: primaryColor,
                        ),
                        const SizedBox(height: 20),
                        _buildStatBar(
                          title: 'Memoria RAM',
                          value: _data?.server.memoryUsage ?? 0,
                          color: const Color(0xFF7000FF),
                        ),
                      ],
                    ),
                  ),
                  // Storage Consumed Card
                  Container(
                    padding: const EdgeInsets.all(24.0),
                    decoration: BoxDecoration(
                      color: cardBg,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withOpacity(0.05)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Almacenamiento Consumido',
                          style: GoogleFonts.inter(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 24),
                        Center(
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              SizedBox(
                                width: 110,
                                height: 110,
                                child: CircularProgressIndicator(
                                  value: storagePercentage,
                                  strokeWidth: 10,
                                  backgroundColor: Colors.white.withOpacity(0.05),
                                  valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF10B981)),
                                ),
                              ),
                              Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    '${(storagePercentage * 100).toInt()}%',
                                    style: GoogleFonts.robotoMono(
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  Text(
                                    'USADO',
                                    style: GoogleFonts.inter(
                                      fontSize: 9,
                                      color: const Color(0xFF94A3B8),
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              )
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Utilizado:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
                            Text('${_data?.storage.usedGb.toInt() ?? 0} GB', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Libre:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
                            Text(
                              '${((_data?.storage.totalGb ?? 0) - (_data?.storage.usedGb ?? 0)).toInt()} GB',
                              style: const TextStyle(color: primaryColor, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ];

                if (useRow) {
                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(flex: 2, child: widgets[0]),
                      const SizedBox(width: 24),
                      Expanded(flex: 1, child: widgets[1]),
                    ],
                  );
                } else {
                  return Column(
                    children: [
                      widgets[0],
                      const SizedBox(height: 24),
                      widgets[1],
                    ],
                  );
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color glowColor,
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
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: glowColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: glowColor.withOpacity(0.2)),
                ),
                child: Icon(icon, color: glowColor, size: 20),
              ),
              Text(
                title,
                style: GoogleFonts.robotoMono(
                  fontSize: 10,
                  color: const Color(0xFF94A3B8),
                  fontWeight: FontWeight.bold,
                ),
              )
            ],
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: GoogleFonts.inter(
              fontSize: 11,
              color: const Color(0xFF94A3B8),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatBar({
    required String title,
    required double value,
    required Color color,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              title,
              style: const TextStyle(color: Colors.white, fontSize: 13),
            ),
            Text(
              '${value.toStringAsFixed(1)}%',
              style: GoogleFonts.robotoMono(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: LinearProgressIndicator(
            value: value / 100,
            minHeight: 8,
            backgroundColor: Colors.white.withOpacity(0.05),
            valueColor: AlwaysStoppedAnimation(color),
          ),
        ),
      ],
    );
  }
}
