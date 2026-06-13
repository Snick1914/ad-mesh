class PlaylistItem {
  final String id;
  final String url;
  final String localPath;
  final String checksum;
  final int playOrder;
  final int duration;
  final String zone;

  const PlaylistItem({
    required this.id,
    required this.url,
    required this.localPath,
    required this.checksum,
    required this.playOrder,
    required this.duration,
    required this.zone,
  });

  PlaylistItem copyWith({
    String? id,
    String? url,
    String? localPath,
    String? checksum,
    int? playOrder,
    int? duration,
    String? zone,
  }) {
    return PlaylistItem(
      id: id ?? this.id,
      url: url ?? this.url,
      localPath: localPath ?? this.localPath,
      checksum: checksum ?? this.checksum,
      playOrder: playOrder ?? this.playOrder,
      duration: duration ?? this.duration,
      zone: zone ?? this.zone,
    );
  }
}
