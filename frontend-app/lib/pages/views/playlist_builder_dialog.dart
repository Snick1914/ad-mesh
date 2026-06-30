import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:file_picker/file_picker.dart';
import '../../../services/api_service.dart';

class PlaylistBuilderDialog extends StatefulWidget {
  final int? playlistId;
  const PlaylistBuilderDialog({super.key, this.playlistId});

  @override
  State<PlaylistBuilderDialog> createState() => _PlaylistBuilderDialogState();
}

class _PlaylistBuilderDialogState extends State<PlaylistBuilderDialog> {
  bool _isLoading = true;
  bool _isSaving = false;
  bool _isUploading = false;
  String _playlistName = 'Nueva Playlist de Zona';
  List<dynamic> _mediaItems = [];
  List<Map<String, dynamic>> _playlistItems = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final media = await ApiService.getMedia();
      setState(() {
        _mediaItems = media;
      });

      if (widget.playlistId != null) {
        final plays = await ApiService.getPlaylists();
        final p = plays.firstWhere((element) => element['id'] == widget.playlistId, orElse: () => null);
        if (p != null) {
          _playlistName = p['name'] ?? 'Playlist';
          final List<dynamic> items = p['items'] ?? [];
          _playlistItems = items.map<Map<String, dynamic>>((item) {
            final m = item['media'] ?? {};
            return {
              'id': item['id'] ?? DateTime.now().millisecondsSinceEpoch,
              'media_id': m['id'],
              'name': m['name'] ?? '',
              'file_type': m['file_type'] ?? '',
              'duration': item['duration_seconds'] ?? 10,
              'transition': 'Fade',
            };
          }).toList();
        }
      }
      setState(() => _isLoading = false);
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _pickAndUpload() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['mp4', 'mov', 'jpg', 'jpeg', 'png'],
      withData: true,
    );

    if (result != null && result.files.isNotEmpty) {
      final file = result.files.first;
      final bytes = file.bytes;
      final name = file.name;
      if (bytes != null) {
        setState(() {
          _isUploading = true;
        });
        final success = await ApiService.uploadMedia(bytes, name);
        setState(() {
          _isUploading = false;
        });
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Archivo subido correctamente a la biblioteca'), backgroundColor: Color(0xFF10B981)),
          );
          // Reload media library
          final media = await ApiService.getMedia();
          setState(() {
            _mediaItems = media;
          });
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Error al subir el archivo o límite de cuota superado'), backgroundColor: Colors.redAccent),
          );
        }
      }
    }
  }

  void _handleAddToPlaylist(dynamic m) {
    setState(() {
      _playlistItems.add({
        'id': DateTime.now().millisecondsSinceEpoch + _playlistItems.length,
        'media_id': m['id'],
        'name': m['name'] ?? '',
        'file_type': m['file_type'] ?? '',
        'duration': 10,
        'transition': 'Fade',
      });
    });
  }

  Future<void> _handleSavePlaylist() async {
    if (_playlistName.trim().isEmpty) return;
    if (_playlistItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Añade al menos un elemento a la línea de tiempo'), backgroundColor: Colors.redAccent),
      );
      return;
    }
    setState(() => _isSaving = true);

    try {
      int? targetPlaylistId = widget.playlistId;

      if (targetPlaylistId == null) {
        final res = await ApiService.createPlaylist(_playlistName);
        if (res != null) {
          targetPlaylistId = res['id'];
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
          Navigator.pop(context, targetPlaylistId);
          return;
        }
      }

      setState(() => _isSaving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Error al guardar la playlist'), backgroundColor: Colors.redAccent),
      );
    } catch (e) {
      setState(() => _isSaving = false);
    }
  }

  String _formatTime(int seconds) {
    final int m = seconds ~/ 60;
    final int s = seconds % 60;
    return '$m:${s.toString().padLeft(2, '0')} min';
  }

  @override
  Widget build(BuildContext context) {
    const primaryColor = Color(0xFF00F0FF);
    const cardBg = Color(0xFF121824);
    const darkBg = Color(0xFF05070A);

    if (_isLoading) {
      return const Dialog(
        backgroundColor: cardBg,
        child: SizedBox(
          height: 200,
          child: Center(
            child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation(primaryColor)),
          ),
        ),
      );
    }

    final int totalDuration = _playlistItems.fold(0, (sum, item) => sum + (item['duration'] as int));

    return Dialog(
      backgroundColor: cardBg,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Container(
        width: 900,
        height: 600,
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.playlistId == null ? 'Nueva Playlist de Zona' : 'Editar Playlist',
                      style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    Text(
                      'Duración total: ${_formatTime(totalDuration)}',
                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                    ),
                  ],
                ),
                Row(
                  children: [
                    TextButton(
                      onPressed: () => Navigator.pop(context, null),
                      child: const Text('Cancelar', style: TextStyle(color: Colors.white54)),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton.icon(
                      onPressed: _isSaving ? null : _handleSavePlaylist,
                      icon: _isSaving
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Colors.black)))
                          : const Icon(Icons.save_outlined, size: 16),
                      label: const Text('Guardar y Asignar', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryColor,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ],
                )
              ],
            ),
            const SizedBox(height: 16),

            // Name Field
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: darkBg,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.white10),
              ),
              child: TextField(
                controller: TextEditingController(text: _playlistName)..selection = TextSelection.collapsed(offset: _playlistName.length),
                style: const TextStyle(color: Colors.white, fontSize: 14),
                decoration: const InputDecoration(border: InputBorder.none, hintText: 'Nombre de la Playlist'),
                onChanged: (val) => _playlistName = val,
              ),
            ),
            const SizedBox(height: 16),

            // Content Rows
            Expanded(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Left panel: Media Library
                  Expanded(
                    flex: 4,
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: darkBg,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white.withOpacity(0.05)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Biblioteca', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                                  Text('Añadir contenido', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                                ],
                              ),
                              IconButton(
                                onPressed: _isUploading ? null : _pickAndUpload,
                                icon: _isUploading
                                    ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(primaryColor)))
                                    : const Icon(Icons.cloud_upload_outlined, color: primaryColor, size: 18),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Expanded(
                            child: _mediaItems.isEmpty
                                ? const Center(child: Text('Librería vacía', style: TextStyle(color: Colors.white30, fontSize: 11)))
                                : ListView.separated(
                                    itemCount: _mediaItems.length,
                                    separatorBuilder: (c, i) => const SizedBox(height: 8),
                                    itemBuilder: (context, idx) {
                                      final m = _mediaItems[idx];
                                      final isVideo = m['file_type'].toString().startsWith('video');
                                      return ListTile(
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        tileColor: Colors.black12,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                        leading: Icon(isVideo ? Icons.movie_outlined : Icons.image_outlined, color: primaryColor, size: 18),
                                        title: Text(m['name'] ?? '', style: const TextStyle(color: Colors.white, fontSize: 11), maxLines: 1, overflow: TextOverflow.ellipsis),
                                        trailing: const Icon(Icons.add_circle_outline, color: primaryColor, size: 18),
                                        onTap: () => _handleAddToPlaylist(m),
                                      );
                                    },
                                  ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),

                  // Right panel: Playlist timeline
                  Expanded(
                    flex: 6,
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: darkBg,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white.withOpacity(0.05)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Línea de Tiempo (${_playlistItems.length} elementos)', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                          const SizedBox(height: 12),
                          Expanded(
                            child: _playlistItems.isEmpty
                                ? const Center(child: Text('Playlist vacía. Agrega medios de la biblioteca.', style: TextStyle(color: Colors.white30, fontSize: 11)))
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

                                      return ListTile(
                                        key: ValueKey(item['id']),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                        tileColor: cardBg,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                        leading: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            const Icon(Icons.drag_indicator, color: Colors.white30, size: 18),
                                            const SizedBox(width: 8),
                                            Icon(isVideo ? Icons.movie_outlined : Icons.image_outlined, color: primaryColor, size: 18),
                                          ],
                                        ),
                                        title: Text(item['name'] ?? '', style: const TextStyle(color: Colors.white, fontSize: 11), maxLines: 1, overflow: TextOverflow.ellipsis),
                                        trailing: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            // Duration selection
                                            Container(
                                              width: 60,
                                              height: 30,
                                              padding: const EdgeInsets.symmetric(horizontal: 4),
                                              decoration: BoxDecoration(
                                                color: Colors.black26,
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: DropdownButtonHideUnderline(
                                                child: DropdownButton<int>(
                                                  value: item['duration'],
                                                  dropdownColor: cardBg,
                                                  style: const TextStyle(color: Colors.white, fontSize: 11),
                                                  items: [5, 10, 15, 20, 30, 45, 60].map((d) {
                                                    return DropdownMenuItem(value: d, child: Text('${d}s'));
                                                  }).toList(),
                                                  onChanged: (val) {
                                                    if (val != null) {
                                                      setState(() {
                                                        item['duration'] = val;
                                                      });
                                                    }
                                                  },
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            IconButton(
                                              onPressed: () {
                                                setState(() {
                                                  _playlistItems.removeAt(idx);
                                                });
                                              },
                                              icon: const Icon(Icons.remove_circle_outline, color: Colors.redAccent, size: 18),
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
        ),
      ),
    );
  }
}
