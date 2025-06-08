package com.anonymous.QoE

import android.content.Context
import android.telephony.CellInfo
import android.telephony.CellInfoLte
import android.telephony.TelephonyManager
import com.facebook.react.bridge.*
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class SignalModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String {
    return "SignalModule"
  }

  @ReactMethod
  fun getNetworkMetrics(promise: Promise) {
    try {
      val telephonyManager = reactContext.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
      val cellInfoList = telephonyManager.allCellInfo

      val result = Arguments.createMap()

      if (!cellInfoList.isNullOrEmpty()) {
        val info: CellInfo = cellInfoList[0]

        if (info is CellInfoLte) {
          val identity = info.cellIdentity
          val strength = info.cellSignalStrength

          result.putInt("signalStrength", strength.dbm)
          result.putInt("pci", identity.pci)
          result.putInt("cellId", identity.ci)
          result.putInt("frequency", identity.earfcn)
          result.putString("type", "LTE")
        }
      }

      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("ERROR", e)
    }
  }
}




class MyAppPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(SignalModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
