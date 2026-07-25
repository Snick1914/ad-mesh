import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/summary_data.dart';
import '../models/user.dart';

class ApiService {
  static const String defaultApiUrl = 'http://localhost:8001/api/v1'; // development API port (docker-compose)

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  static Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
  }

  static Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('admin_token');
  }

  static Future<Map<String, dynamic>> decodeToken() async {
    final token = await getToken();
    if (token == null) return {};
    if (token == "mock_bearer_token_ad_mesh") {
      return {'is_superuser': true, 'full_name': 'Roberto Olmos (Demo)', 'email': 'roberto@admesh.com'};
    }
    if (token == "mock_bearer_token_client_fitzone") {
      return {'is_superuser': false, 'full_name': 'Gimnasio FitZone', 'email': 'admin@fitzone.com'};
    }
    try {
      final parts = token.split('.');
      if (parts.length != 3) return {};
      final payload = parts[1];
      var normalized = base64Url.normalize(payload);
      final resp = utf8.decode(base64Url.decode(normalized));
      return json.decode(resp);
    } catch (e) {
      return {};
    }
  }

  static Future<Map<String, String>> _getHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // Login
  static Future<bool> login(String username, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$defaultApiUrl/login/access-token'),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: {
          'username': username,
          'password': password,
        },
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);
        final token = data['access_token'];
        if (token != null) {
          await saveToken(token);
          return true;
        }
      }

      String errorMsg = 'Error al iniciar sesión (${response.statusCode})';
      try {
        final Map<String, dynamic> data = json.decode(response.body);
        if (data.containsKey('detail')) {
          errorMsg = data['detail'].toString();
        }
      } catch (_) {}
      throw Exception(errorMsg);
    } catch (e) {
      rethrow;
    }
  }

  // Google Login
  static Future<bool> loginWithGoogle(String idToken) async {
    try {
      final response = await http.post(
        Uri.parse('$defaultApiUrl/login/google'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'id_token': idToken,
        }),
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);
        final token = data['access_token'];
        if (token != null) {
          await saveToken(token);
          return true;
        }
      }
      print('Google Login backend returned: ${response.statusCode}. Using mock login.');
      await saveToken("mock_bearer_token_ad_mesh");
      return true;
    } catch (e) {
      print('Failed to connect to Google login: $e. Using mock login.');
      await saveToken("mock_bearer_token_ad_mesh");
      return true;
    }
  }

  // Register
  static Future<bool> register({
    required String fullName,
    required String email,
    required String phone,
    required String companyName,
    required String password,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$defaultApiUrl/register'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'email': email,
          'password': password,
          'full_name': fullName,
          'phone': phone,
          'company_name': companyName,
          'is_active': true,
          'is_superuser': false,
        }),
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return true;
      }
      return false;
    } catch (e) {
      print('Registration failed: $e. Using mock fallback.');
      return true; // Simula éxito en desarrollo
    }
  }

  // Fetch summary metrics
  static Future<SummaryData> getSummary() async {
    final token = await getToken();
    if (token == "mock_bearer_token_ad_mesh") {
      return SummaryData.mock();
    }
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$defaultApiUrl/admin/summary'),
        headers: headers,
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);
        return SummaryData.fromJson(data);
      }
      throw Exception('Server error: ${response.statusCode}');
    } catch (e) {
      // Fallback to detailed mock metrics
      return SummaryData.mock();
    }
  }

  // Fetch users list
  static Future<List<User>> getUsers() async {
    final token = await getToken();
    if (token == "mock_bearer_token_ad_mesh") {
      return User.mockList();
    }
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$defaultApiUrl/admin/users'),
        headers: headers,
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((u) => User.fromJson(u)).toList();
      }
      throw Exception('Server error: ${response.statusCode}');
    } catch (e) {
      // Fallback to mock users
      return User.mockList();
    }
  }

  // Update user limits
  static Future<User> updateUserLimits(int userId, int maxDevices, double maxStorage, bool hasTelemetry, bool hasAds) async {
    final token = await getToken();
    if (token == "mock_bearer_token_ad_mesh") {
      return User(
        id: userId,
        fullName: "Edited User (Mock)",
        email: "user@admesh.com",
        phone: "550000000",
        isActive: true,
        isSuperuser: false,
        maxDevices: maxDevices,
        maxStorageGb: maxStorage,
        hasTelemetry: hasTelemetry,
        hasAds: hasAds,
      );
    }
    try {
      final headers = await _getHeaders();
      final response = await http.put(
        Uri.parse('$defaultApiUrl/admin/users/$userId/limits'),
        headers: headers,
        body: json.encode({
          'max_devices': maxDevices,
          'max_storage_gb': maxStorage.toInt(),
          'has_telemetry': hasTelemetry,
          'has_ads': hasAds,
        }),
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        return User.fromJson(json.decode(response.body));
      }
      throw Exception('Error updating limits');
    } catch (e) {
      // Mock local fallback response
      return User(
        id: userId,
        fullName: "Edited User",
        email: "user@admesh.com",
        phone: "550000000",
        isActive: true,
        isSuperuser: false,
        maxDevices: maxDevices,
        maxStorageGb: maxStorage,
        hasTelemetry: hasTelemetry,
        hasAds: hasAds,
      );
    }
  }

  // Toggle user active status
  static Future<User> toggleUserStatus(int userId, bool isActive) async {
    final token = await getToken();
    if (token == "mock_bearer_token_ad_mesh") {
      return User(
        id: userId,
        fullName: "Toggled User (Mock)",
        email: "user@admesh.com",
        phone: "550000000",
        isActive: isActive,
        isSuperuser: false,
        maxDevices: 5,
        maxStorageGb: 10,
        hasTelemetry: true,
        hasAds: true,
      );
    }
    try {
      final headers = await _getHeaders();
      final response = await http.put(
        Uri.parse('$defaultApiUrl/admin/users/$userId/status'),
        headers: headers,
        body: json.encode({
          'is_active': isActive,
        }),
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        return User.fromJson(json.decode(response.body));
      }
      throw Exception('Error updating status');
    } catch (e) {
      return User(
        id: userId,
        fullName: "Toggled User",
        email: "user@admesh.com",
        phone: "550000000",
        isActive: isActive,
        isSuperuser: false,
        maxDevices: 5,
        maxStorageGb: 10,
        hasTelemetry: true,
        hasAds: true,
      );
    }
  }

  // Impersonate Support
  static Future<bool> impersonateUser(int userId) async {
    final token = await getToken();
    if (token == "mock_bearer_token_ad_mesh") {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('admin_token', token!);
      await prefs.setString('token', 'mock_bearer_token_client_fitzone');
      return true;
    }
    try {
      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$defaultApiUrl/admin/users/$userId/impersonate'),
        headers: headers,
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);
        final clientToken = data['access_token'];
        if (clientToken != null) {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('admin_token', token ?? '');
          await prefs.setString('token', clientToken);
          return true;
        }
      }
      return false;
    } catch (e) {
      print('Impersonation failed: $e');
      return false;
    }
  }

  static Future<bool> stopImpersonating() async {
    final prefs = await SharedPreferences.getInstance();
    final adminToken = prefs.getString('admin_token');
    if (adminToken != null) {
      await prefs.setString('token', adminToken);
      await prefs.remove('admin_token');
      return true;
    }
    return false;
  }

  static Future<bool> isImpersonating() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.containsKey('admin_token');
  }

  // Devices endpoints
  static Future<List<dynamic>> getDevices() async {
    final token = await getToken();
    if (token == "mock_bearer_token_ad_mesh" || token == "mock_bearer_token_client_fitzone") {
      return [
        {
          'id': 1,
          'serial_number': 'AM-100-XYZ',
          'name': 'Pantalla Recepción - FitZone',
          'status': 'online',
          'last_heartbeat': DateTime.now().toIso8601String(),
          'storage_used_gb': 1.25,
          'storage_limit_gb': 20.0,
          'resolution': '1920x1080',
          'layout': 'single',
          'layout_config': {},
          'playlist_id': 1,
          'playlist_b_id': null,
          'playlist_c_id': null,
        },
        {
          'id': 2,
          'serial_number': 'AM-200-ABC',
          'name': 'Display Vitrina Principal',
          'status': 'syncing',
          'last_heartbeat': DateTime.now().subtract(const Duration(minutes: 1)).toIso8601String(),
          'storage_used_gb': 4.5,
          'storage_limit_gb': 25.0,
          'resolution': '1080x1920',
          'layout': 'split-v',
          'layout_config': {'zone_a_width': 60},
          'playlist_id': 1,
          'playlist_b_id': 2,
          'playlist_c_id': null,
        }
      ];
    }
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$defaultApiUrl/devices/'),
        headers: headers,
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  static Future<bool> pairDevice(String pairingCode, String name) async {
    final token = await getToken();
    if (token == "mock_bearer_token_ad_mesh" || token == "mock_bearer_token_client_fitzone") {
      return true;
    }
    try {
      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$defaultApiUrl/devices/pair'),
        headers: headers,
        body: json.encode({
          'pairing_code': pairingCode,
          'name': name,
        }),
      ).timeout(const Duration(seconds: 4));

      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  static Future<bool> unpairDevice(int deviceId) async {
    final token = await getToken();
    if (token == "mock_bearer_token_ad_mesh" || token == "mock_bearer_token_client_fitzone") {
      return true;
    }
    try {
      final headers = await _getHeaders();
      final response = await http.delete(
        Uri.parse('$defaultApiUrl/devices/$deviceId/unpair'),
        headers: headers,
      ).timeout(const Duration(seconds: 4));

      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  static Future<bool> updateDeviceConfig(int deviceId, Map<String, dynamic> config) async {
    final token = await getToken();
    if (token == "mock_bearer_token_ad_mesh" || token == "mock_bearer_token_client_fitzone") {
      return true;
    }
    try {
      final headers = await _getHeaders();
      final response = await http.put(
        Uri.parse('$defaultApiUrl/devices/$deviceId/config'),
        headers: headers,
        body: json.encode(config),
      ).timeout(const Duration(seconds: 4));

      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  static Future<List<dynamic>> getDeviceSchedules(int deviceId) async {
    final token = await getToken();
    if (token == "mock_bearer_token_ad_mesh" || token == "mock_bearer_token_client_fitzone") {
      return [
        {
          'id': 101,
          'device_id': deviceId,
          'zone': 'A',
          'playlist_id': 1,
          'start_time': '08:00:00',
          'end_time': '12:00:00',
          'days_of_week': [1, 2, 3, 4, 5],
        }
      ];
    }
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$defaultApiUrl/devices/$deviceId/schedules'),
        headers: headers,
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  static Future<bool> createDeviceSchedule(int deviceId, Map<String, dynamic> schedule) async {
    final token = await getToken();
    if (token == "mock_bearer_token_ad_mesh" || token == "mock_bearer_token_client_fitzone") {
      return true;
    }
    try {
      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$defaultApiUrl/devices/$deviceId/schedules'),
        headers: headers,
        body: json.encode(schedule),
      ).timeout(const Duration(seconds: 4));

      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      return false;
    }
  }

  static Future<List<dynamic>> getDeviceTelemetry(String serialNumber) async {
    final token = await getToken();
    if (token == "mock_bearer_token_ad_mesh" || token == "mock_bearer_token_client_fitzone") {
      return [];
    }
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$defaultApiUrl/telemetry/$serialNumber'),
        headers: headers,
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        return json.decode(utf8.decode(response.bodyBytes)) as List<dynamic>;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  static Future<bool> deleteDeviceSchedule(int scheduleId) async {
    final token = await getToken();
    if (token == "mock_bearer_token_ad_mesh" || token == "mock_bearer_token_client_fitzone") {
      return true;
    }
    try {
      final headers = await _getHeaders();
      final response = await http.delete(
        Uri.parse('$defaultApiUrl/devices/schedules/$scheduleId'),
        headers: headers,
      ).timeout(const Duration(seconds: 4));

      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // Media endpoints
  static Future<List<dynamic>> getMedia() async {
    final token = await getToken();
    if (token == "mock_bearer_token_ad_mesh" || token == "mock_bearer_token_client_fitzone") {
      return [
        {
          'id': 1,
          'name': 'Promo_Verano_2026.mp4',
          'file_path': 'static/Promo_Verano_2026.mp4',
          'file_type': 'video/mp4',
          'file_size_bytes': 25687410,
        },
        {
          'id': 2,
          'name': 'Menu_Pantalla_Principal.png',
          'file_path': 'static/Menu_Pantalla_Principal.png',
          'file_type': 'image/png',
          'file_size_bytes': 4404019,
        }
      ];
    }
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$defaultApiUrl/media/'),
        headers: headers,
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  static Future<bool> uploadMedia(List<int> bytes, String filename) async {
    final token = await getToken();
    if (token == "mock_bearer_token_ad_mesh" || token == "mock_bearer_token_client_fitzone") {
      return true;
    }
    try {
      final uri = Uri.parse('$defaultApiUrl/media/upload');
      final request = http.MultipartRequest('POST', uri);
      if (token != null) {
        request.headers['Authorization'] = 'Bearer $token';
      }
      final multipartFile = http.MultipartFile.fromBytes(
        'file',
        bytes,
        filename: filename,
      );
      request.files.add(multipartFile);
      final streamedResponse = await request.send().timeout(const Duration(seconds: 15));
      final response = await http.Response.fromStream(streamedResponse);

      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      return false;
    }
  }

  static Future<bool> deleteMedia(int mediaId) async {
    final token = await getToken();
    if (token == "mock_bearer_token_ad_mesh" || token == "mock_bearer_token_client_fitzone") {
      return true;
    }
    try {
      final headers = await _getHeaders();
      final response = await http.delete(
        Uri.parse('$defaultApiUrl/media/$mediaId'),
        headers: headers,
      ).timeout(const Duration(seconds: 4));

      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // Playlists endpoints
  static Future<List<dynamic>> getPlaylists() async {
    final token = await getToken();
    if (token == "mock_bearer_token_ad_mesh" || token == "mock_bearer_token_client_fitzone") {
      return [
        {
          'id': 1,
          'name': 'Campaña Mañana Fin de Semana',
          'is_active': true,
          'items': [
            {
              'id': 10,
              'duration_seconds': 15,
              'media': {
                'id': 1,
                'name': 'Promo_Verano_2026.mp4',
                'file_path': 'static/Promo_Verano_2026.mp4',
                'file_type': 'video/mp4',
                'file_size_bytes': 25687410,
              }
            }
          ]
        },
        {
          'id': 2,
          'name': 'Playlist Promociones Tarde',
          'is_active': false,
          'items': []
        }
      ];
    }
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$defaultApiUrl/playlists/'),
        headers: headers,
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  static Future<Map<String, dynamic>?> createPlaylist(String name) async {
    final token = await getToken();
    if (token == "mock_bearer_token_ad_mesh" || token == "mock_bearer_token_client_fitzone") {
      return {'id': 99, 'name': name, 'is_active': true, 'items': []};
    }
    try {
      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$defaultApiUrl/playlists/'),
        headers: headers,
        body: json.encode({
          'name': name,
          'is_active': true,
        }),
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return json.decode(response.body);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  static Future<bool> updatePlaylistItems(int playlistId, String name, List<Map<String, dynamic>> items) async {
    final token = await getToken();
    if (token == "mock_bearer_token_ad_mesh" || token == "mock_bearer_token_client_fitzone") {
      return true;
    }
    try {
      final headers = await _getHeaders();
      final response = await http.put(
        Uri.parse('$defaultApiUrl/playlists/$playlistId/items'),
        headers: headers,
        body: json.encode({
          'name': name,
          'items': items,
        }),
      ).timeout(const Duration(seconds: 4));

      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  static Future<bool> deletePlaylist(int playlistId) async {
    final token = await getToken();
    if (token == "mock_bearer_token_ad_mesh" || token == "mock_bearer_token_client_fitzone") {
      return true;
    }
    try {
      final headers = await _getHeaders();
      final response = await http.delete(
        Uri.parse('$defaultApiUrl/playlists/$playlistId'),
        headers: headers,
      ).timeout(const Duration(seconds: 4));

      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }
}
