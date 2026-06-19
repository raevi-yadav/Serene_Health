package com.serene.healthtracker

import android.app.Activity
import android.os.Bundle

class PermissionsRationaleActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // This activity handles the rationals display. In a complete application,
        // you would describe how read permissions for step counts and active calories burned
        // are used to calculate user achievements. We finish directly here as requested
        // to simplify flow compliance.
        finish()
    }
}
