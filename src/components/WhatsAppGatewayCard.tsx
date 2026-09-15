import React, { useState, useEffect } from 'react'
import { QrCode, RefreshCw, CheckCircle, AlertCircle, Smartphone } from 'lucide-react'
import { getWhatsAppGatewayStatus, getWhatsAppQrCode, resetWhatsAppGatewaySession, GatewayStatusResponse, getEffectiveGatewayUrl, DEFAULT_GATEWAY_URL } from '../services/notificationService'

export const WhatsAppGatewayCard: React.FC = () => {
  const [gatewayUrl, setGatewayUrl] = useState<string>(() => getEffectiveGatewayUrl())
  const [statusInfo, setStatusInfo] = useState<GatewayStatusResponse>({ status: 'DISCONNECTED' })
  const [loading, setLoading] = useState<boolean>(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [showQrModal, setShowQrModal] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')

  const checkStatus = async () => {
    setLoading(true)
    const res = await getWhatsAppGatewayStatus(gatewayUrl)
    setStatusInfo(res)
    setLoading(false)
  }

  useEffect(() => {
    checkStatus()
  }, [gatewayUrl])

  const handleSaveUrl = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setGatewayUrl(val)
    localStorage.setItem('WHATSAPP_GATEWAY_URL', val)
  }

  const handleFetchQr = async () => {
    setLoading(true)
    setMessage('Connecting to WhatsApp Gateway...')
    const res = await getWhatsAppQrCode(gatewayUrl)
    setLoading(false)

    if (res.qrDataUrl) {
      setQrCodeDataUrl(res.qrDataUrl)
      setShowQrModal(true)
      setMessage('')
    } else if (res.status === 'CONNECTED') {
      checkStatus()
      setMessage('WhatsApp is ALREADY connected!')
    } else {
      setMessage(res.message || 'Gateway offline. Start node server in whatsapp-gateway/')
    }
  }


  const handleResetSession = async () => {
    setLoading(true)
    setMessage('Resetting session & generating fresh QR code...')
    await resetWhatsAppGatewaySession(gatewayUrl)
    setLoading(false)
    setTimeout(() => {
      handleFetchQr()
    }, 2000)
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Personal WhatsApp Link</h3>
            <p className="text-xs text-slate-400">Method 2 Zero-Cost Gateway</p>
          </div>
        </div>

        <button
          onClick={checkStatus}
          disabled={loading}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
          title="Refresh Status"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Gateway Status:</span>
          <div className="flex items-center space-x-1.5">
            {statusInfo.status === 'CONNECTED' ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold text-emerald-400">Connected (+{statusInfo.connectedUser})</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold text-amber-400">Not Paired</span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] text-slate-400 font-medium">Gateway Service URL:</label>
            <button
              type="button"
              onClick={() => {
                setGatewayUrl(DEFAULT_GATEWAY_URL)
                localStorage.setItem('WHATSAPP_GATEWAY_URL', DEFAULT_GATEWAY_URL)
              }}
              className="text-[10px] text-emerald-400 hover:underline font-semibold"
            >
              Reset to Render Default
            </button>
          </div>
          <input
            type="text"
            value={gatewayUrl}
            onChange={handleSaveUrl}
            placeholder="https://tuition-pulse-gateway.onrender.com"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50 font-mono"
          />
        </div>
      </div>

      {statusInfo.status !== 'CONNECTED' ? (
        <div className="space-y-2">
          <button
            onClick={handleFetchQr}
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 transition-all"
          >
            <QrCode className="w-4 h-4" />
            <span>{loading ? 'Generating QR Code...' : 'Scan QR Code to Link Admin WhatsApp'}</span>
          </button>
          
          <button
            onClick={handleResetSession}
            disabled={loading}
            className="w-full bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold py-2 rounded-xl text-[11px] flex items-center justify-center space-x-1 transition-all"
          >
            <span>Unlinked Phone on Mobile? Reset Session & Get New QR</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-medium flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>Admin WhatsApp number is paired! Absent alerts will send automatically after 30 seconds.</span>
          </div>

          <button
            onClick={handleResetSession}
            disabled={loading}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 font-bold py-2 rounded-xl text-[11px] flex items-center justify-center space-x-1 transition-all"
          >
            <span>Unlink / Pair Different Phone Number</span>
          </button>
        </div>
      )}

      {message && <p className="text-[11px] text-amber-400 text-center font-medium">{message}</p>}


      {/* QR Code Scanner Modal */}
      {showQrModal && qrCodeDataUrl && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-white">Link Admin WhatsApp</h3>
            <p className="text-xs text-slate-400">
              Open WhatsApp on Admin Phone → Linked Devices → Link a Device → Scan QR below:
            </p>

            <div className="bg-white p-3 rounded-2xl inline-block shadow-inner">
              <img src={qrCodeDataUrl} alt="WhatsApp Gateway QR Code" className="w-48 h-48 mx-auto" />
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-xs transition-all"
            >
              Close Window
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
