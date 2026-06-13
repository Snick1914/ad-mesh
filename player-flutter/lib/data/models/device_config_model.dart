import 'package:isar/isar.dart';

part 'device_config_model.g.dart';

@collection
class DeviceConfigModel {
  Id id = 0; // Fixed ID for single configuration row

  late String serialNumber;
  late bool isPaired;
  late String pairingCode;
  
  String layout = 'single';
  String layoutConfigJson = '{}';

  String? customBackendUrl;
}
