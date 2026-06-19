package com.serene.healthtracker

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

@CapacitorPlugin(name = "HealthConnect")
class HealthConnectPlugin : Plugin() {

    private val scope = CoroutineScope(Dispatchers.Main)

    /**
     * Checks if the Health Connect SDK is supported/installed on the device.
     */
    @PluginMethod
    fun checkStatus(call: PluginCall) {
        val result = JSObject()
        try {
            val status = HealthConnectManager.checkHealthConnectStatus(context)
            result.put("status", status.name)
            result.put("isAvailable", status == SdkStatus.AVAILABLE)
            result.put("updateRequired", status == SdkStatus.PROVIDER_UPDATE_REQUIRED)
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("Failed to check Health Connect status: ${e.message}", e)
        }
    }

    /**
     * Verifies if permissions are granted. Resolves false with direct advice if not.
     */
    @PluginMethod
    fun checkAndRequestPermissions(call: PluginCall) {
        scope.launch {
            try {
                val isGranted = HealthConnectManager.hasAllPermissions(context)
                val result = JSObject()
                result.put("granted", isGranted)
                if (!isGranted) {
                    // Provide the intent action name to launch permissions settings activity in Android
                    result.put("intentAction", "androidx.health.connect.action.MANAGE_HEALTH_PERMISSIONS")
                }
                call.resolve(result)
            } catch (e: Exception) {
                call.reject("Failed check/request flow: ${e.message}", e)
            }
        }
    }

    /**
     * Queries step count and calorie burned parameters matching walking/running exercise slots.
     */
    @PluginMethod
    fun queryWalkingJoggingMetrics(call: PluginCall) {
        val dateString = call.getString("date") // Optional ISO format e.g. "2026-06-19"
        
        scope.launch {
            try {
                val zoneId = ZoneId.systemDefault()
                val targetDate = if (dateString != null) {
                    LocalDate.parse(dateString)
                } else {
                    LocalDate.now(zoneId)
                }

                val startOfDay = targetDate.atStartOfDay(zoneId).toInstant()
                val endOfDay = targetDate.plusDays(1).atStartOfDay(zoneId).toInstant()

                val (steps, calories) = HealthConnectManager.readWalkingJoggingData(
                    context,
                    startOfDay,
                    endOfDay
                )

                val result = JSObject()
                result.put("date", targetDate.toString())
                result.put("steps", steps)
                result.put("calories", calories)

                call.resolve(result)
            } catch (e: Exception) {
                call.reject("Failed to read walking/jogging metrics from Health Connect: ${e.message}", e)
            }
        }
    }
}
