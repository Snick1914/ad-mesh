import 'package:isar/isar.dart';
import '../../domain/entities/playlist_item.dart';

part 'playlist_item_model.g.dart';

@collection
class PlaylistItemModel {
  Id? isarId;

  @Index(unique: true, replace: true)
  late String id;

  late String url;
  late String localPath;
  late String checksum;
  late int playOrder;
  late int duration;
  late String zone;

  PlaylistItemModel();

  factory PlaylistItemModel.fromEntity(PlaylistItem entity) {
    return PlaylistItemModel()
      ..id = entity.id
      ..url = entity.url
      ..localPath = entity.localPath
      ..checksum = entity.checksum
      ..playOrder = entity.playOrder
      ..duration = entity.duration
      ..zone = entity.zone;
  }

  PlaylistItem toEntity() {
    return PlaylistItem(
      id: id,
      url: url,
      localPath: localPath,
      checksum: checksum,
      playOrder: playOrder,
      duration: duration,
      zone: zone,
    );
  }
}
