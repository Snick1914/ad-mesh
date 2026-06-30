import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class TelemetryView extends StatefulWidget {
  const TelemetryView({super.key});

  @override
  State<TelemetryView> createState() => _TelemetryViewState();
}

class _TelemetryViewState extends State<TelemetryView> {
  // Sensor classes
  List<Map<String, dynamic>> _sensors = [
    {
      'id': 'MT-942-A',
      'name': 'Sensor Compresores Principal',
      'location': 'Área de Compresores y Neumática',
      'type': 'fluids',
      'status': 'online',
      'lastSeen': 'Justo ahora',
      'metrics': [
        {'name': 'Presión de Aire', 'value': 42.5, 'unit': 'PSI', 'status': 'normal', 'trend': 'stable'},
        {'name': 'Temperatura Cabezal', 'value': 68.2, 'unit': '°C', 'status': 'normal', 'trend': 'up'},
        {'name': 'Caudal de Salida', 'value': 120.4, 'unit': 'L/min', 'status': 'normal', 'trend': 'up'}
      ]
    },
    {
      'id': 'PWR-88-B',
      'name': 'Analizador Red Subestación',
      'location': 'Tablero General de Fuerza',
      'type': 'electrical',
      'status': 'online',
      'lastSeen': 'Hace 5 seg',
      'metrics': [
        {'name': 'Consumo Eléctrico', 'value': 12.4, 'unit': 'kW', 'status': 'normal', 'trend': 'down'},
        {'name': 'Voltaje L1-L2', 'value': 220.8, 'unit': 'V', 'status': 'normal', 'trend': 'stable'},
        {'name': 'Factor de Potencia', 'value': 0.94, 'unit': 'FP', 'status': 'normal', 'trend': 'stable'}
      ]
    },
    {
      'id': 'ENV-101-C',
      'name': 'Monitor Ambiental Almacén',
      'location': 'Almacén de Materia Prima',
      'type': 'environmental',
      'status': 'online',
      'lastSeen': 'Hace 2 min',
      'metrics': [
        {'name': 'Temperatura Ambiente', 'value': 24.8, 'unit': '°C', 'status': 'normal', 'trend': 'up'},
        {'name': 'Humedad Relativa', 'value': 58.5, 'unit': '% HR', 'status': 'normal', 'trend': 'stable'},
        {'name': 'Nivel CO2', 'value': 420.0, 'unit': 'ppm', 'status': 'normal', 'trend': 'stable'}
      ]
    },
    {
      'id': 'ENV-202-F',
      'name': 'Cámara Fría Lácteos',
      'location': 'Andén de Congelados',
      'type': 'environmental',
      'status': 'online',
      'lastSeen': 'Justo ahora',
      'metrics': [
        {'name': 'Temperatura Interna', 'value': 8.4, 'unit': '°C', 'status': 'warning', 'trend': 'up'},
        {'name': 'Humedad Relativa', 'value': 82.1, 'unit': '% HR', 'status': 'normal', 'trend': 'down'},
        {'name': 'Puerta Abierta', 'value': 1.0, 'unit': 'Estado', 'status': 'warning', 'trend': 'stable'}
      ]
    }
  ];

  Map<String, dynamic>? _selectedSensor;
  String _searchTerm = '';
  String _filterType = 'all';
  Timer? _timer;
  final Random _random = Random();

  // Add sensor form states
  bool _isModalOpen = false;
  final _newSensorIdController = TextEditingController();
  final _newSensorNameController = TextEditingController();
  final _newSensorLocationController = TextEditingController();
  String _newSensorType = 'environmental';

  // Dynamic wave graph data
  final List<int> _waveHeights = List.generate(24, (index) => 30 + Random().nextInt(50));

  @override
  void initState() {
    super.initState();
    _selectedSensor = _sensors[0];
    
    // Setup 3s interval telemetry fluctuation simulation
    _timer = Timer.periodic(const Duration(seconds: 3), (timer) {
      if (!mounted) return;
      setState(() {
        for (var sensor in _sensors) {
          if (sensor['status'] == 'offline') continue;
          final List<dynamic> metrics = sensor['metrics'];
          for (var metric in metrics) {
            double val = (metric['value'] as num).toDouble();
            String status = metric['status'] ?? 'normal';
            String trend = metric['trend'] ?? 'stable';

            final name = metric['name'].toString();
            if (name == 'Presión de Aire') {
              val = double.parse((val + (_random.nextDouble() - 0.5) * 1.5).toStringAsFixed(1));
              if (val > 55) {
                status = 'critical';
              } else if (val > 48) {
                status = 'warning';
              } else {
                status = 'normal';
              }
            } else if (name == 'Consumo Eléctrico') {
              val = double.parse((val + (_random.nextDouble() - 0.5) * 0.8).toStringAsFixed(1));
              trend = _random.nextBool() ? 'up' : 'down';
            } else if (name == 'Temperatura Interna') {
              val = double.parse((val + 0.1).toStringAsFixed(1));
              if (val > 10.0) {
                status = 'critical';
              } else if (val > 6.0) {
                status = 'warning';
              } else {
                status = 'normal';
              }
            } else if (name == 'Temperatura Ambiente' || name == 'Temperatura Cabezal') {
              val = double.parse((val + (_random.nextDouble() - 0.5) * 0.3).toStringAsFixed(1));
            } else if (name == 'Humedad Relativa') {
              val = double.parse((val + (_random.nextDouble() - 0.5) * 0.5).toStringAsFixed(1));
            } else if (name == 'Nivel CO2') {
              val = (val + _random.nextInt(10) - 5).toDouble();
            }

            metric['value'] = val;
            metric['status'] = status;
            metric['trend'] = trend;
          }
          sensor['lastSeen'] = 'Justo ahora';
        }

        // Shift wave heights for telemetry stream chart
        _waveHeights.removeAt(0);
        _waveHeights.add(20 + _random.nextInt(75));

        // Sync selected sensor
        if (_selectedSensor != null) {
          final updated = _sensors.firstWhere((s) => s['id'] == _selectedSensor!['id']);
          _selectedSensor = updated;
        }
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _handleAddSensor() {
    final id = _newSensorIdController.text.trim();
    final name = _newSensorNameController.text.trim();
    if (id.isEmpty || name.isEmpty) return;

    List<Map<String, dynamic>> defaultMetrics = [];
    if (_newSensorType == 'electrical') {
      defaultMetrics = [
        {'name': 'Consumo Eléctrico', 'value': 8.5, 'unit': 'kW', 'status': 'normal', 'trend': 'stable'},
        {'name': 'Voltaje Promedio', 'value': 220.2, 'unit': 'V', 'status': 'normal', 'trend': 'stable'}
      ];
    } else if (_newSensorType == 'environmental') {
      defaultMetrics = [
        {'name': 'Temperatura Ambiente', 'value': 21.4, 'unit': '°C', 'status': 'normal', 'trend': 'stable'},
        {'name': 'Humedad Relativa', 'value': 45.0, 'unit': '% HR', 'status': 'normal', 'trend': 'stable'}
      ];
    } else {
      defaultMetrics = [
        {'name': 'Presión en Tubería', 'value': 35.0, 'unit': 'PSI', 'status': 'normal', 'trend': 'stable'},
        {'name': 'Caudalímetro', 'value': 80.5, 'unit': 'L/min', 'status': 'normal', 'trend': 'stable'}
      ];
    }

    final Map<String, dynamic> newSensor = {
      'id': id.toUpperCase(),
      'name': name,
      'location': _newSensorLocationController.text.isNotEmpty ? _newSensorLocationController.text.trim() : 'Planta General',
      'type': _newSensorType,
      'status': 'online',
      'lastSeen': 'Justo ahora',
      'metrics': defaultMetrics
    };

    setState(() {
      _sensors.add(newSensor);
      _selectedSensor = newSensor;
      _isModalOpen = false;
      _newSensorIdController.clear();
      _newSensorNameController.clear();
      _newSensorLocationController.clear();
    });
  }

  IconData _getSensorIcon(String type) {
    switch (type) {
      case 'electrical': return Icons.bolt_rounded;
      case 'environmental': return Icons.thermostat_rounded;
      case 'fluids': return Icons.speed_rounded;
      default: return Icons.sensors_rounded;
    }
  }

  Color _getSensorColor(String type) {
    switch (type) {
      case 'electrical': return Colors.yellowAccent;
      case 'environmental': return Colors.blueAccent;
      case 'fluids': return const Color(0xFF00F0FF);
      default: return Colors.white;
    }
  }

  @override
  Widget build(BuildContext context) {
    const primaryColor = Color(0xFF00F0FF);
    const cardBg = Color(0xFF121824);
    const darkBg = Color(0xFF05070A);

    final filteredSensors = _sensors.where((s) {
      final matchesSearch = s['name'].toString().toLowerCase().contains(_searchTerm.toLowerCase()) ||
          s['id'].toString().toLowerCase().contains(_searchTerm.toLowerCase()) ||
          s['location'].toString().toLowerCase().contains(_searchTerm.toLowerCase());
      final matchesType = _filterType == 'all' || s['type'] == _filterType;
      return matchesSearch && matchesType;
    }).toList();

    return Stack(
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Left Sidebar: Sensor list
            SizedBox(
              width: 320,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text('Sensores IoT', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white)),
                              const SizedBox(width: 8),
                              Container(width: 6, height: 6, decoration: const BoxDecoration(color: Color(0xFF10B981), shape: BoxShape.circle)),
                            ],
                          ),
                          const Text('Telemetría en tiempo real', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                        ],
                      ),
                      IconButton(
                        onPressed: () => setState(() => _isModalOpen = true),
                        icon: const Icon(Icons.add_circle_outline_rounded, color: primaryColor),
                        tooltip: 'Agregar Sensor',
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Search & filter block
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: cardBg,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white.withOpacity(0.05)),
                    ),
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          decoration: BoxDecoration(
                            color: darkBg,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: TextField(
                            style: const TextStyle(color: Colors.white, fontSize: 12),
                            decoration: const InputDecoration(
                              icon: Icon(Icons.search, color: Color(0xFF94A3B8), size: 16),
                              hintText: 'Buscar por ID, nombre...',
                              hintStyle: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                              border: InputBorder.none,
                              isDense: true,
                            ),
                            onChanged: (val) => setState(() => _searchTerm = val),
                          ),
                        ),
                        const SizedBox(height: 8),
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: ['all', 'electrical', 'environmental', 'fluids'].map((type) {
                              final isSelected = _filterType == type;
                              return Padding(
                                padding: const EdgeInsets.only(right: 4.0),
                                child: InkWell(
                                  onTap: () => setState(() => _filterType = type),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: isSelected ? primaryColor.withOpacity(0.12) : Colors.transparent,
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: isSelected ? primaryColor.withOpacity(0.2) : Colors.transparent),
                                    ),
                                    child: Text(
                                      type == 'all' ? 'Todos' : (type == 'electrical' ? 'Eléc.' : (type == 'environmental' ? 'Amb.' : 'Fluidos')),
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: isSelected ? primaryColor : const Color(0xFF94A3B8),
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Sensor Cards list
                  Expanded(
                    child: ListView.separated(
                      itemCount: filteredSensors.length,
                      separatorBuilder: (c, i) => const SizedBox(height: 10),
                      itemBuilder: (context, idx) {
                        final sensor = filteredSensors[idx];
                         final isSel = _selectedSensor?['id'] == sensor['id'];
                        final List<dynamic> metrics = sensor['metrics'];
                        final hasWarning = metrics.any((m) => m['status'] == 'warning' || m['status'] == 'critical');
                        final sColor = _getSensorColor(sensor['type']);

                        return InkWell(
                          onTap: () => setState(() => _selectedSensor = sensor),
                          child: Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: cardBg,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: isSel ? primaryColor : Colors.white.withOpacity(0.05)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Row(
                                      children: [
                                        Icon(_getSensorIcon(sensor['type']), color: sColor, size: 16),
                                        const SizedBox(width: 8),
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(sensor['name'] ?? '', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
                                            Text('${sensor['id']} • ${sensor['location']}', style: const TextStyle(color: Colors.white30, fontSize: 9)),
                                          ],
                                        ),
                                      ],
                                    ),
                                    if (hasWarning)
                                      Container(
                                        width: 6,
                                        height: 6,
                                        decoration: const BoxDecoration(color: Colors.redAccent, shape: BoxShape.circle),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                Row(
                                  children: metrics.take(2).map<Widget>((m) {
                                    final crit = m['status'] == 'critical';
                                    final warn = m['status'] == 'warning';
                                    return Expanded(
                                      child: Container(
                                        margin: const EdgeInsets.only(right: 6),
                                        padding: const EdgeInsets.all(6),
                                        decoration: BoxDecoration(color: Colors.black12, borderRadius: BorderRadius.circular(8)),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(m['name'], style: const TextStyle(color: Colors.white30, fontSize: 8), maxLines: 1, overflow: TextOverflow.ellipsis),
                                            Text(
                                              '${m['value']} ${m['unit']}',
                                              style: TextStyle(
                                                color: crit ? Colors.redAccent : (warn ? Colors.yellowAccent : Colors.white70),
                                                fontWeight: FontWeight.bold,
                                                fontSize: 10,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    );
                                  }).toList(),
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

            // Right Panel: Detailed Metrics Dashboard
            Expanded(
              child: _selectedSensor == null
                  ? const Center(child: Text('Selecciona un sensor para monitorizar telemetría'))
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Details Header
                        Container(
                          padding: const EdgeInsets.only(bottom: 16),
                          decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.05)))),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(color: cardBg, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.white12)),
                                    child: Icon(_getSensorIcon(_selectedSensor!['type']), color: _getSensorColor(_selectedSensor!['type']), size: 24),
                                  ),
                                  const SizedBox(width: 16),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Text(_selectedSensor!['name'] ?? '', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                                          const SizedBox(width: 8),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(color: const Color(0xFF10B981).withOpacity(0.12), borderRadius: BorderRadius.circular(4)),
                                            child: const Text('ACTIVO', style: TextStyle(color: Color(0xFF10B981), fontSize: 8, fontWeight: FontWeight.bold)),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text('${_selectedSensor!['id']} • ${_selectedSensor!['location']}', style: const TextStyle(color: Colors.white54, fontSize: 11)),
                                    ],
                                  ),
                                ],
                              ),
                              Row(
                                children: [
                                  const Icon(Icons.sync_rounded, color: primaryColor, size: 14),
                                  const SizedBox(width: 6),
                                  Text('Último ping: ${_selectedSensor!['lastSeen']}', style: const TextStyle(color: Colors.white30, fontSize: 11)),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Metric KPI Grid
                        GridView.count(
                          crossAxisCount: 3,
                          crossAxisSpacing: 16,
                          mainAxisSpacing: 16,
                          shrinkWrap: true,
                          childAspectRatio: 1.8,
                          physics: const NeverScrollableScrollPhysics(),
                          children: (_selectedSensor!['metrics'] as List<dynamic>).map<Widget>((metric) {
                            final double val = (metric['value'] as num).toDouble();
                            final unit = metric['unit'].toString();
                            final status = metric['status'].toString();
                            final isCrit = status == 'critical';
                            final isWarn = status == 'warning';

                            double maxLimit = 100.0;
                            if (unit == 'PSI') maxLimit = 80.0;
                            if (unit == '°C') maxLimit = 100.0;
                            if (unit == 'kW') maxLimit = 25.0;
                            if (unit == 'ppm') maxLimit = 800.0;

                            final percent = min(val / maxLimit, 1.0);

                            return Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: cardBg,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: isCrit ? Colors.redAccent.withOpacity(0.3) : (isWarn ? Colors.yellowAccent.withOpacity(0.3) : Colors.white.withOpacity(0.05)),
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(metric['name'].toString().toUpperCase(), style: const TextStyle(color: Colors.white54, fontSize: 9, fontWeight: FontWeight.bold)),
                                      if (isCrit || isWarn)
                                        Icon(Icons.warning_amber_rounded, color: isCrit ? Colors.redAccent : Colors.yellowAccent, size: 14),
                                    ],
                                  ),
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.baseline,
                                    textBaseline: TextBaseline.alphabetic,
                                    children: [
                                      Text('${metric['value']}', style: GoogleFonts.robotoMono(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                                      const SizedBox(width: 6),
                                      Text(unit, style: const TextStyle(color: Colors.white54, fontSize: 12)),
                                    ],
                                  ),
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(4),
                                    child: LinearProgressIndicator(
                                      value: percent,
                                      minHeight: 4,
                                      backgroundColor: Colors.white10,
                                      valueColor: AlwaysStoppedAnimation(
                                        isCrit ? Colors.redAccent : (isWarn ? Colors.yellowAccent : primaryColor),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 24),

                        // Telemetry Live Chart
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: cardBg,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: Colors.white.withOpacity(0.05)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('Flujo de Telemetría Dinámico', style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13)),
                                        const Text('Monitoreo vía protocolo Modbus TCP / MQTT.', style: TextStyle(color: Colors.white30, fontSize: 10)),
                                      ],
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(color: primaryColor.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
                                      child: const Row(
                                        children: [
                                          Icon(Icons.sensors_rounded, color: primaryColor, size: 12),
                                          SizedBox(width: 6),
                                          Text('1 Hz Stream', style: TextStyle(color: primaryColor, fontSize: 9, fontWeight: FontWeight.bold)),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 24),
                                Expanded(
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: _waveHeights.map((h) {
                                      return Expanded(
                                        child: Padding(
                                          padding: const EdgeInsets.symmetric(horizontal: 3.0),
                                          child: Container(
                                            height: h.toDouble() * 1.5,
                                            decoration: BoxDecoration(
                                              borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                                              gradient: LinearGradient(
                                                begin: Alignment.bottomCenter,
                                                end: Alignment.topCenter,
                                                colors: [
                                                  Colors.blueAccent.withOpacity(0.2),
                                                  primaryColor,
                                                ],
                                              ),
                                            ),
                                          ),
                                        ),
                                      );
                                    }).toList(),
                                  ),
                                ),
                                const SizedBox(height: 10),
                                const Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text('Hace 1 min', style: TextStyle(color: Colors.white24, fontSize: 9)),
                                    Text('Hace 30 seg', style: TextStyle(color: Colors.white24, fontSize: 9)),
                                    Text('En tiempo real', style: TextStyle(color: Colors.white24, fontSize: 9)),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
            ),
          ],
        ),

        // Add Sensor Modal Dialog
        if (_isModalOpen)
          Positioned.fill(
            child: Stack(
              alignment: Alignment.center,
              children: [
                GestureDetector(
                  onTap: () => setState(() => _isModalOpen = false),
                   child: Container(color: Colors.black.withOpacity(0.8)),
                ),
                Container(
                  constraints: const BoxConstraints(maxWidth: 400),
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: cardBg,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: Colors.white.withOpacity(0.08)),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Vincular Sensor IoT', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 16)),
                          IconButton(onPressed: () => setState(() => _isModalOpen = false), icon: const Icon(Icons.close)),
                        ],
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: _newSensorIdController,
                        style: const TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          labelText: 'Código o ID del Sensor',
                          labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                          filled: true,
                          fillColor: darkBg,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _newSensorNameController,
                        style: const TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          labelText: 'Nombre del Sensor',
                          labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                          filled: true,
                          fillColor: darkBg,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _newSensorLocationController,
                        style: const TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          labelText: 'Ubicación física en Planta',
                          labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                          filled: true,
                          fillColor: darkBg,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text('Tipo de Adquisición de Datos', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(color: darkBg, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white12)),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _newSensorType,
                            dropdownColor: darkBg,
                            isExpanded: true,
                            style: const TextStyle(color: Colors.white, fontSize: 13),
                            items: const [
                              DropdownMenuItem(value: 'environmental', child: Text('Variables Ambientales (°C, %HR, CO2)')),
                              DropdownMenuItem(value: 'electrical', child: Text('Eléctrico (kW, Voltaje, FP)')),
                              DropdownMenuItem(value: 'fluids', child: Text('Presión y Fluidos (PSI, Caudal)')),
                            ],
                            onChanged: (val) {
                              if (val != null) setState(() => _newSensorType = val);
                            },
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => setState(() => _isModalOpen = false),
                              style: OutlinedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                              child: const Text('Cancelar'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: _handleAddSensor,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: primaryColor,
                                foregroundColor: Colors.black,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              child: const Text('Vincular'),
                            ),
                          ),
                        ],
                      )
                    ],
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
