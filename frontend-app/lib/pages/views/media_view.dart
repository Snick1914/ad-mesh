import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:file_picker/file_picker.dart';
import '../../../services/api_service.dart';

class MediaView extends StatefulWidget {
  const MediaView({super.key});

  @override
  State<MediaView> createState() => _MediaViewState();
}

class _MediaViewState extends State<MediaView> {
  List<dynamic> _mediaItems = [];
  bool _isLoading = true;
  String _searchTerm = '';

  // Storage info
  double _usedStorageGb = 0.0;
  double _maxStorageGb = 10.0;

  bool _isUploading = false;

  Future<void> _loadMedia() async {
    setState(() => _isLoading = true);
    final items = await ApiService.getMedia();
    
    // Calculate total bytes
    int totalBytes = 0;
    for (var item in items) {
      totalBytes += (item['file_size_bytes'] ?? 0) as int;
    }
    final double usedGb = totalBytes / (1024 * 1024 * 1024);

    // Decode token limits
    double maxGb = 10.0;
    final payload = await ApiService.decodeToken();
    if (payload.containsKey('max_storage_gb')) {
      maxGb = (payload['max_storage_gb'] ?? 10.0).toDouble();
    }

    setState(() {
      _mediaItems = items;
      _usedStorageGb = double.parse(usedGb.toStringAsFixed(3));
      _maxStorageGb = maxGb;
      _isLoading = false;
    });
  }

  @override
  void initState() {
    super.initState();
    _loadMedia();
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
          await _loadMedia();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Error al subir el archivo o límite de cuota superado'), backgroundColor: Colors.redAccent),
          );
        }
      }
    }
  }

  Future<void> _handleDelete(int mediaId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF121824),
        title: const Text('Eliminar Archivo', style: TextStyle(color: Colors.white)),
        content: const Text('¿Estás seguro de que deseas eliminar este archivo multimedia de forma permanente?', style: TextStyle(color: Colors.white70)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar', style: TextStyle(color: Colors.white54))),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Eliminar', style: TextStyle(color: Colors.redAccent))),
        ],
      ),
    );

    if (confirmed == true) {
      setState(() => _isLoading = true);
      final success = await ApiService.deleteMedia(mediaId);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Archivo eliminado con éxito'), backgroundColor: Color(0xFF10B981)),
        );
      }
      await _loadMedia();
    }
  }

  @override
  Widget build(BuildContext context) {
    const primaryColor = Color(0xFF00F0FF);
    const cardBg = Color(0xFF121824);
    const darkBg = Color(0xFF05070A);

    final filteredMedia = _mediaItems.where((item) {
      return item['name'].toString().toLowerCase().contains(_searchTerm.toLowerCase());
    }).toList();

    final storagePercentage = _maxStorageGb > 0 ? (_usedStorageGb / _maxStorageGb) : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header Row
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Biblioteca de Medios',
                  style: GoogleFonts.inter(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Sube y administra los videos e imágenes para tus listas de reproducción.',
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                ),
              ],
            ),
            ElevatedButton.icon(
              onPressed: _isUploading ? null : _pickAndUpload,
              icon: const Icon(Icons.cloud_upload_outlined, size: 18),
              label: const Text('Subir Archivo'),
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryColor,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        // Upload progress bar
        if (_isUploading) ...[
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: primaryColor.withOpacity(0.2)),
            ),
            child: const Row(
              children: [
                SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2.5, valueColor: AlwaysStoppedAnimation(primaryColor)),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: Text(
                    'Subiendo archivo... por favor espera.',
                    style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],

        // Storage Usage progress card
        Container(
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
                    'Uso de Almacenamiento',
                    style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 14),
                  ),
                  Text(
                    '$_usedStorageGb GB de $_maxStorageGb GB en uso',
                    style: GoogleFonts.robotoMono(color: const Color(0xFF94A3B8), fontSize: 12),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: LinearProgressIndicator(
                  value: storagePercentage,
                  minHeight: 8,
                  backgroundColor: Colors.white10,
                  valueColor: const AlwaysStoppedAnimation(Color(0xFF10B981)),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Search Bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white.withOpacity(0.05)),
          ),
          child: TextField(
            style: const TextStyle(color: Colors.white),
            decoration: const InputDecoration(
              icon: Icon(Icons.search, color: Color(0xFF94A3B8)),
              hintText: 'Buscar archivo por nombre...',
              hintStyle: TextStyle(color: Color(0xFF94A3B8)),
              border: InputBorder.none,
            ),
            onChanged: (val) => setState(() => _searchTerm = val),
          ),
        ),
        const SizedBox(height: 24),

        // Grid of Media Items
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation(primaryColor)))
              : filteredMedia.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.perm_media_outlined, size: 64, color: Colors.white24),
                          const SizedBox(height: 16),
                          Text('Biblioteca vacía', style: GoogleFonts.inter(color: Colors.white70)),
                        ],
                      ),
                    )
                  : GridView.builder(
                      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                        maxCrossAxisExtent: 220,
                        mainAxisSpacing: 16,
                        crossAxisSpacing: 16,
                        childAspectRatio: 0.95,
                      ),
                      itemCount: filteredMedia.length,
                      itemBuilder: (context, index) {
                        final item = filteredMedia[index];
                        final name = item['name'] ?? '';
                        final fileType = item['file_type'] ?? '';
                        final isVideo = fileType.toString().startsWith('video');
                        final double sizeMb = (item['file_size_bytes'] ?? 0) / (1024 * 1024);

                        return Container(
                          decoration: BoxDecoration(
                            color: cardBg,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.white.withOpacity(0.05)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              // Preview Icon Box
                              Expanded(
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: Colors.black.withOpacity(0.2),
                                    borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                                  ),
                                  child: Center(
                                    child: Icon(
                                      isVideo ? Icons.movie_outlined : Icons.image_outlined,
                                      size: 40,
                                      color: isVideo ? Colors.blueAccent : const Color(0xFF10B981),
                                    ),
                                  ),
                                ),
                              ),
                              // Item details
                              Padding(
                                padding: const EdgeInsets.all(12.0),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      name,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: GoogleFonts.inter(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          '${sizeMb.toStringAsFixed(1)} MB',
                                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
                                        ),
                                        IconButton(
                                          onPressed: () => _handleDelete(item['id']),
                                          icon: const Icon(Icons.delete_outline_rounded, color: Colors.redAccent, size: 16),
                                          padding: EdgeInsets.zero,
                                          constraints: const BoxConstraints(),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
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
}
