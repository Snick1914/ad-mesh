import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../data/datasources/ad_mesh_api_service.dart';
import '../../data/datasources/local_db_service.dart';
import '../../data/models/device_config_model.dart';

class PairingScreen extends StatefulWidget {
  final String serialNumber;
  final String initialPairingCode;
  final AdMeshApiService apiService;
  final LocalDbService localDb;
  final VoidCallback onPaired;

  const PairingScreen({
    super.key,
    required this.serialNumber,
    required this.initialPairingCode,
    required this.apiService,
    required this.localDb,
    required this.onPaired,
  });

  @override
  State<PairingScreen> createState() => _PairingScreenState();
}

class _PairingScreenState extends State<PairingScreen> {
  late String _pairingCode;
  Timer? _pollTimer;
  bool _isChecking = false;

  @override
  void initState() {
    super.initState();
    _pairingCode = widget.initialPairingCode;
    _startPolling();
  }

  void _startPolling() {
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) => _checkPairingStatus());
  }

  Future<void> _checkPairingStatus() async {
    if (_isChecking) return;
    setState(() => _isChecking = true);

    try {
      final response = await widget.apiService.requestPairing(widget.serialNumber);
      final isPaired = response['is_paired'] == true;
      final newCode = response['pairing_code']?.toString() ?? '';

      if (mounted) {
        setState(() {
          if (newCode.isNotEmpty) {
            _pairingCode = newCode;
          }
        });
      }

      if (isPaired) {
        _pollTimer?.cancel();
        
        final config = DeviceConfigModel()
          ..serialNumber = widget.serialNumber
          ..isPaired = true
          ..pairingCode = '';
        await widget.localDb.saveDeviceConfig(config);

        if (mounted) {
          widget.onPaired();
        }
      }
    } catch (e) {
      debugPrint('PairingScreen: Error polling pairing status: $e');
    } finally {
      if (mounted) {
        setState(() => _isChecking = false);
      }
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }



  @override
  Widget build(BuildContext context) {
    final qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=00f0ff&bgcolor=15162c&data=${Uri.encodeComponent("https://app.ad-mesh.com/devices?code=$_pairingCode")}';

    return Scaffold(
      backgroundColor: const Color(0xFF0F101E), // Dark aesthetic
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final isLandscape = constraints.maxWidth > constraints.maxHeight;

            if (constraints.maxWidth <= 200) {
              return _buildMiniLayout();
            }

            return Align(
              alignment: Alignment.topLeft,
              child: Container(
                constraints: BoxConstraints(
                  maxWidth: 850,
                  maxHeight: isLandscape ? 400 : double.infinity,
                ),
                margin: EdgeInsets.all(isLandscape ? 12.0 : 24.0),
                decoration: BoxDecoration(
                  color: const Color(0xFF15162C),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: const Color(0xFF242645), width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF00F0FF).withOpacity(0.08),
                      blurRadius: 40,
                      offset: const Offset(0, 8),
                    )
                  ],
                ),
                padding: EdgeInsets.all(isLandscape ? 16 : 32),
                child: isLandscape
                    ? Row(
                        children: [
                          Expanded(
                            flex: 5,
                            child: SingleChildScrollView(
                              child: _buildInstructionsSection(),
                            ),
                          ),
                          const VerticalDivider(color: Color(0xFF242645), width: 24, thickness: 1),
                          Expanded(
                            flex: 4,
                            child: SingleChildScrollView(
                              child: _buildQrSection(qrUrl),
                            ),
                          ),
                        ],
                      )
                    : SingleChildScrollView(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            _buildInstructionsSection(),
                            const Divider(color: Color(0xFF242645), height: 32, thickness: 1),
                            _buildQrSection(qrUrl),
                          ],
                        ),
                      ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildInstructionsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.center,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Vector Logo on white background for high contrast
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          width: 150,
          height: 60,
          child: SvgPicture.asset(
            'assets/logo.svg',
            fit: BoxFit.contain,
          ),
        ),
        const SizedBox(height: 6),
        const Text(
          'DIGITAL SIGNAGE PLAYER',
          style: TextStyle(
            color: Color(0xFF6B7280),
            fontSize: 10,
            fontWeight: FontWeight.bold,
            letterSpacing: 3,
          ),
        ),
        const SizedBox(height: 20),
        const Text(
          'VINCULAR PANTALLA',
          style: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          '1. Inicia sesión en app.ad-mesh.com\n'
          '2. Ve a "Pantallas" y presiona "Nueva Pantalla"\n'
          '3. Ingresa el código de activación.',
          style: TextStyle(
            color: Color(0xFF9CA3AF),
            fontSize: 13,
            height: 1.5,
          ),
        ),
        const SizedBox(height: 20),
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFF0F101E),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF00F0FF).withOpacity(0.3)),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Text(
            _pairingCode.isEmpty ? '------' : _pairingCode,
            style: const TextStyle(
              color: Color(0xFF00F0FF),
              fontSize: 28,
              fontWeight: FontWeight.bold,
              fontFamily: 'monospace',
              letterSpacing: 3,
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'Serie: ${widget.serialNumber}',
          style: const TextStyle(
            color: Color(0xFF4B5563),
            fontSize: 11,
            fontFamily: 'monospace',
          ),
        ),
      ],
    );
  }

  Widget _buildQrSection(String qrUrl) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFF15162C),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF242645)),
          ),
          padding: const EdgeInsets.all(8),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.network(
              qrUrl,
              width: 160,
              height: 160,
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  width: 160,
                  height: 160,
                  color: const Color(0xFF0F101E),
                  child: const Center(
                    child: Icon(Icons.qr_code_2, color: Color(0xFF242645), size: 48),
                  ),
                );
              },
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              width: 10,
              height: 10,
              child: CircularProgressIndicator(
                strokeWidth: 1.5,
                valueColor: AlwaysStoppedAnimation<Color>(
                  const Color(0xFF00F0FF).withOpacity(_isChecking ? 0.8 : 0.2),
                ),
              ),
            ),
            const SizedBox(width: 8),
            const Text(
              'Esperando confirmación...',
              style: TextStyle(color: Color(0xFF4B5563), fontSize: 10),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildMiniLayout() {
    return Container(
      color: const Color(0xFF0F101E),
      padding: const EdgeInsets.all(4.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const Text(
            'CODIGO DE VINCULACION',
            style: TextStyle(
              color: Colors.white,
              fontSize: 8,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 2),
          Text(
            _pairingCode.isEmpty ? '------' : _pairingCode,
            style: const TextStyle(
              color: Color(0xFF00F0FF),
              fontSize: 16,
              fontWeight: FontWeight.bold,
              fontFamily: 'monospace',
              letterSpacing: 1,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 2),
          Text(
            'SERIE: ${widget.serialNumber}',
            style: const TextStyle(
              color: Color(0xFF6B7280),
              fontSize: 6,
              fontFamily: 'monospace',
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

