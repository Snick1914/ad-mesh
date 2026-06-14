import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:android_id/android_id.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:media_kit/media_kit.dart';
import 'package:path_provider/path_provider.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import 'data/datasources/ad_mesh_api_service.dart';
import 'data/datasources/local_db_service.dart';
import 'data/models/device_config_model.dart';
import 'data/models/playlist_item_model.dart';
import 'presentation/screens/pairing_screen.dart';
import 'presentation/screens/player_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  String? bootError;

  // Keep screen awake continuously for 24/7 digital signage operation
  try {
    WakelockPlus.enable();
  } catch (e) {
    debugPrint('Wakelock error: $e');
  }

  // 1. Fullscreen sticky and orientation setups
  try {
    await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    await SystemChrome.setPreferredOrientations([
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
    ]);
  } catch (e) {
    debugPrint('SystemChrome error: $e');
  }

  try {
    MediaKit.ensureInitialized();
  } catch (e) {
    debugPrint('MediaKit error: $e');
    bootError = 'MediaKit failed to initialize: $e';
  }

  final localDb = LocalDbService();
  if (bootError == null) {
    try {
      await localDb.init();
    } catch (e) {
      debugPrint('Isar database error: $e');
      bootError = 'Database failed to initialize: $e';
    }
  }

  // Load or generate device config
  DeviceConfigModel? config;
  if (bootError == null) {
    try {
      config = await localDb.getDeviceConfig();
      if (config == null) {
        String serial;
        if (Platform.isAndroid) {
          try {
            final androidId = await const AndroidId().getId();
            if (androidId != null && androidId.isNotEmpty) {
              serial = 'ADM-${androidId.toUpperCase()}';
            } else {
              throw Exception('Android ID was null or empty');
            }
          } catch (e) {
            debugPrint('Failed to get Android ID: $e');
            final randomSuffix = List.generate(8, (_) => Random().nextInt(36).toRadixString(36).toUpperCase()).join();
            serial = 'ADM-$randomSuffix';
          }
        } else {
          // Fallback for non-Android platforms (e.g. Linux desktop testing)
          final randomSuffix = List.generate(8, (_) => Random().nextInt(36).toRadixString(36).toUpperCase()).join();
          serial = 'ADM-$randomSuffix';
        }

        config = DeviceConfigModel()
          ..serialNumber = serial
          ..isPaired = false
          ..pairingCode = '';
        await localDb.saveDeviceConfig(config);
      }
    } catch (e) {
      debugPrint('DeviceConfig error: $e');
      bootError = 'Failed to load device configuration: $e';
    }
  }

  // Determine active backend URL (custom URL from database, or default server api.ad-mesh.com)
  const String defaultBackendUrl = 'https://api.ad-mesh.com/api/v1';

  final String activeBackendUrl = (config != null && config.customBackendUrl != null && config.customBackendUrl!.isNotEmpty)
      ? config.customBackendUrl!
      : defaultBackendUrl;

  final apiService = AdMeshApiService(baseUrl: activeBackendUrl);

  runApp(
    MaterialApp(
      title: 'ad-mesh Signage Player',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark(),
      home: bootError != null
          ? Scaffold(
              backgroundColor: const Color(0xFF0F101E),
              body: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, color: Colors.redAccent, size: 64),
                      const SizedBox(height: 16),
                      const Text(
                        'Error de Inicialización',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        bootError,
                        style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 14),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
            )
          : AppCoordinator(
              config: config!,
              apiService: apiService,
              localDb: localDb,
            ),
    ),
  );
}

class AppCoordinator extends StatefulWidget {
  final DeviceConfigModel config;
  final AdMeshApiService apiService;
  final LocalDbService localDb;

  const AppCoordinator({
    super.key,
    required this.config,
    required this.apiService,
    required this.localDb,
  });

  @override
  State<AppCoordinator> createState() => _AppCoordinatorState();
}

class _AppCoordinatorState extends State<AppCoordinator> {
  static const _deviceChannel = MethodChannel('com.admesh.player/device');

  late DeviceConfigModel _currentConfig;
  bool _isLoading = true;
  String _pairingCode = '';
  List<PlaylistItemModel> _playlist = [];
  bool _isNovaStar = false;
  
  WebSocketChannel? _wsChannel;
  bool _isConnectingWs = false;
  Timer? _wsReconnectTimer;
  Timer? _wsPingTimer;

  @override
  void initState() {
    super.initState();
    _currentConfig = widget.config;
    _detectDeviceType();
    _runBootSequence();
  }

  Future<void> _detectDeviceType() async {
    if (!kIsWeb && Platform.isAndroid) {
      try {
        final bool? isNova = await _deviceChannel.invokeMethod<bool>('isNovaStarDevice');
        debugPrint('AppCoordinator: isNovaStarDevice = $isNova');
        if (mounted) {
          setState(() {
            _isNovaStar = isNova ?? false;
          });
        }
      } catch (e) {
        debugPrint('Error checking NovaStar device: $e');
      }
    }
  }

  @override
  void dispose() {
    _wsChannel?.sink.close();
    _wsReconnectTimer?.cancel();
    _wsPingTimer?.cancel();
    super.dispose();
  }

  Future<void> _runBootSequence() async {
    setState(() => _isLoading = true);

    try {
      final isOnline = await widget.apiService.checkConnection().timeout(
        const Duration(seconds: 4),
        onTimeout: () {
          debugPrint('AppCoordinator: checkConnection timed out, assuming offline');
          return false;
        },
      );

      if (!_currentConfig.isPaired) {
        if (isOnline) {
          // Request a pairing code from the backend
          final response = await widget.apiService.requestPairing(_currentConfig.serialNumber);
          final isPaired = response['is_paired'] == true;
          final code = response['pairing_code']?.toString() ?? '';

          if (isPaired) {
            _currentConfig.isPaired = true;
            _currentConfig.pairingCode = '';
            await widget.localDb.saveDeviceConfig(_currentConfig);
            _connectWebSocket();
            await _syncPlaylistAndPlay(isOnline);
          } else {
            setState(() {
              _pairingCode = code;
              _isLoading = false;
            });
          }
        } else {
          // Offline and not paired
          setState(() {
            _pairingCode = '';
            _isLoading = false;
          });
        }
      } else {
        // Already paired
        _connectWebSocket();
        await _syncPlaylistAndPlay(isOnline);
      }
    } catch (e) {
      debugPrint('AppCoordinator: Boot error: $e');
      if (_currentConfig.isPaired) {
        _connectWebSocket();
      }
      await _loadCachedPlaylist();
    }
  }

  Future<void> _syncPlaylistAndPlay(bool isOnline) async {
    if (isOnline) {
      try {
        debugPrint('AppCoordinator: Sincronizando listas de reproducción...');
        final playlistResponse = await widget.apiService.getDevicePlaylist(_currentConfig.serialNumber);
        
        final localFolder = await getApplicationSupportDirectory();
        final mediaDir = Directory('${localFolder.path}/media');
        if (!await mediaDir.exists()) {
          await mediaDir.create(recursive: true);
        }

        final layout = playlistResponse['layout']?.toString() ?? 'single';
        final layoutConfigMap = playlistResponse['layout_config'] as Map<String, dynamic>? ?? {};
        final layoutConfigJson = jsonEncode(layoutConfigMap);
        final resolution = playlistResponse['resolution']?.toString() ?? '1920x1080';

        _currentConfig.layout = layout;
        _currentConfig.layoutConfigJson = layoutConfigJson;
        _currentConfig.resolution = resolution;
        await widget.localDb.saveDeviceConfig(_currentConfig);

        final List<PlaylistItemModel> newPlaylist = [];
        final backendBase = widget.apiService.baseUrl.replaceAll('/api/v1', '');

        void parseZone(dynamic zoneData, String zoneName) {
          if (zoneData != null && zoneData['items'] != null) {
            final itemsList = List.from(zoneData['items']);
            for (var i = 0; i < itemsList.length; i++) {
              final item = itemsList[i];
              final filePath = item['file_path'].toString().replaceAll(RegExp(r'^/+'), '');
              final fileName = filePath.split('/').last;
              final base = backendBase.endsWith('/') ? backendBase.substring(0, backendBase.length - 1) : backendBase;
              final fullUrl = '$base/$filePath';
              final localPath = '${mediaDir.path}/$fileName';

              newPlaylist.add(
                PlaylistItemModel()
                  ..id = '${zoneName}_${item['id']}'
                  ..url = fullUrl
                  ..localPath = localPath
                  ..checksum = item['checksum']?.toString() ?? 'nochesum'
                  ..playOrder = i
                  ..duration = int.tryParse(item['duration_seconds']?.toString() ?? '') ?? 10
                  ..zone = zoneName,
              );
            }
          }
        }

        parseZone(playlistResponse['zone_a'], 'A');
        parseZone(playlistResponse['zone_b'], 'B');
        parseZone(playlistResponse['zone_c'], 'C');

        // Sync and download assets
        for (final item in newPlaylist) {
          final localFile = File(item.localPath);
          if (!await localFile.exists()) {
            debugPrint('AppCoordinator: Descargando elemento multimedia: ${item.url}');
            await widget.apiService.downloadVideo(
              videoUrl: item.url,
              saveDirectory: mediaDir.path,
              filename: item.localPath.split('/').last,
              expectedChecksum: item.checksum,
            );
          }
        }

        // Save new state locally
        await widget.localDb.cachePlaylist(newPlaylist);
        setState(() {
          _playlist = newPlaylist;
          _isLoading = false;
        });
        return;
      } catch (e) {
        debugPrint('AppCoordinator: Error sincronizando: $e. Usando caché local.');
      }
    }
    await _loadCachedPlaylist();
  }

  Future<void> _loadCachedPlaylist() async {
    final cached = await widget.localDb.getCachedPlaylist();
    setState(() {
      _playlist = cached;
      _isLoading = false;
    });
  }

  void _connectWebSocket() {
    if (_isConnectingWs || !_currentConfig.isPaired) return;
    _isConnectingWs = true;
    _wsReconnectTimer?.cancel();

    final httpUrl = widget.apiService.baseUrl;
    final wsScheme = httpUrl.startsWith('https://') ? 'wss://' : 'ws://';
    final wsBase = httpUrl.replaceFirst(RegExp(r'https?://'), wsScheme);
    final wsUrl = '${wsBase.endsWith('/') ? wsBase : '$wsBase/'}devices/ws/${_currentConfig.serialNumber}';

    debugPrint('AppCoordinator: Conectando a WebSocket: $wsUrl');
    try {
      _wsChannel = WebSocketChannel.connect(Uri.parse(wsUrl));
      
      _wsChannel!.stream.listen(
        (message) {
          debugPrint('AppCoordinator: Mensaje WebSocket recibido: $message');
          try {
            final data = jsonDecode(message.toString());
            final event = data['event']?.toString();

            if (event == 'unpair') {
              debugPrint('AppCoordinator: Señal de desvinculación recibida vía WebSocket!');
              _handleUnpairEvent();
            } else if (event == 'sync_playlist') {
              debugPrint('AppCoordinator: Señal de sincronización de playlist recibida vía WebSocket!');
              _syncPlaylistAndPlay(true);
            }
          } catch (e) {
            debugPrint('AppCoordinator: Error decodificando mensaje WebSocket: $e');
          }
        },
        onError: (error) {
          debugPrint('AppCoordinator: Error en WebSocket: $error');
          _wsChannel?.sink.close();
          _scheduleWsReconnect();
        },
        onDone: () {
          debugPrint('AppCoordinator: Conexión WebSocket cerrada');
          _scheduleWsReconnect();
        },
        cancelOnError: true,
      );

      // Programar pings periódicos para mantener la conexión activa ante firewalls/routers
      _wsPingTimer?.cancel();
      _wsPingTimer = Timer.periodic(const Duration(seconds: 30), (_) {
        try {
          _wsChannel?.sink.add('ping');
        } catch (e) {
          debugPrint('AppCoordinator: Fallo al enviar ping de WebSocket: $e');
        }
      });

      _isConnectingWs = false;
    } catch (e) {
      debugPrint('AppCoordinator: Error conectando a WebSocket: $e');
      _isConnectingWs = false;
      _scheduleWsReconnect();
    }
  }

  void _scheduleWsReconnect() {
    _wsReconnectTimer?.cancel();
    _wsPingTimer?.cancel();
    if (!_currentConfig.isPaired) return;
    
    debugPrint('AppCoordinator: Programando reconexión de WebSocket en 5 segundos...');
    _wsReconnectTimer = Timer(const Duration(seconds: 5), () {
      _connectWebSocket();
    });
  }

  Future<void> _handleUnpairEvent() async {
    _wsChannel?.sink.close();
    _wsReconnectTimer?.cancel();
    _wsPingTimer?.cancel();

    _currentConfig.isPaired = false;
    _currentConfig.pairingCode = '';
    await widget.localDb.saveDeviceConfig(_currentConfig);

    if (mounted) {
      setState(() {
        _isLoading = false;
      });
      _runBootSequence();
    }
  }

  void _onDevicePairedSuccessfully() {
    setState(() {
      _currentConfig.isPaired = true;
    });
    _runBootSequence();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Color(0xFF0F101E),
        body: Center(
          child: CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF00F0FF)),
          ),
        ),
      );
    }

    Widget mainContent;
    if (!_currentConfig.isPaired) {
      mainContent = PairingScreen(
        serialNumber: _currentConfig.serialNumber,
        initialPairingCode: _pairingCode,
        apiService: widget.apiService,
        localDb: widget.localDb,
        onPaired: _onDevicePairedSuccessfully,
      );
    } else {
      mainContent = PlayerScreen(
        playlistItems: _playlist,
        config: _currentConfig,
        isNovaStar: _isNovaStar,
      );
    }

    if (_isNovaStar) {
      double targetWidth = 160.0;
      double targetHeight = 64.0;
      
      if (_currentConfig.isPaired) {
        try {
          final parts = _currentConfig.resolution.split('x');
          if (parts.length == 2) {
            final w = double.tryParse(parts[0]);
            final h = double.tryParse(parts[1]);
            if (w != null && h != null) {
              targetWidth = w;
              targetHeight = h;
            }
          }
        } catch (e) {
          debugPrint('Error parsing config resolution: $e');
        }
      }

      return Scaffold(
        backgroundColor: Colors.black,
        body: Align(
          alignment: Alignment.topLeft,
          child: SizedBox(
            width: targetWidth,
            height: targetHeight,
            child: mainContent,
          ),
        ),
      );
    }

    return mainContent;
  }
}
