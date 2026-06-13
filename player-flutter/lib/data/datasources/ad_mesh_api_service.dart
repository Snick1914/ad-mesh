import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;

class AdMeshApiService {
  final Dio _dio;
  String baseUrl;

  AdMeshApiService({
    required String baseUrl,
  }) : baseUrl = baseUrl.endsWith('/') ? baseUrl : '$baseUrl/',
       _dio = Dio(
          BaseOptions(
            baseUrl: baseUrl.endsWith('/') ? baseUrl : '$baseUrl/',
            connectTimeout: const Duration(seconds: 5),
            receiveTimeout: const Duration(seconds: 30),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          ),
        );

  void updateBaseUrl(String newUrl) {
    baseUrl = newUrl.endsWith('/') ? newUrl : '$newUrl/';
    _dio.options.baseUrl = baseUrl;
  }

  Future<bool> checkConnection() async {
    try {
      final response = await _dio.get('devices/', 
        options: Options(
          sendTimeout: const Duration(seconds: 3),
          receiveTimeout: const Duration(seconds: 3),
        ),
      );
      return response.statusCode == 200;
    } on DioException catch (e) {
      debugPrint('AdMeshApiService: Health check request failed: $e');
      if (e.response != null && (e.response!.statusCode == 401 || e.response!.statusCode == 403 || e.response!.statusCode == 404)) {
        // If the server answered with an HTTP error like 401, 403 or 404, the server is ONLINE.
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('AdMeshApiService: Health check failed: $e');
      return false;
    }
  }

  /// Request a pairing code for a given hardware serial number.
  Future<Map<String, dynamic>> requestPairing(String serialNumber) async {
    try {
      final response = await _dio.post('devices/request-pairing', data: {
        'serial_number': serialNumber,
      });
      if (response.statusCode == 200 || response.statusCode == 201) {
        return Map<String, dynamic>.from(response.data);
      }
      throw Exception('Failed to request pairing code: Status ${response.statusCode}');
    } catch (e) {
      debugPrint('AdMeshApiService: Error requesting pairing code: $e');
      rethrow;
    }
  }

  /// Register a device heartbeat to keep telemetry updated.
  Future<Map<String, dynamic>> sendHeartbeat({
    required String serialNumber,
    required String ipAddress,
    required double storageUsedGb,
    String status = 'online',
  }) async {
    try {
      final response = await _dio.post('devices/$serialNumber/heartbeat', data: {
        'ip_address': ipAddress,
        'storage_used_gb': storageUsedGb,
        'status': status,
      });
      if (response.statusCode == 200 || response.statusCode == 201) {
        return Map<String, dynamic>.from(response.data);
      }
      throw Exception('Failed to send heartbeat: Status ${response.statusCode}');
    } catch (e) {
      debugPrint('AdMeshApiService: Error sending heartbeat: $e');
      rethrow;
    }
  }

  /// Fetch playlist data for a specific paired device serial number.
  Future<Map<String, dynamic>> getDevicePlaylist(String serialNumber) async {
    try {
      final response = await _dio.get('devices/$serialNumber/playlist');
      if (response.statusCode == 200) {
        return Map<String, dynamic>.from(response.data);
      }
      throw Exception('Failed to fetch device playlist: Status ${response.statusCode}');
    } catch (e) {
      debugPrint('AdMeshApiService: Failed to fetch device playlist: $e');
      rethrow;
    }
  }

  /// Downloads a video file directly to the local storage using Dio.
  /// Provides progress callbacks for monitoring downloads.
  Future<File> downloadVideo({
    required String videoUrl,
    required String saveDirectory,
    required String filename,
    required String expectedChecksum,
    void Function(int received, int total)? onProgress,
  }) async {
    final savePath = p.join(saveDirectory, filename);
    final tempPath = '$savePath.tmp';

    try {
      // 1. Download file to a temporary location first
      await _dio.download(
        videoUrl,
        tempPath,
        onReceiveProgress: onProgress,
        options: Options(
          responseType: ResponseType.bytes,
          followRedirects: true,
        ),
      );

      final tempFile = File(tempPath);

      // 2. Validar MD5 para garantizar integridad y seguridad del archivo
      final checksumValid = await _verifyMD5(tempFile, expectedChecksum);
      if (!checksumValid) {
        if (await tempFile.exists()) {
          await tempFile.delete();
        }
        throw Exception('MD5 checksum validation failed for $filename');
      }

      // 3. Rename temporary file to final path upon success
      final finalFile = await tempFile.rename(savePath);
      return finalFile;
    } catch (e) {
      debugPrint('AdMeshApiService: Download failed for $filename: $e');
      // Clean up temp files if they exist
      final tempFile = File(tempPath);
      if (await tempFile.exists()) {
        await tempFile.delete().catchError((_) => tempFile);
      }
      rethrow;
    }
  }

  /// Helper to calculate and verify MD5 checksum of a file
  Future<bool> _verifyMD5(File file, String expectedMd5) async {
    try {
      if (!await file.exists()) return false;
      final bytes = await file.readAsBytes();
      final digest = md5.convert(bytes);
      final calculatedMd5 = digest.toString().toLowerCase();
      return calculatedMd5 == expectedMd5.toLowerCase();
    } catch (e) {
      debugPrint('AdMeshApiService: Error verifying MD5: $e');
      return false;
    }
  }
}
