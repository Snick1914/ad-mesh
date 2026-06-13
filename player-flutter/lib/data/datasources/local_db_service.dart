import 'package:isar/isar.dart';
import 'package:path_provider/path_provider.dart';
import '../models/device_config_model.dart';
import '../models/playlist_item_model.dart';

class LocalDbService {
  Isar? _isar;

  Future<void> init() async {
    if (_isar != null) return;
    final dir = await getApplicationDocumentsDirectory();
    _isar = await Isar.open(
      [PlaylistItemModelSchema, DeviceConfigModelSchema],
      directory: dir.path,
    );
  }

  /// Get cached device configuration
  Future<DeviceConfigModel?> getDeviceConfig() async {
    final isar = _isar;
    if (isar == null) throw Exception('Isar database has not been initialized.');
    return await isar.deviceConfigModels.get(0);
  }

  /// Save device configuration
  Future<void> saveDeviceConfig(DeviceConfigModel config) async {
    final isar = _isar;
    if (isar == null) throw Exception('Isar database has not been initialized.');
    await isar.writeTxn(() async {
      await isar.deviceConfigModels.put(config);
    });
  }

  /// Get cached playlist sorted by playback order
  Future<List<PlaylistItemModel>> getCachedPlaylist() async {
    final isar = _isar;
    if (isar == null) throw Exception('Isar database has not been initialized.');
    return await isar.playlistItemModels.where().sortByPlayOrder().findAll();
  }

  /// Clear old cached items and save new playlist items in a atomic transaction
  Future<void> cachePlaylist(List<PlaylistItemModel> newPlaylist) async {
    final isar = _isar;
    if (isar == null) throw Exception('Isar database has not been initialized.');
    await isar.writeTxn(() async {
      await isar.playlistItemModels.clear();
      await isar.playlistItemModels.putAll(newPlaylist);
    });
  }
}
