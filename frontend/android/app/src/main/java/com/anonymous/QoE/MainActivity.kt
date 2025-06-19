package com.anonymous.QoE
import expo.modules.splashscreen.SplashScreenManager

import android.os.Build
import android.os.Bundle
import android.content.Intent // <-- Add this import

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  // Add this property
  private var pendingIntent: Intent? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    SplashScreenManager.registerOnActivity(this)
    super.onCreate(null)
  }

  override fun getMainComponentName(): String = "main"

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              super.invokeDefaultOnBackPressed()
          }
          return
      }
      super.invokeDefaultOnBackPressed()
  }

  override fun onNewIntent(intent: Intent?) {
      super.onNewIntent(intent)

      // Get the ReactInstanceManager
      val reactInstanceManager = (application as? com.facebook.react.ReactApplication)
          ?.reactNativeHost
          ?.reactInstanceManager

      if (reactInstanceManager?.hasStartedCreatingInitialContext() == true) {
          setIntent(intent)
      } else {
          pendingIntent = intent
      }
  }
}
