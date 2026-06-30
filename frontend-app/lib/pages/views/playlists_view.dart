import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../services/api_service.dart';

class PlaylistsView extends StatefulWidget {
  const PlaylistsView({super.key});

  @override
  State<PlaylistsView> createState() => _PlaylistsViewState();
}

class _PlaylistsViewState extends State<PlaylistsView> {
  String _viewMode = 'list'; // 'list' or 'builder'
  List<dynamic> _playlistsList = [];
  List<dynamic> _mediaItems = [];
  bool _isLoading = true;
  bool _isSaving = false;

  // Builder state
  int? _activePlaylistId;
  String _playlistName = 'Nueva Playlist Comercial';
  List<Map<String, dynamic>> _playlistItems = [];

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final plays = await ApiService.getPlaylists();
    final media = await ApiService.getMedia();
    setState(() {
      _playlistsList = plays;
      _mediaItems = media;
      _isLoading = false;
    });
  }

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _handleCreateNewClick() {
    setState(() {
      _activePlaylistId = null;
      _playlistName = 'Nueva Playlist Comercial';
      _playlistItems = [];
      _viewMode = 'builder';
    });
  }

  void _handleEditPlaylist(dynamic p) {
    setState(() {
      _activePlaylistId = p['id'];
      _playlistName = p['name'] ?? 'Playlist';
      final List<dynamic> items = p['items'] ?? [];
      _playlistItems = items.map<Map<String, dynamic>>((item) {
        final media = item['media'] ?? {};
        return {
          'id': item['id'] ?? DateTime.now().millisecondsSinceEpoch,
          'media_id': media['id'],
          'name': media['name'] ?? '',
          'file_type': media['file_type'] ?? '',
          'duration': item['duration_seconds'] ?? 10,
          'transition': 'Fade',
        };
      }).toList();
      _viewMode = 'builder';
    });
  }

  Future<void> _handleDeletePlaylist(int id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF121824),
        title: const Text('Eliminar Playlist', style: TextStyle(color: Colors.white)),
        content: const Text('¿Estás seguro de que deseas eliminar esta lista de reproducción de forma permanente?', style: TextStyle(color: Colors.white70)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar', style: TextStyle(color: Colors.white54))),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Eliminar', style: TextStyle(color: Colors.redAccent))),
        ],
      ),
    );

    if (confirmed == true) {
      setState(() => _isSaving = true);
      final success = await ApiService.deletePlaylist(id);
      setState(() => _isSaving = false);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Lista de reproducción eliminada con éxito'), backgroundColor: Color(0xFF10B981)),
        );
        if (_activePlaylistId == id) {
          _activePlaylistId = null;
          _playlistItems = [];
        }
        await _loadData();
      }
    }
  }

  void _handleAddToPlaylist(dynamic media) {
    final isVideo = media['file_type'].toString().startsWith('video');
    setState(() {
      _playlistItems.add({
        'id': DateTime.now().millisecondsSinceEpoch + _playlistItems.length,
        'media_id': media['id'],
        'name': media['name'] ?? '',
        'file_type': media['file_type'] ?? '',
        'duration': isVideo ? 15 : 10,
        'transition': 'Fade',
      });
    });
  }

  void _handleRemoveFromPlaylist(int index) {
    setState(() {
      _playlistItems.removeAt(index);
    });
  }

  Future<void> _handleSavePlaylist() async {
    if (_playlistItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Añade al menos un elemento a la línea de tiempo'), backgroundColor: Colors.redAccent),
      );
      return;
    }
    setState(() => _isSaving = true);
    int? targetPlaylistId = _activePlaylistId;

    if (targetPlaylistId == null) {
      final newPl = await ApiService.createPlaylist(_playlistName);
      if (newPl != null) {
        targetPlaylistId = newPl['id'];
        _activePlaylistId = targetPlaylistId;
      }
    }

    if (targetPlaylistId != null) {
      final itemsPayload = _playlistItems.map((item) {
        return {
          'media_id': item['media_id'],
          'duration_seconds': item['duration'],
        };
      }).toList();

      final success = await ApiService.updatePlaylistItems(targetPlaylistId, _playlistName, itemsPayload);
      setState(() => _isSaving = false);

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('¡Lista de reproducción guardada y publicada!'), backgroundColor: Color(0xFF10B981)),
        );
        setState(() => _viewMode = 'list');
        await _loadData();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Error al guardar la lista de reproducción'), backgroundColor: Colors.redAccent),
        );
      }
    } else {
      setState(() => _isSaving = false);
    }
  }

  String _formatTime(int seconds) {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    const primaryColor = Color(0xFF00F0FF);
    const cardBg = Color(0xFF121824);

    if (_viewMode == 'list') {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Listas de Reproducción',
                    style: GoogleFonts.inter(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Crea, edita y administra tus secuencias de contenidos comerciales.',
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                  ),
                ],
              ),
              ElevatedButton.icon(
                onPressed: _handleCreateNewClick,
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Nueva Playlist'),
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

          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation(primaryColor)))
                : _playlistsList.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.queue_music_outlined, size: 64, color: Colors.white24),
                            const SizedBox(height: 16),
                            Text('No tienes Playlists creadas', style: GoogleFonts.inter(color: Colors.white70)),
                          ],
                        ),
                      )
                    : GridView.builder(
                        gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                          maxCrossAxisExtent: 320,
                          mainAxisSpacing: 20,
                          crossAxisSpacing: 20,
                          childAspectRatio: 1.4,
                        ),
                        itemCount: _playlistsList.length,
                        itemBuilder: (context, index) {
                          final p = _playlistsList[index];
                          final List<dynamic> items = p['items'] ?? [];
                          final int playlistDuration = items.fold(0, (sum, item) => sum + (item['duration_seconds'] ?? 0) as int);
                          final isActive = p['is_active'] ?? false;

                          return Container(
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
                                    Expanded(
                                      child: Text(
                                        p['name'] ?? 'Playlist',
                                        style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 15),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: isActive ? primaryColor.withOpacity(0.1) : Colors.white10,
                                        borderRadius: BorderRadius.circular(20),
                                        border: Border.all(color: isActive ? primaryColor.withOpacity(0.2) : Colors.transparent),
                                      ),
                                      child: Text(
                                        isActive ? 'Activa' : 'Borrador',
                                        style: TextStyle(
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                          color: isActive ? primaryColor : Colors.white54,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Duración: ${_formatTime(playlistDuration)}', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                                    const SizedBox(height: 4),
                                    Text('Elementos: ${items.length}', style: const TextStyle(color: Colors.white54, fontSize: 11)),
                                  ],
                                ),
                                Row(
                                  children: [
                                    Expanded(
                                      child: ElevatedButton(
                                        onPressed: () => _handleEditPlaylist(p),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: Colors.white.withOpacity(0.05),
                                          foregroundColor: Colors.white,
                                          elevation: 0,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                        ),
                                        child: const Text('Editar', style: TextStyle(fontSize: 12)),
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    IconButton(
                                      onPressed: () => _handleDeletePlaylist(p['id']),
                                      icon: const Icon(Icons.delete_outline_rounded, color: Colors.redAccent, size: 20),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
          ),
        ],
      );
    }

    // Builder Mode
    final int totalDuration = _playlistItems.fold(0, (sum, item) => sum + (item['duration'] as int));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Editor Header
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                IconButton(
                  onPressed: () => setState(() => _viewMode = 'list'),
                  icon: const Icon(Icons.arrow_back, color: Colors.white),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 300,
                      child: TextField(
                        controller: TextEditingController(text: _playlistName)..selection = TextSelection.collapsed(offset: _playlistName.length),
                        style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                        decoration: const InputDecoration(border: InputBorder.none, hintText: 'Nombre de la Playlist'),
                        onChanged: (val) => _playlistName = val,
                      ),
                    ),
                    Text('Duración total: ${_formatTime(totalDuration)}', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                  ],
                ),
              ],
            ),
            ElevatedButton.icon(
              onPressed: _isSaving ? null : _handleSavePlaylist,
              icon: _isSaving
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Colors.black)))
                  : const Icon(Icons.save_outlined, size: 18),
              label: const Text('Guardar y Publicar'),
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

        Expanded(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Left Column: Media Library
              Expanded(
                flex: 1,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: cardBg,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white.withOpacity(0.05)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Biblioteca', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                      const Text('Selecciona medios para añadir', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                      const SizedBox(height: 16),
                      Expanded(
                        child: _mediaItems.isEmpty
                            ? const Center(child: Text('Librería vacía', style: TextStyle(color: Colors.white30, fontSize: 12)))
                            : ListView.separated(
                                itemCount: _mediaItems.length,
                                separatorBuilder: (c, i) => const SizedBox(height: 10),
                                itemBuilder: (context, idx) {
                                  final m = _mediaItems[idx];
                                  final isVideo = m['file_type'].toString().startsWith('video');
                                  return ListTile(
                                    contentPadding: const EdgeInsets.all(8),
                                    tileColor: Colors.black12,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    leading: Icon(isVideo ? Icons.movie_outlined : Icons.image_outlined, color: primaryColor),
                                    title: Text(m['name'] ?? '', style: const TextStyle(color: Colors.white, fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
                                    trailing: const Icon(Icons.add_circle_outline, color: primaryColor, size: 20),
                                    onTap: () => _handleAddToPlaylist(m),
                                  );
                                },
                              ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 20),

              // Right Column: Timeline Sequencer
              Expanded(
                flex: 2,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: cardBg,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white.withOpacity(0.05)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Línea de Tiempo (${_playlistItems.length} elementos)', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                      const SizedBox(height: 16),
                      Expanded(
                        child: _playlistItems.isEmpty
                            ? const Center(child: Text('Línea de tiempo vacía. Agrega fotos o videos.', style: TextStyle(color: Colors.white30, fontSize: 12)))
                            : ReorderableListView.builder(
                                itemCount: _playlistItems.length,
                                onReorder: (oldIdx, newIdx) {
                                  setState(() {
                                    if (oldIdx < newIdx) {
                                      newIdx -= 1;
                                    }
                                    final item = _playlistItems.removeAt(oldIdx);
                                    _playlistItems.insert(newIdx, item);
                                  });
                                },
                                itemBuilder: (context, idx) {
                                  final item = _playlistItems[idx];
                                  final isVideo = item['file_type'].toString().startsWith('video');
                                  return Container(
                                    key: ValueKey(item['id']),
                                    margin: const EdgeInsets.only(bottom: 10),
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: Colors.black26,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: Colors.white.withOpacity(0.05)),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.drag_indicator_rounded, color: Colors.white30),
                                        const SizedBox(width: 10),
                                        Container(
                                          width: 24,
                                          height: 24,
                                          alignment: Alignment.center,
                                          decoration: BoxDecoration(color: Colors.white10, borderRadius: BorderRadius.circular(6)),
                                          child: Text('${idx + 1}', style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold)),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(item['name'] ?? '', style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold), maxLines: 1, overflow: TextOverflow.ellipsis),
                                              const SizedBox(height: 6),
                                              Row(
                                                children: [
                                                  const Text('Duración (s):', style: TextStyle(color: Colors.white30, fontSize: 11)),
                                                  const SizedBox(width: 6),
                                                  Container(
                                                    width: 50,
                                                    height: 24,
                                                    child: TextField(
                                                      keyboardType: TextInputType.number,
                                                      enabled: !isVideo,
                                                      controller: TextEditingController(text: item['duration'].toString()),
                                                      style: const TextStyle(color: Colors.white, fontSize: 11),
                                                      decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(vertical: 8), isDense: true),
                                                      onChanged: (val) {
                                                        final int duration = int.tryParse(val) ?? 10;
                                                        item['duration'] = duration;
                                                      },
                                                    ),
                                                  ),
                                                  const SizedBox(width: 16),
                                                  const Text('Animación:', style: TextStyle(color: Colors.white30, fontSize: 11)),
                                                  const SizedBox(width: 6),
                                                  DropdownButton<String>(
                                                    value: item['transition'] ?? 'Fade',
                                                    dropdownColor: cardBg,
                                                    style: const TextStyle(color: Colors.white, fontSize: 11),
                                                    items: const [
                                                      DropdownMenuItem(value: 'None', child: Text('Sin Transición')),
                                                      DropdownMenuItem(value: 'Fade', child: Text('Fade')),
                                                      DropdownMenuItem(value: 'Slide Left', child: Text('Slide Left')),
                                                      DropdownMenuItem(value: 'Zoom', child: Text('Zoom')),
                                                    ],
                                                    onChanged: (val) {
                                                      if (val != null) {
                                                        setState(() {
                                                          item['transition'] = val;
                                                        });
                                                      }
                                                    },
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                        IconButton(
                                          onPressed: () => _handleRemoveFromPlaylist(idx),
                                          icon: const Icon(Icons.close, color: Colors.white54, size: 20),
                                        ),
                                      ],
                                    ),
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
}
