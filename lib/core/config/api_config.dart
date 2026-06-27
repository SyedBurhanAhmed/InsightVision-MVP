import 'dart:io';

import 'package:flutter/foundation.dart';

/// Base URL for the InsightVision API.
///
/// - Android emulator: `10.0.2.2` maps to your PC's localhost.
/// - Physical device: set [deviceHostOverride] to your PC's LAN IP (e.g. `192.168.1.5`).
class ApiConfig {
  /// Set this when testing on a physical phone (same Wi‑Fi as your PC).
  static const String? deviceHostOverride = null;

  static String get baseUrl {
    const port = 3000;
    if (deviceHostOverride != null && deviceHostOverride!.isNotEmpty) {
      return 'http://$deviceHostOverride:$port';
    }
    if (kIsWeb) {
      return 'http://localhost:$port';
    }
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:$port';
    }
    return 'http://127.0.0.1:$port';
  }
}
