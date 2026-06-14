import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import '../../data/models/device_config_model.dart';
import '../../data/models/playlist_item_model.dart';

class PlayerScreen extends StatefulWidget {
  final List<PlaylistItemModel> playlistItems;
  final DeviceConfigModel config;
  final bool isNovaStar;

  const PlayerScreen({
    super.key,
    required this.playlistItems,
    required this.config,
    this.isNovaStar = false,
  });

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> with SingleTickerProviderStateMixin {
  // Animation controller for the pulsating brand logo
  late final AnimationController _pulseController;
  late final Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    WakelockPlus.enable();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
    
    _pulseAnimation = Tween<double>(begin: 0.4, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.playlistItems.isEmpty) {
      return Scaffold(
        backgroundColor: const Color(0xFF0F101E),
        body: LayoutBuilder(
          builder: (context, constraints) {
            if (constraints.maxWidth <= 200) {
              return _buildMiniStandbyScreen();
            }
            return _buildStandbyScreen();
          },
        ),
      );
    }

    final layout = widget.config.layout;
    Map<String, dynamic> layoutConfig = {};
    try {
      layoutConfig = jsonDecode(widget.config.layoutConfigJson) as Map<String, dynamic>;
    } catch (_) {}

    final itemsA = widget.playlistItems.where((e) => e.zone == 'A').toList();
    final itemsB = widget.playlistItems.where((e) => e.zone == 'B').toList();
    final itemsC = widget.playlistItems.where((e) => e.zone == 'C').toList();

    Widget body;
    switch (layout) {
      case 'split-h':
        final val = int.tryParse(layoutConfig['zone_a_height']?.toString() ?? '') ?? 50;
        body = Column(
          children: [
            Flexible(
              flex: val,
              child: ZonePlayer(items: itemsA),
            ),
            Flexible(
              flex: 100 - val,
              child: ZonePlayer(items: itemsB),
            ),
          ],
        );
        break;

      case 'split-v':
        final val = int.tryParse(layoutConfig['zone_a_width']?.toString() ?? '') ?? 50;
        body = Row(
          children: [
            Flexible(
              flex: val,
              child: ZonePlayer(items: itemsA),
            ),
            Flexible(
              flex: 100 - val,
              child: ZonePlayer(items: itemsB),
            ),
          ],
        );
        break;

      case 'l-shape':
        final topH = int.tryParse(layoutConfig['top_row_height']?.toString() ?? '') ?? 85;
        final botH = 100 - topH;
        final aW = int.tryParse(layoutConfig['zone_a_width']?.toString() ?? '') ?? 70;
        final bW = 100 - aW;
        body = Column(
          children: [
            Flexible(
              flex: topH,
              child: Row(
                children: [
                  Flexible(
                    flex: aW,
                    child: ZonePlayer(items: itemsA),
                  ),
                  Flexible(
                    flex: bW,
                    child: ZonePlayer(items: itemsB),
                  ),
                ],
              ),
            ),
            Flexible(
              flex: botH,
              child: ZonePlayer(items: itemsC),
            ),
          ],
        );
        break;

      case 'single':
      default:
        body = ZonePlayer(items: itemsA);
        break;
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: SizedBox.expand(child: body),
    );
  }

  Widget _buildMiniStandbyScreen() {
    return Container(
      color: const Color(0xFF0F101E),
      padding: const EdgeInsets.all(4.0),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const Text(
              'ACTIVADA',
              style: TextStyle(
                color: Color(0xFF00F0FF),
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 1,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 2),
            const Text(
              'Esperando lista...',
              style: TextStyle(
                color: Colors.white,
                fontSize: 8,
              ),
              textAlign: TextAlign.center,
            ),
            if (widget.isNovaStar) ...[
              const SizedBox(height: 2),
              const Text(
                'LED NOVASTAR',
                style: TextStyle(
                  color: Color(0xFF6B7280),
                  fontSize: 6,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ],
        ),
      ),
    );
  }

  // Branded standby view matching the Docker player HTML/CSS design
  Widget _buildStandbyScreen() {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF0F101E),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Radial glow background
          Container(
            decoration: BoxDecoration(
              gradient: RadialGradient(
                colors: [
                  const Color(0xFF00F0FF).withOpacity(0.06),
                  Colors.transparent,
                ],
                radius: 0.8,
              ),
            ),
          ),
          
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Align(
              alignment: Alignment.topLeft,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.start,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Pulsating Brand Logo
                    FadeTransition(
                      opacity: _pulseAnimation,
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                        width: 200,
                        height: 80,
                        child: SvgPicture.asset(
                          'assets/ad-mesh_logo_vector.svg',
                          fit: BoxFit.contain,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    
                    // Success Pairing Message
                    const Text(
                      'Pantalla Activada Exitosamente',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    if (widget.isNovaStar) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF00F0FF).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF00F0FF).withOpacity(0.5)),
                        ),
                        child: const Text(
                          'MODO LED NOVASTAR ACTIVO',
                          style: TextStyle(
                            color: Color(0xFF00F0FF),
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1,
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 8),
                    
                    // Instructions Description
                    const MaxWidthBox(
                      maxWidth: 500,
                      child: Text(
                        'Esperando a que guardes o asignes una lista de reproducción desde el panel de control...',
                        style: TextStyle(
                          color: Color(0xFF9CA3AF),
                          fontSize: 14,
                          height: 1.5,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    const SizedBox(height: 24),
                    
                    // Modern Circular Neon Spinner
                    const SizedBox(
                      width: 36,
                      height: 36,
                      child: CircularProgressIndicator(
                        strokeWidth: 3.5,
                        valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF00F0FF)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class ZonePlayer extends StatefulWidget {
  final List<PlaylistItemModel> items;

  const ZonePlayer({
    super.key,
    required this.items,
  });

  @override
  State<ZonePlayer> createState() => _ZonePlayerState();
}

class _ZonePlayerState extends State<ZonePlayer> {
  late final Player _player;
  late final VideoController _controller;
  
  Timer? _imageTimer;
  int _currentIndex = 0;
  bool _showVideo = false;
  bool _isDisposed = false;

  @override
  void initState() {
    super.initState();
    _initializePlayer();
  }

  void _initializePlayer() {
    _player = Player(
      configuration: const PlayerConfiguration(
        logLevel: MPVLogLevel.error,
        bufferSize: 32 * 1024 * 1024,
      ),
    );

    _controller = VideoController(_player);

    _player.stream.completed.listen((completed) {
      if (completed && !_isDisposed && _showVideo) {
        debugPrint('ZonePlayer: Video completed, advancing...');
        _advanceNext();
      }
    });

    _player.stream.error.listen((dynamic error) {
      debugPrint('MediaKit Error (ZonePlayer): $error');
      if (!_isDisposed && _showVideo) {
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) _advanceNext();
        });
      }
    });

    if (widget.items.isNotEmpty) {
      _playCurrentIndex();
    }
  }

  void _playCurrentIndex() {
    if (_isDisposed || widget.items.isEmpty) return;

    _imageTimer?.cancel();

    if (_currentIndex >= widget.items.length) {
      _currentIndex = 0;
    }

    final item = widget.items[_currentIndex];
    final file = File(item.localPath);

    if (!file.existsSync()) {
      debugPrint('ZonePlayer: File not found at ${item.localPath}, skipping...');
      Future.microtask(() => _advanceNext());
      return;
    }

    final isImg = _isImage(item.localPath);
    debugPrint('ZonePlayer: Playing item $_currentIndex: ${item.localPath} (isImage: $isImg)');

    if (isImg) {
      if (mounted) {
        setState(() {
          _showVideo = false;
        });
      }
      try {
        _player.pause();
      } catch (_) {}

      _imageTimer = Timer(Duration(seconds: item.duration), () {
        _advanceNext();
      });
    } else {
      if (mounted) {
        setState(() {
          _showVideo = true;
        });
      }

      _player.open(Media(item.localPath), play: true).catchError((error) {
        debugPrint('ZonePlayer: Open video error: $error');
        _advanceNext();
      });
    }
  }

  void _advanceNext() {
    if (_isDisposed || widget.items.isEmpty) return;

    _currentIndex++;
    if (_currentIndex >= widget.items.length) {
      _currentIndex = 0;
    }
    _playCurrentIndex();
  }

  bool _isImage(String path) {
    final ext = path.toLowerCase().split('.').last;
    return const ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].contains(ext);
  }

  @override
  void didUpdateWidget(covariant ZonePlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.items.length != oldWidget.items.length ||
        widget.items.firstOrNull?.id != oldWidget.items.firstOrNull?.id) {
      _currentIndex = 0;
      _playCurrentIndex();
    }
  }

  @override
  void dispose() {
    _isDisposed = true;
    _imageTimer?.cancel();
    _player.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.items.isEmpty) {
      return Container(
        color: Colors.black,
        child: const Center(
          child: Icon(Icons.video_library_outlined, color: Color(0xFF242645), size: 32),
        ),
      );
    }

    return SizedBox.expand(
      child: _showVideo
          ? Video(
              controller: _controller,
              fit: BoxFit.fill,
              controls: null,
            )
          : Image.file(
              File(widget.items[_currentIndex].localPath),
              fit: BoxFit.fill,
              errorBuilder: (context, error, stackTrace) {
                return const Center(
                  child: Icon(Icons.broken_image, color: Colors.redAccent, size: 32),
                );
              },
            ),
    );
  }
}

// Simple Helper to enforce maximum layout width on subtitle text
class MaxWidthBox extends StatelessWidget {
  final double maxWidth;
  final Widget child;

  const MaxWidthBox({
    super.key,
    required this.maxWidth,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(maxWidth: maxWidth),
      child: child,
    );
  }
}
