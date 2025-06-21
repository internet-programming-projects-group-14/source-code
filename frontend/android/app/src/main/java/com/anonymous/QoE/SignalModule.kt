package com.anonymous.QoE

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.*
import androidx.core.app.ActivityCompat
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
            // Check permissions first
            if (!hasRequiredPermissions()) {
                promise.reject("PERMISSION_ERROR", "Required permissions not granted")
                return
            }

            val telephonyManager = reactContext.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
            val result = Arguments.createMap()

            // Get carrier information
            getCarrierInfo(telephonyManager, result)
            
            // Get network info
            getNetworkInfo(telephonyManager, result)
            
            // Get cell info
            getCellInfo(telephonyManager, result)

            promise.resolve(result)
        } catch (e: SecurityException) {
            promise.reject("PERMISSION_ERROR", "Security exception: ${e.message}")
        } catch (e: Exception) {
            promise.reject("ERROR", "Error getting network metrics: ${e.message}")
        }
    }

    private fun hasRequiredPermissions(): Boolean {
        val permissions = arrayOf(
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.READ_PHONE_STATE
        )
        
        return permissions.all { permission ->
            ActivityCompat.checkSelfPermission(reactContext, permission) == PackageManager.PERMISSION_GRANTED
        }
    }

    private fun getCarrierInfo(telephonyManager: TelephonyManager, result: WritableMap) {
        try {
            // Carrier name
            val carrierName = telephonyManager.networkOperatorName
            if (carrierName.isNotEmpty()) {
                result.putString("carrierName", carrierName)
            }

            // MCC+MNC (Mobile Country Code + Mobile Network Code)
            val networkOperator = telephonyManager.networkOperator
            if (networkOperator.isNotEmpty() && networkOperator.length >= 5) {
                val mcc = networkOperator.substring(0, 3)
                val mnc = networkOperator.substring(3)
                result.putString("mcc", mcc)
                result.putString("mnc", mnc)
                result.putString("networkOperator", networkOperator)
            }

            // SIM carrier info
            val simOperatorName = telephonyManager.simOperatorName
            if (simOperatorName.isNotEmpty()) {
                result.putString("simCarrierName", simOperatorName)
            }

            val simOperator = telephonyManager.simOperator
            if (simOperator.isNotEmpty() && simOperator.length >= 5) {
                val simMcc = simOperator.substring(0, 3)
                val simMnc = simOperator.substring(3)
                result.putString("simMcc", simMcc)
                result.putString("simMnc", simMnc)
            }
        } catch (e: Exception) {
            // Don't fail the entire request if carrier info fails
            result.putString("carrierError", e.message)
        }
    }

    private fun getNetworkInfo(telephonyManager: TelephonyManager, result: WritableMap) {
        try {
            // Network type
            val networkType = telephonyManager.networkType
            result.putString("networkType", getNetworkTypeString(networkType))
            result.putInt("networkTypeCode", networkType)

            // Data network type
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                val dataNetworkType = telephonyManager.dataNetworkType
                result.putString("dataNetworkType", getNetworkTypeString(dataNetworkType))
            }

            // Roaming status
            result.putBoolean("isRoaming", telephonyManager.isNetworkRoaming)

            // Phone type
            result.putString("phoneType", getPhoneTypeString(telephonyManager.phoneType))
        } catch (e: Exception) {
            result.putString("networkInfoError", e.message)
        }
    }

    private fun getCellInfo(telephonyManager: TelephonyManager, result: WritableMap) {
        try {
            val cellInfoList = telephonyManager.allCellInfo
            val cellInfoArray = Arguments.createArray()

            if (!cellInfoList.isNullOrEmpty()) {
                for (cellInfo in cellInfoList) {
                    val cellData = Arguments.createMap()
                    
                    cellData.putBoolean("isRegistered", cellInfo.isRegistered)
                    cellData.putLong("timestamp", cellInfo.timeStamp)

                    when (cellInfo) {
                        is CellInfoLte -> {
                            processCellInfoLte(cellInfo, cellData)
                        }
                        is CellInfoGsm -> {
                            processCellInfoGsm(cellInfo, cellData)
                        }
                        is CellInfoWcdma -> {
                            processCellInfoWcdma(cellInfo, cellData)
                        }
                        is CellInfoCdma -> {
                            processCellInfoCdma(cellInfo, cellData)
                        }
                        else -> {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                when (cellInfo) {
                                    is CellInfoNr -> {
                                        processCellInfoNr(cellInfo, cellData)
                                    }
                                    is CellInfoTdscdma -> {
                                        processCellInfoTdscdma(cellInfo, cellData)
                                    }
                                }
                            }
                        }
                    }
                    
                    cellInfoArray.pushMap(cellData)
                }
            }

            result.putArray("cellInfo", cellInfoArray)
        } catch (e: Exception) {
            result.putString("cellInfoError", e.message)
        }
    }

    private fun processCellInfoLte(cellInfo: CellInfoLte, cellData: WritableMap) {
        val identity = cellInfo.cellIdentity
        val strength = cellInfo.cellSignalStrength

        cellData.putString("type", "LTE")
        cellData.putInt("signalStrength", strength.dbm)
        cellData.putInt("pci", identity.pci)
        cellData.putInt("cellId", identity.ci)
        cellData.putInt("tac", identity.tac)
        cellData.putInt("earfcn", identity.earfcn)
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            cellData.putInt("bandwidth", identity.bandwidth)
        }
        
        // Additional LTE signal metrics
        cellData.putInt("rsrp", strength.rsrp)
        cellData.putInt("rsrq", strength.rsrq)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            cellData.putInt("rssnr", strength.rssnr)
            cellData.putInt("cqi", strength.cqi)
        }
        cellData.putInt("timingAdvance", strength.timingAdvance)
    }

    private fun processCellInfoGsm(cellInfo: CellInfoGsm, cellData: WritableMap) {
        val identity = cellInfo.cellIdentity
        val strength = cellInfo.cellSignalStrength

        cellData.putString("type", "GSM")
        cellData.putInt("signalStrength", strength.dbm)
        cellData.putInt("cid", identity.cid)
        cellData.putInt("lac", identity.lac)
        cellData.putInt("arfcn", identity.arfcn)
        cellData.putInt("bsic", identity.bsic)
    }

    private fun processCellInfoWcdma(cellInfo: CellInfoWcdma, cellData: WritableMap) {
        val identity = cellInfo.cellIdentity
        val strength = cellInfo.cellSignalStrength

        cellData.putString("type", "WCDMA")
        cellData.putInt("signalStrength", strength.dbm)
        cellData.putInt("cid", identity.cid)
        cellData.putInt("lac", identity.lac)
        cellData.putInt("psc", identity.psc)
        cellData.putInt("uarfcn", identity.uarfcn)
    }

    private fun processCellInfoCdma(cellInfo: CellInfoCdma, cellData: WritableMap) {
        val identity = cellInfo.cellIdentity
        val strength = cellInfo.cellSignalStrength

        cellData.putString("type", "CDMA")
        cellData.putInt("signalStrength", strength.dbm)
        cellData.putInt("basestationId", identity.basestationId)
        cellData.putInt("networkId", identity.networkId)
        cellData.putInt("systemId", identity.systemId)
        cellData.putInt("cdmaDbm", strength.cdmaDbm)
        cellData.putInt("cdmaEcio", strength.cdmaEcio)
        cellData.putInt("evdoDbm", strength.evdoDbm)
        cellData.putInt("evdoEcio", strength.evdoEcio)
        cellData.putInt("evdoSnr", strength.evdoSnr)
    }

    private fun processCellInfoNr(cellInfo: CellInfoNr, cellData: WritableMap) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val identity = cellInfo.cellIdentity as CellIdentityNr
            val strength = cellInfo.cellSignalStrength as CellSignalStrengthNr

            cellData.putString("type", "5G_NR")
            cellData.putInt("signalStrength", strength.dbm)
            cellData.putInt("pci", identity.pci)
            cellData.putInt("tac", identity.tac)
            cellData.putLong("nci", identity.nci)
            cellData.putInt("nrarfcn", identity.nrarfcn)
            
            // 5G specific metrics
            cellData.putInt("ssRsrp", strength.ssRsrp)
            cellData.putInt("ssRsrq", strength.ssRsrq)
            cellData.putInt("ssSinr", strength.ssSinr)
            cellData.putInt("csiRsrp", strength.csiRsrp)
            cellData.putInt("csiRsrq", strength.csiRsrq)
            cellData.putInt("csiSinr", strength.csiSinr)
        }
    }

    private fun processCellInfoTdscdma(cellInfo: CellInfoTdscdma, cellData: WritableMap) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val identity = cellInfo.cellIdentity as CellIdentityTdscdma
            val strength = cellInfo.cellSignalStrength as CellSignalStrengthTdscdma

            cellData.putString("type", "TDSCDMA")
            cellData.putInt("signalStrength", strength.dbm)
            cellData.putInt("cid", identity.cid)
            cellData.putInt("lac", identity.lac)
            cellData.putInt("cpid", identity.cpid)
            cellData.putInt("uarfcn", identity.uarfcn)
        }
    }

    private fun getNetworkTypeString(networkType: Int): String {
        return when (networkType) {
            TelephonyManager.NETWORK_TYPE_GPRS -> "GPRS"
            TelephonyManager.NETWORK_TYPE_EDGE -> "EDGE"
            TelephonyManager.NETWORK_TYPE_UMTS -> "UMTS"
            TelephonyManager.NETWORK_TYPE_CDMA -> "CDMA"
            TelephonyManager.NETWORK_TYPE_EVDO_0 -> "EVDO_0"
            TelephonyManager.NETWORK_TYPE_EVDO_A -> "EVDO_A"
            TelephonyManager.NETWORK_TYPE_1xRTT -> "1xRTT"
            TelephonyManager.NETWORK_TYPE_HSDPA -> "HSDPA"
            TelephonyManager.NETWORK_TYPE_HSUPA -> "HSUPA"
            TelephonyManager.NETWORK_TYPE_HSPA -> "HSPA"
            TelephonyManager.NETWORK_TYPE_IDEN -> "IDEN"
            TelephonyManager.NETWORK_TYPE_EVDO_B -> "EVDO_B"
            TelephonyManager.NETWORK_TYPE_LTE -> "LTE"
            TelephonyManager.NETWORK_TYPE_EHRPD -> "EHRPD"
            TelephonyManager.NETWORK_TYPE_HSPAP -> "HSPAP"
            TelephonyManager.NETWORK_TYPE_GSM -> "GSM"
            TelephonyManager.NETWORK_TYPE_TD_SCDMA -> "TD_SCDMA"
            TelephonyManager.NETWORK_TYPE_IWLAN -> "IWLAN"
            else -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    when (networkType) {
                        TelephonyManager.NETWORK_TYPE_NR -> "5G_NR"
                        else -> "UNKNOWN_$networkType"
                    }
                } else {
                    "UNKNOWN_$networkType"
                }
            }
        }
    }

    private fun getPhoneTypeString(phoneType: Int): String {
        return when (phoneType) {
            TelephonyManager.PHONE_TYPE_NONE -> "NONE"
            TelephonyManager.PHONE_TYPE_GSM -> "GSM"
            TelephonyManager.PHONE_TYPE_CDMA -> "CDMA"
            TelephonyManager.PHONE_TYPE_SIP -> "SIP"
            else -> "UNKNOWN"
        }
    }

    @ReactMethod
    fun requestPermissions(promise: Promise) {
        try {
            val currentActivity = currentActivity
            if (currentActivity != null) {
                val permissions = arrayOf(
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                    Manifest.permission.READ_PHONE_STATE
                )
                
                ActivityCompat.requestPermissions(currentActivity, permissions, 1001)
                promise.resolve("Permissions requested")
            } else {
                promise.reject("ERROR", "Current activity is null")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
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
