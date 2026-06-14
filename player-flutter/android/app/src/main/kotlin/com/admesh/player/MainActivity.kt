package com.admesh.player

import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.content.pm.PackageManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity: FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Mantener la pantalla encendida a nivel de ventana nativa
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        
        // Forzar modo inmersivo a nivel de sistema para ocultar barras de estado/navegación
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        )

        // Asegurar la fuente de video en dispositivos NovaStar
        ensureNovaVideoSource()
    }

    private fun ensureNovaVideoSource() {
        if (!isNovaStarDevice()) return
        
        Thread {
            try {
                val uri = android.net.Uri.parse("content://nova.priv.terminal.syssetting.provider.SystemInfoProvider/simpleDBTable")
                val contentResolver = contentResolver
                
                // Consultar valor actual para evitar escrituras innecesarias
                val projection = arrayOf("_value")
                val cursor = contentResolver.query(
                    uri,
                    projection,
                    "_identifier=?",
                    arrayOf("videoOutputSource"),
                    null
                )
                
                var currentValue: String? = null
                if (cursor != null) {
                    if (cursor.moveToFirst()) {
                        val index = cursor.getColumnIndex("_value")
                        if (index >= 0) {
                            currentValue = cursor.getString(index)
                        }
                    }
                    cursor.close()
                }
                
                android.util.Log.d("admesh-player", "NovaStar videoOutputSource valor actual: $currentValue")
                
                if (currentValue != "3") {
                    val values = android.content.ContentValues().apply {
                        put("_value", "3")
                    }
                    val rowsUpdated = contentResolver.update(
                        uri,
                        values,
                        "_identifier=?",
                        arrayOf("videoOutputSource")
                    )
                    android.util.Log.d("admesh-player", "NovaStar videoOutputSource actualizado a 3, filas afectadas: $rowsUpdated")
                }
            } catch (e: Exception) {
                android.util.Log.e("admesh-player", "Error al configurar la fuente de video de NovaStar: ${e.message}", e)
            }
        }.start()
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "com.admesh.player/device")
            .setMethodCallHandler { call, result ->
                if (call.method == "isNovaStarDevice") {
                    result.success(isNovaStarDevice())
                } else {
                    result.notImplemented()
                }
            }
    }

    private fun isNovaStarDevice(): Boolean {
        return try {
            packageManager.getPackageInfo("nova.priv.terminal.syssetting", 0)
            true
        } catch (e: PackageManager.NameNotFoundException) {
            false
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            )
        } else {
            // Si perdemos el foco (la app de Nova intenta ponerse encima), nos volvemos a traer al frente
            try {
                val intent = android.content.Intent(this, MainActivity::class.java)
                intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                startActivity(intent)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}

