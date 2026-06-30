import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../services/api_service.dart';

class DevicesView extends StatefulWidget {
  const DevicesView({super.key});

  @override
  State<DevicesView> createState() => _DevicesViewState();
}

class _DevicesViewState extends State<DevicesView> {
  List<dynamic> _devices = [];
  List<dynamic> _playlists = [];
  bool _isLoading = true;
  String _searchTerm = '';
  String _filterStatus = 'all';

  // State parameters for dialogs
  bool _isPairingOpen = false;
  final _pairingCodeController = TextEditingController();
  final _deviceNameController = TextEditingController();

  // Drawer / Details configuration
  dynamic _selectedDevice;
  String _activeTab = 'config'; // 'config' or 'schedule'

  // Device config state
  String _resolution = '1920x1080';
  String _layout = 'single';
  Map<String, dynamic> _layoutConfig = {};
  String _zoneA = '';
  String _zoneB = '';
  String _zoneC = '';
  bool _isSavingConfig = false;
  bool _configSuccess = false;
  bool _isUnpairing = false;

  // Schedules state
  List<dynamic> _schedules = [];
  bool _isLoadingSchedules = false;
  bool _isCreatingSchedule = false;
  int? _deletingScheduleId;

  // New Schedule form
  String _newScheduleZone = 'A';
  String _newSchedulePlaylistId = '';
  TimeOfDay _startTime = const TimeOfDay(hour: 8, minute: 0);
  TimeOfDay _endTime = const TimeOfDay(hour: 17, minute: 0);
  List<int> _daysOfWeek = [1, 2, 3, 4, 5]; // Mon to Fri

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final devs = await ApiService.getDevices();
    final plays = await ApiService.getPlaylists();
    setState(() {
      _devices = devs;
      _playlists = plays;
      _isLoading = false;
    });
  }

  Future<void> _fetchSchedules(int deviceId) async {
    setState(() => _isLoadingSchedules = true);
    final scheds = await ApiService.getDeviceSchedules(deviceId);
    setState(() {
      _schedules = scheds;
      _isLoadingSchedules = false;
    });
  }

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _selectDevice(dynamic dev) {
    setState(() {
      _selectedDevice = dev;
      _activeTab = 'config';
      _resolution = dev['resolution'] ?? '1920x1080';
      _layout = dev['layout'] ?? 'single';
      _layoutConfig = dev['layout_config'] != null ? Map<String, dynamic>.from(dev['layout_config']) : {};
      _zoneA = dev['playlist_id'] != null ? dev['playlist_id'].toString() : '';
      _zoneB = dev['playlist_b_id'] != null ? dev['playlist_b_id'].toString() : '';
      _zoneC = dev['playlist_c_id'] != null ? dev['playlist_c_id'].toString() : '';
      _configSuccess = false;
      _schedules = [];
    });
  }

  Future<void> _saveConfig() async {
    if (_selectedDevice == null) return;
    setState(() => _isSavingConfig = true);
    final payload = {
      'resolution': _resolution,
      'layout': _layout,
      'layout_config': _layoutConfig.isNotEmpty ? _layoutConfig : null,
      'playlist_id': _zoneA.isNotEmpty ? int.tryParse(_zoneA) : null,
      'playlist_b_id': _zoneB.isNotEmpty ? int.tryParse(_zoneB) : null,
      'playlist_c_id': _zoneC.isNotEmpty ? int.tryParse(_zoneC) : null,
    };
    final success = await ApiService.updateDeviceConfig(_selectedDevice['id'], payload);
    setState(() {
      _isSavingConfig = false;
      if (success) {
        _configSuccess = true;
      }
    });

    if (success) {
      await _loadData();
      Future.delayed(const Duration(milliseconds: 1500), () {
        if (mounted) {
          setState(() {
            _configSuccess = false;
            _selectedDevice = null;
          });
        }
      });
    }
  }

  Future<void> _handleUnpair() async {
    if (_selectedDevice == null) return;
    setState(() => _isUnpairing = true);
    final success = await ApiService.unpairDevice(_selectedDevice['id']);
    setState(() {
      _isUnpairing = false;
      if (success) {
        _selectedDevice = null;
      }
    });
    if (success) {
      await _loadData();
    }
  }

  Future<void> _handleCreateSchedule() async {
    if (_selectedDevice == null || _newSchedulePlaylistId.isEmpty) return;
    setState(() => _isCreatingSchedule = true);
    final startStr = '${_startTime.hour.toString().padLeft(2, '0')}:${_startTime.minute.toString().padLeft(2, '0')}:00';
    final endStr = '${_endTime.hour.toString().padLeft(2, '0')}:${_endTime.minute.toString().padLeft(2, '0')}:00';

    final payload = {
      'zone': _newScheduleZone,
      'playlist_id': int.parse(_newSchedulePlaylistId),
      'start_time': startStr,
      'end_time': endStr,
      'days_of_week': _daysOfWeek,
    };

    final success = await ApiService.createDeviceSchedule(_selectedDevice['id'], payload);
    setState(() => _isCreatingSchedule = false);
    if (success) {
      _newSchedulePlaylistId = '';
      await _fetchSchedules(_selectedDevice['id']);
    }
  }

  Future<void> _handleDeleteSchedule(int scheduleId) async {
    setState(() => _deletingScheduleId = scheduleId);
    final success = await ApiService.deleteDeviceSchedule(scheduleId);
    setState(() => _deletingScheduleId = null);
    if (success && _selectedDevice != null) {
      await _fetchSchedules(_selectedDevice['id']);
    }
  }

  Future<void> _handlePairDevice() async {
    if (_pairingCodeController.text.length != 6 || _deviceNameController.text.isEmpty) return;
    setState(() => _isLoading = true);
    final success = await ApiService.pairDevice(_pairingCodeController.text, _deviceNameController.text);
    setState(() {
      _isLoading = false;
      if (success) {
        _isPairingOpen = false;
        _pairingCodeController.clear();
        _deviceNameController.clear();
      }
    });
    if (success) {
      await _loadData();
    }
  }

  List<String> _getAvailableZones() {
    if (_layout == 'split-h' || _layout == 'split-v') return ['A', 'B'];
    if (_layout == 'l-shape') return ['A', 'B', 'C'];
    return ['A'];
  }

  String _getLayoutName(String lay) {
    switch (lay) {
      case 'single': return 'Pantalla Completa';
      case 'split-h': return 'Dividido Horizontal';
      case 'split-v': return 'Dividido Vertical';
      case 'l-shape': return 'Diseño en L (Multi-Zona)';
      default: return 'Desconocido';
    }
  }

  String _getPlaylistName(dynamic playlistId) {
    if (playlistId == null) return 'Sin asignar';
    final match = _playlists.firstWhere((p) => p['id'].toString() == playlistId.toString(), orElse: () => null);
    return match != null ? match['name'] : 'Playlist #$playlistId';
  }

  @override
  Widget build(BuildContext context) {
    const primaryColor = Color(0xFF00F0FF);
    const cardBg = Color(0xFF121824);
    const darkBg = Color(0xFF05070A);

    final filteredDevices = _devices.where((d) {
      final matchesSearch = d['name'].toString().toLowerCase().contains(_searchTerm.toLowerCase()) ||
          d['serial_number'].toString().toLowerCase().contains(_searchTerm.toLowerCase());
      final matchesStatus = _filterStatus == 'all' || d['status'] == _filterStatus;
      return matchesSearch && matchesStatus;
    }).toList();

    return Stack(
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Dispositivos',
                      style: GoogleFonts.inter(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Gestiona tus reproductores, configura su resolución y divide las pantallas en múltiples zonas.',
                      style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                    ),
                  ],
                ),
                ElevatedButton.icon(
                  onPressed: () => setState(() => _isPairingOpen = true),
                  icon: const Icon(Icons.add_to_queue_rounded, size: 18),
                  label: const Text('Vincular Pantalla'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryColor,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Search Bar & Filter Tabs
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withOpacity(0.05)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: darkBg,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white.withOpacity(0.05)),
                      ),
                      child: TextField(
                        style: const TextStyle(color: Colors.white),
                        decoration: const InputDecoration(
                          icon: Icon(Icons.search, color: Color(0xFF94A3B8)),
                          hintText: 'Buscar por nombre o serie...',
                          hintStyle: TextStyle(color: Color(0xFF94A3B8)),
                          border: InputBorder.none,
                        ),
                        onChanged: (val) => setState(() => _searchTerm = val),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Row(
                    children: ['all', 'online', 'offline'].map((status) {
                      final isSelected = _filterStatus == status;
                      return Padding(
                        padding: const EdgeInsets.only(left: 8.0),
                        child: InkWell(
                          onTap: () => setState(() => _filterStatus = status),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                            decoration: BoxDecoration(
                              color: isSelected ? Colors.white.withOpacity(0.1) : Colors.transparent,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isSelected ? Colors.white.withOpacity(0.2) : Colors.white.withOpacity(0.05),
                              ),
                            ),
                            child: Text(
                              status == 'all' ? 'Todos' : (status == 'online' ? 'Online' : 'Offline'),
                              style: TextStyle(
                                color: isSelected ? Colors.white : const Color(0xFF94A3B8),
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Devices Grid
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation(primaryColor)))
                  : filteredDevices.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.monitor_rounded, size: 64, color: Colors.white24),
                              const SizedBox(height: 16),
                              Text('No se encontraron dispositivos', style: GoogleFonts.inter(color: Colors.white70)),
                            ],
                          ),
                        )
                      : GridView.builder(
                          gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                            maxCrossAxisExtent: 380,
                            mainAxisSpacing: 20,
                            crossAxisSpacing: 20,
                            childAspectRatio: 1.25,
                          ),
                          itemCount: filteredDevices.length,
                          itemBuilder: (context, index) {
                            final dev = filteredDevices[index];
                            final status = dev['status'] ?? 'offline';
                            final isOnline = status == 'online';
                            final isSyncing = status == 'syncing';
                            final double storageUsed = (dev['storage_used_gb'] ?? 0.0).toDouble();
                            final double storageTotal = (dev['storage_limit_gb'] ?? 20.0).toDouble();
                            final storagePercentage = storageTotal > 0 ? (storageUsed / storageTotal) : 0.0;

                            return InkWell(
                              onTap: () => _selectDevice(dev),
                              borderRadius: BorderRadius.circular(20),
                              child: Container(
                                padding: const EdgeInsets.all(20),
                                decoration: BoxDecoration(
                                  color: cardBg,
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: Colors.white.withOpacity(0.05)),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Row(
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.all(8),
                                              decoration: BoxDecoration(
                                                color: Colors.white.withOpacity(0.05),
                                                borderRadius: BorderRadius.circular(10),
                                              ),
                                              child: const Icon(Icons.tv_outlined, color: Colors.white70, size: 20),
                                            ),
                                            const SizedBox(width: 12),
                                            Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  dev['name'] ?? 'Dispositivo',
                                                  style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 15),
                                                ),
                                                Text(
                                                  dev['serial_number'] ?? '',
                                                  style: GoogleFonts.robotoMono(fontSize: 10, color: const Color(0xFF94A3B8)),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: isOnline
                                                ? const Color(0xFF10B981).withOpacity(0.1)
                                                : (isSyncing ? primaryColor.withOpacity(0.1) : Colors.red.withOpacity(0.1)),
                                            borderRadius: BorderRadius.circular(20),
                                            border: Border.all(
                                              color: isOnline
                                                  ? const Color(0xFF10B981).withOpacity(0.2)
                                                  : (isSyncing ? primaryColor.withOpacity(0.2) : Colors.red.withOpacity(0.2)),
                                            ),
                                          ),
                                          child: Text(
                                            isOnline ? 'Online' : (isSyncing ? 'Sincronizando' : 'Offline'),
                                            style: GoogleFonts.inter(
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold,
                                              color: isOnline ? const Color(0xFF10B981) : (isSyncing ? primaryColor : Colors.redAccent),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 12),
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: darkBg.withOpacity(0.5),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Row(
                                        children: [
                                          const Icon(Icons.grid_view_rounded, size: 16, color: primaryColor),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              'Layout: ${_getLayoutName(dev['layout'] ?? 'single')}',
                                              style: const TextStyle(color: Colors.white70, fontSize: 11),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            const Text('Almacenamiento Local', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                                            Text(
                                              '${storageUsed.toStringAsFixed(1)} GB / ${storageTotal.toStringAsFixed(0)} GB',
                                              style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 6),
                                        ClipRRect(
                                          borderRadius: BorderRadius.circular(4),
                                          child: LinearProgressIndicator(
                                            value: storagePercentage,
                                            minHeight: 6,
                                            backgroundColor: Colors.white10,
                                            valueColor: AlwaysStoppedAnimation(
                                              storagePercentage > 0.8 ? Colors.redAccent : primaryColor,
                                            ),
                                          ),
                                        ),
                                      ],
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

        // Device Details Drawer (Adjustments)
        if (_selectedDevice != null) ...[
          Positioned.fill(
            child: GestureDetector(
              onTap: () => setState(() => _selectedDevice = null),
              child: Container(color: Colors.black54),
            ),
          ),
          Positioned(
            right: 0,
            top: 0,
            bottom: 0,
            width: 480,
            child: Container(
              color: cardBg,
              decoration: BoxDecoration(
                border: Border(left: BorderSide(color: Colors.white.withOpacity(0.1))),
              ),
              child: Scaffold(
                backgroundColor: cardBg,
                appBar: AppBar(
                  backgroundColor: cardBg,
                  elevation: 0,
                  automaticallyImplyLeading: false,
                  title: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Ajustes del Player', style: TextStyle(fontSize: 11, color: primaryColor, fontWeight: FontWeight.bold)),
                      Text(_selectedDevice['name'] ?? 'Dispositivo', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      Text('Serie: ${_selectedDevice['serial_number']}', style: GoogleFonts.robotoMono(fontSize: 10, color: const Color(0xFF94A3B8))),
                    ],
                  ),
                  actions: [
                    IconButton(
                      onPressed: () => setState(() => _selectedDevice = null),
                      icon: const Icon(Icons.close, color: Colors.white70),
                    )
                  ],
                ),
                body: Column(
                  children: [
                    // Tabs Header
                    Container(
                      decoration: BoxDecoration(
                        border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.05))),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: () => setState(() => _activeTab = 'config'),
                              child: Container(
                                alignment: Alignment.center,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                decoration: BoxDecoration(
                                  border: Border(
                                    bottom: BorderSide(
                                      color: _activeTab == 'config' ? primaryColor : Colors.transparent,
                                      width: 2,
                                    ),
                                  ),
                                ),
                                child: Text(
                                  'Configuración',
                                  style: TextStyle(
                                    color: _activeTab == 'config' ? primaryColor : Colors.white60,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: InkWell(
                              onTap: () {
                                setState(() => _activeTab = 'schedule');
                                _fetchSchedules(_selectedDevice['id']);
                              },
                              child: Container(
                                alignment: Alignment.center,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                decoration: BoxDecoration(
                                  border: Border(
                                    bottom: BorderSide(
                                      color: _activeTab == 'schedule' ? primaryColor : Colors.transparent,
                                      width: 2,
                                    ),
                                  ),
                                ),
                                child: Text(
                                  'Programación',
                                  style: TextStyle(
                                    color: _activeTab == 'schedule' ? primaryColor : Colors.white60,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Tab Contents
                    Expanded(
                      child: _activeTab == 'config' ? _buildConfigTab() : _buildSchedulesTab(),
                    ),
                  ],
                ),
              ),
            ),
          )
        ],

        // Pairing Modal Dialog
        if (_isPairingOpen)
          Positioned.fill(
            child: Stack(
              alignment: Alignment.center,
              children: [
                GestureDetector(
                  onTap: () => setState(() => _isPairingOpen = false),
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
                          Text('Vincular Nueva Pantalla', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 16)),
                          IconButton(
                            onPressed: () => setState(() => _isPairingOpen = false),
                            icon: const Icon(Icons.close),
                          )
                        ],
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: _pairingCodeController,
                        maxLength: 6,
                        style: GoogleFonts.robotoMono(color: Colors.white, fontSize: 24, letterSpacing: 6),
                        textAlign: TextAlign.center,
                        decoration: InputDecoration(
                          labelText: 'Código de Activación (6 dígitos)',
                          labelStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                          filled: true,
                          fillColor: darkBg,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: _deviceNameController,
                        style: const TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          labelText: 'Nombre Asignado',
                          labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                          filled: true,
                          fillColor: darkBg,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => setState(() => _isPairingOpen = false),
                              style: OutlinedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                              child: const Text('Cancelar'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: _handlePairDevice,
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

  Widget _buildBlueprintPreview() {
    const primaryColor = Color(0xFF00F0FF);
    final double borderOpacity = 0.15;

    Widget zoneBox(String label, Color color) {
      return Container(
        alignment: Alignment.center,
        color: color.withOpacity(0.08),
        child: Text(
          label,
          style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12),
        ),
      );
    }

    if (_layout == 'split-h') {
      final double zoneAHeight = (_layoutConfig['zone_a_height'] ?? 50.0).toDouble();
      return Container(
        height: 160,
        decoration: BoxDecoration(
          color: Colors.black38,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withOpacity(borderOpacity)),
        ),
        child: Column(
          children: [
            Expanded(
              flex: zoneAHeight.toInt(),
              child: zoneBox('Zona A ($zoneAHeight%)', Colors.blueAccent),
            ),
            Container(height: 1, color: Colors.white12),
            Expanded(
              flex: (100 - zoneAHeight).toInt(),
              child: zoneBox('Zona B (${100 - zoneAHeight}%)', Colors.indigoAccent),
            ),
          ],
        ),
      );
    }

    if (_layout == 'split-v') {
      final double zoneAWidth = (_layoutConfig['zone_a_width'] ?? 50.0).toDouble();
      return Container(
        height: 160,
        decoration: BoxDecoration(
          color: Colors.black38,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withOpacity(borderOpacity)),
        ),
        child: Row(
          children: [
            Expanded(
              flex: zoneAWidth.toInt(),
              child: zoneBox('A ($zoneAWidth%)', Colors.purpleAccent),
            ),
            Container(width: 1, color: Colors.white12),
            Expanded(
              flex: (100 - zoneAWidth).toInt(),
              child: zoneBox('B (${100 - zoneAWidth}%)', Colors.pinkAccent),
            ),
          ],
        ),
      );
    }

    if (_layout == 'l-shape') {
      final double topH = (_layoutConfig['top_row_height'] ?? 85.0).toDouble();
      final double aW = (_layoutConfig['zone_a_width'] ?? 70.0).toDouble();
      return Container(
        height: 160,
        decoration: BoxDecoration(
          color: Colors.black38,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withOpacity(borderOpacity)),
        ),
        child: Column(
          children: [
            Expanded(
              flex: topH.toInt(),
              child: Row(
                children: [
                  Expanded(
                    flex: aW.toInt(),
                    child: zoneBox('A ($aW%)', primaryColor),
                  ),
                  Container(width: 1, color: Colors.white12),
                  Expanded(
                    flex: (100 - aW).toInt(),
                    child: zoneBox('B (${100 - aW}%)', Colors.amberAccent),
                  ),
                ],
              ),
            ),
            Container(height: 1, color: Colors.white12),
            Expanded(
              flex: (100 - topH).toInt(),
              child: zoneBox('Cintillo C (${100 - topH}%)', const Color(0xFF10B981)),
            ),
          ],
        ),
      );
    }

    // Default: single
    return Container(
      height: 160,
      decoration: BoxDecoration(
        color: Colors.black38,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(borderOpacity)),
      ),
      child: Center(
        child: zoneBox('Zona A (100%)', primaryColor),
      ),
    );
  }

  Widget _buildConfigTab() {
    const primaryColor = Color(0xFF00F0FF);
    const darkBg = Color(0xFF05070A);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_configSuccess)
            Container(
              margin: const EdgeInsets.only(bottom: 20),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.green.withOpacity(0.3)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.check_circle_outline_rounded, color: Colors.green),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      '¡Ajustes guardados y sincronizados con éxito!',
                      style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),

          // HDMI Resolution Preset
          const Text('Resolución de Pantalla', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: darkBg,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white12),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _resolution,
                isExpanded: true,
                dropdownColor: darkBg,
                style: const TextStyle(color: Colors.white),
                items: const [
                  DropdownMenuItem(value: '1920x1080', child: Text('1920 × 1080 (Full HD 1080p)')),
                  DropdownMenuItem(value: '1280x720', child: Text('1280 × 720 (HD Ready 720p)')),
                  DropdownMenuItem(value: '3840x2160', child: Text('3840 × 2160 (4K Ultra HD)')),
                  DropdownMenuItem(value: '1080x1920', child: Text('1080 × 1920 (Vertical Totem)')),
                  DropdownMenuItem(value: '720x1280', child: Text('720 × 1280 (Vertical Totem HD)')),
                ],
                onChanged: (val) {
                  if (val != null) setState(() => _resolution = val);
                },
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Layout Division select
          const Text('Layout de Pantalla (Zonas)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            shrinkWrap: true,
            childAspectRatio: 2.2,
            physics: const NeverScrollableScrollPhysics(),
            children: [
              {'id': 'single', 'label': 'Pantalla Completa'},
              {'id': 'split-h', 'label': 'División Horiz.'},
              {'id': 'split-v', 'label': 'División Vert.'},
              {'id': 'l-shape', 'label': 'Diseño L-Comercial'},
            ].map((opt) {
              final isSel = _layout == opt['id'];
              return InkWell(
                onTap: () {
                  setState(() {
                    _layout = opt['id']!;
                    if (_layout == 'split-h') {
                      _layoutConfig = {'zone_a_height': 50};
                    } else if (_layout == 'split-v') {
                      _layoutConfig = {'zone_a_width': 50};
                    } else if (_layout == 'l-shape') {
                      _layoutConfig = {'top_row_height': 85, 'zone_a_width': 70};
                    } else {
                      _layoutConfig = {};
                    }
                  });
                },
                child: Container(
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: isSel ? primaryColor.withOpacity(0.08) : Colors.transparent,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isSel ? primaryColor : Colors.white12,
                    ),
                  ),
                  child: Text(
                    opt['label']!,
                    style: TextStyle(
                      color: isSel ? Colors.white : Colors.white54,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 24),

          // Blueprint Preview
          const Text('Vista Previa de Distribución', style: TextStyle(color: Colors.white60, fontSize: 11, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          _buildBlueprintPreview(),
          const SizedBox(height: 16),

          // Sliders based on layout selection
          if (_layout == 'split-h') ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Altura Zona A', style: TextStyle(color: Colors.white70, fontSize: 12)),
                Text('${_layoutConfig['zone_a_height'] ?? 50}%', style: const TextStyle(color: primaryColor, fontWeight: FontWeight.bold, fontSize: 12)),
              ],
            ),
            Slider(
              value: (_layoutConfig['zone_a_height'] ?? 50.0).toDouble(),
              min: 10,
              max: 90,
              divisions: 16,
              activeColor: primaryColor,
              onChanged: (val) {
                setState(() {
                  _layoutConfig['zone_a_height'] = val.toInt();
                });
              },
            ),
          ],
          if (_layout == 'split-v') ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Ancho Zona A', style: TextStyle(color: Colors.white70, fontSize: 12)),
                Text('${_layoutConfig['zone_a_width'] ?? 50}%', style: const TextStyle(color: primaryColor, fontWeight: FontWeight.bold, fontSize: 12)),
              ],
            ),
            Slider(
              value: (_layoutConfig['zone_a_width'] ?? 50.0).toDouble(),
              min: 10,
              max: 90,
              divisions: 16,
              activeColor: primaryColor,
              onChanged: (val) {
                setState(() {
                  _layoutConfig['zone_a_width'] = val.toInt();
                });
              },
            ),
          ],
          if (_layout == 'l-shape') ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Altura Zonas A+B', style: TextStyle(color: Colors.white70, fontSize: 12)),
                Text('${_layoutConfig['top_row_height'] ?? 85}%', style: const TextStyle(color: primaryColor, fontWeight: FontWeight.bold, fontSize: 12)),
              ],
            ),
            Slider(
              value: (_layoutConfig['top_row_height'] ?? 85.0).toDouble(),
              min: 40,
              max: 95,
              divisions: 11,
              activeColor: primaryColor,
              onChanged: (val) {
                setState(() {
                  _layoutConfig['top_row_height'] = val.toInt();
                });
              },
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Ancho Zona A (Principal)', style: TextStyle(color: Colors.white70, fontSize: 12)),
                Text('${_layoutConfig['zone_a_width'] ?? 70}%', style: const TextStyle(color: primaryColor, fontWeight: FontWeight.bold, fontSize: 12)),
              ],
            ),
            Slider(
              value: (_layoutConfig['zone_a_width'] ?? 70.0).toDouble(),
              min: 40,
              max: 90,
              divisions: 10,
              activeColor: primaryColor,
              onChanged: (val) {
                setState(() {
                  _layoutConfig['zone_a_width'] = val.toInt();
                });
              },
            ),
          ],
          const SizedBox(height: 24),

          // Playlist assignments per Zone
          const Text('Asignación de Playlists', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
          const SizedBox(height: 12),
          _buildZonePlaylistSelect('Zona A', _zoneA, (val) => setState(() => _zoneA = val ?? '')),
          if (_layout != 'single') ...[
            const SizedBox(height: 12),
            _buildZonePlaylistSelect('Zona B', _zoneB, (val) => setState(() => _zoneB = val ?? '')),
          ],
          if (_layout == 'l-shape') ...[
            const SizedBox(height: 12),
            _buildZonePlaylistSelect('Zona C (Cintillo)', _zoneC, (val) => setState(() => _zoneC = val ?? '')),
          ],
          const SizedBox(height: 32),

          // Action Buttons config
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => _selectedDevice = null),
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Cancelar', style: TextStyle(color: Colors.white70)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: _isSavingConfig ? null : _saveConfig,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryColor,
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isSavingConfig
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Colors.black)))
                      : const Text('Guardar'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 48),

          // Danger Zone
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.red.withOpacity(0.05),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.red.withOpacity(0.2)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('Zona de Peligro', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 6),
                const Text(
                  'Al desvincular el reproductor se borrará su asociación y se restablecerá a su estado de fábrica.',
                  style: TextStyle(color: Colors.white54, fontSize: 11),
                ),
                const SizedBox(height: 14),
                ElevatedButton(
                  onPressed: _isUnpairing ? null : _handleUnpair,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.redAccent.withOpacity(0.1),
                    foregroundColor: Colors.redAccent,
                    elevation: 0,
                    side: BorderSide(color: Colors.redAccent.withOpacity(0.2)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isUnpairing
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Colors.redAccent)))
                      : const Text('Desvincular Pantalla'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildZonePlaylistSelect(String zoneName, String value, Function(String?) onChanged) {
    const darkBg = Color(0xFF05070A);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(zoneName, style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: darkBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white12),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: value.isEmpty ? null : value,
              isExpanded: true,
              dropdownColor: darkBg,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              hint: const Text('-- Sin Playlist Seleccionada --', style: TextStyle(color: Colors.white30, fontSize: 13)),
              items: _playlists.map<DropdownMenuItem<String>>((p) {
                return DropdownMenuItem<String>(
                  value: p['id'].toString(),
                  child: Text(p['name'] ?? ''),
                );
              }).toList(),
              onChanged: onChanged,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSchedulesTab() {
    const primaryColor = Color(0xFF00F0FF);
    const darkBg = Color(0xFF05070A);
    const cardBg = Color(0xFF121824);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Create schedule rule
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: darkBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withOpacity(0.08)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.alarm, color: primaryColor, size: 18),
                    SizedBox(width: 8),
                    Text('Nueva Regla de Programación', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                  ],
                ),
                const SizedBox(height: 16),

                // Zone select
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Zona', style: TextStyle(color: Colors.white70, fontSize: 11)),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10),
                            decoration: BoxDecoration(
                              color: cardBg,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: Colors.white12),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _newScheduleZone,
                                dropdownColor: cardBg,
                                style: const TextStyle(color: Colors.white, fontSize: 12),
                                items: _getAvailableZones().map((z) {
                                  return DropdownMenuItem(value: z, child: Text('Zona $z'));
                                }).toList(),
                                onChanged: (val) {
                                  if (val != null) setState(() => _newScheduleZone = val);
                                },
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Playlist', style: TextStyle(color: Colors.white70, fontSize: 11)),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10),
                            decoration: BoxDecoration(
                              color: cardBg,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: Colors.white12),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _newSchedulePlaylistId.isEmpty ? null : _newSchedulePlaylistId,
                                dropdownColor: cardBg,
                                isExpanded: true,
                                style: const TextStyle(color: Colors.white, fontSize: 12),
                                hint: const Text('Elegir...', style: TextStyle(color: Colors.white30, fontSize: 12)),
                                items: _playlists.map((p) {
                                  return DropdownMenuItem(value: p['id'].toString(), child: Text(p['name'] ?? ''));
                                }).toList(),
                                onChanged: (val) {
                                  if (val != null) setState(() => _newSchedulePlaylistId = val);
                                },
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Hours
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () async {
                          final tod = await showTimePicker(context: context, initialTime: _startTime);
                          if (tod != null) setState(() => _startTime = tod);
                        },
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Hora Inicio', style: TextStyle(color: Colors.white70, fontSize: 11)),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
                              decoration: BoxDecoration(color: cardBg, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.white12)),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('${_startTime.hour.toString().padLeft(2, '0')}:${_startTime.minute.toString().padLeft(2, '0')}', style: const TextStyle(color: Colors.white, fontSize: 12)),
                                  const Icon(Icons.access_time_rounded, size: 14, color: Colors.white54),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: InkWell(
                        onTap: () async {
                          final tod = await showTimePicker(context: context, initialTime: _endTime);
                          if (tod != null) setState(() => _endTime = tod);
                        },
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Hora Fin', style: TextStyle(color: Colors.white70, fontSize: 11)),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
                              decoration: BoxDecoration(color: cardBg, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.white12)),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('${_endTime.hour.toString().padLeft(2, '0')}:${_endTime.minute.toString().padLeft(2, '0')}', style: const TextStyle(color: Colors.white, fontSize: 12)),
                                  const Icon(Icons.access_time_rounded, size: 14, color: Colors.white54),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Days selection
                const Text('Días de la Semana', style: TextStyle(color: Colors.white70, fontSize: 11)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    {'val': 0, 'label': 'D'},
                    {'val': 1, 'label': 'L'},
                    {'val': 2, 'label': 'M'},
                    {'val': 3, 'label': 'X'},
                    {'val': 4, 'label': 'J'},
                    {'val': 5, 'label': 'V'},
                    {'val': 6, 'label': 'S'},
                  ].map((day) {
                    final int v = day['val'] as int;
                    final bool active = _daysOfWeek.contains(v);
                    return Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 2.0),
                        child: InkWell(
                          onTap: () {
                            setState(() {
                              if (active) {
                                _daysOfWeek.remove(v);
                              } else {
                                _daysOfWeek.add(v);
                              }
                            });
                          },
                          child: Container(
                            alignment: Alignment.center,
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            decoration: BoxDecoration(
                              color: active ? primaryColor : cardBg,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: active ? primaryColor : Colors.white12),
                            ),
                            child: Text(
                              day['label'] as String,
                              style: TextStyle(
                                color: active ? Colors.black : Colors.white60,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 20),

                ElevatedButton.icon(
                  onPressed: _isCreatingSchedule || _newSchedulePlaylistId.isEmpty || _daysOfWeek.isEmpty
                      ? null
                      : _handleCreateSchedule,
                  icon: const Icon(Icons.add_rounded, size: 16),
                  label: const Text('Agregar Regla'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryColor.withOpacity(0.1),
                    foregroundColor: primaryColor,
                    disabledBackgroundColor: Colors.white.withOpacity(0.02),
                    disabledForegroundColor: Colors.white24,
                    minimumSize: const Size.fromHeight(42),
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Active rules
          const Text('Programaciones Activas', style: TextStyle(color: Colors.white60, fontSize: 11, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          _isLoadingSchedules
              ? const Center(child: Padding(padding: EdgeInsets.all(16.0), child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(primaryColor))))
              : _schedules.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24.0),
                        child: Column(
                          children: [
                            const Icon(Icons.calendar_today_rounded, size: 36, color: Colors.white24),
                            const SizedBox(height: 10),
                            Text('Sin programaciones horarias', style: GoogleFonts.inter(color: Colors.white30, fontSize: 12)),
                          ],
                        ),
                      ),
                    )
                  : ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _schedules.length,
                      separatorBuilder: (c, i) => const SizedBox(height: 12),
                      itemBuilder: (context, idx) {
                        final rule = _schedules[idx];
                        final zone = rule['zone'] ?? 'A';
                        final playlistName = _getPlaylistName(rule['playlist_id']);
                        final startTime = rule['start_time'].toString().substring(0, 5);
                        final endTime = rule['end_time'].toString().substring(0, 5);
                        final List<dynamic> days = rule['days_of_week'] ?? [];
                        final daysLabels = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
                        final activeDays = days.map((d) => daysLabels[d as int]).join(' ');

                        return Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: darkBg.withOpacity(0.3),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.white.withOpacity(0.05)),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 24,
                                height: 24,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(color: primaryColor.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
                                child: Text(zone, style: const TextStyle(color: primaryColor, fontWeight: FontWeight.bold, fontSize: 11)),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(playlistName, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                                    const SizedBox(height: 4),
                                    Row(
                                      children: [
                                        const Icon(Icons.access_time_rounded, size: 10, color: Colors.white30),
                                        const SizedBox(width: 4),
                                        Text('$startTime – $endTime', style: const TextStyle(color: Colors.white54, fontSize: 10)),
                                        const SizedBox(width: 12),
                                        Text(activeDays, style: GoogleFonts.robotoMono(color: Colors.white30, fontSize: 10, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              IconButton(
                                onPressed: _deletingScheduleId == rule['id'] ? null : () => _handleDeleteSchedule(rule['id']),
                                icon: const Icon(Icons.delete_outline_rounded, color: Colors.redAccent, size: 18),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
        ],
      ),
    );
  }
}
