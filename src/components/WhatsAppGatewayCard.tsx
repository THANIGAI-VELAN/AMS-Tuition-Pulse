import React, { useState, useEffect } from 'react'
import {
  QrCode,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Smartphone,
  KeyRound,
  Copy,
  Check,
  ExternalLink,
  Phone
} from 'lucide-react'
import {
  getWhatsAppGatewayStatus,
  getWhatsAppQrCode,
  getWhatsAppPairingCode,
  resetWhatsAppGatewaySession,
  GatewayStatusResponse,
  getEffectiveGatewayUrl,
  DEFAULT_GATEWAY_URL,
  LOCAL_GATEWAY_URL
} from '../services/notificationService'

export const WhatsAppGatewayCard: React.FC = () => {
  const [gatewayUrl, setGatewayUrl] = useState<string>(() => getEffectiveGatewayUrl())
  const [statusInfo, setStatusInfo] = useState<GatewayStatusResponse>({ status: 'DISCONNECTED' })
  const [loading, setLoading] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<'pairing' | 'qr'>('pairing')
  
  // Pairing Code States
  const [adminPhone, setAdminPhone] = useState<string>(() => localStorage.getItem('ADMIN_WA_PHONE') || '')
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [formattedPhone, setFormattedPhone] = useState<string>('')
  const [copied, setCopied] = useState<boolean>(false)
  const [timeLeft, setTimeLeft] = useState<number>(60)

  // QR Code States
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [showQrModal, setShowQrModal] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')

  // 120-Second Countdown Timer for WhatsApp Pairing Codes
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (pairingCode && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [pairingCode, timeLeft])

  const checkStatus = async () => {
    setLoading(true)
    const res = await getWhatsAppGatewayStatus(gatewayUrl)
    setStatusInfo(res)
    setLoading(false)
  }

  useEffect(() => {
    checkStatus()
  }, [gatewayUrl])

  // Active Auto-Polling while user is entering code in WhatsApp
  useEffect(() => {
    let pollInterval: NodeJS.Timeout
    if (pairingCode || statusInfo.status === 'CONNECTING') {
      pollInterval = setInterval(async () => {
        const res = await getWhatsAppGatewayStatus(gatewayUrl)
        if (res.status === 'CONNECTED') {
          setStatusInfo(res)
          setPairingCode(null)
          setMessage('🎉 WhatsApp linked successfully! Automated absence alerts are active.')
        } else {
          setStatusInfo(res)
        }
      }, 2500)
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [pairingCode, statusInfo.status, gatewayUrl])

  const handleSaveUrl = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setGatewayUrl(val)
    localStorage.setItem('WHATSAPP_GATEWAY_URL', val)
  }

  const handleSelectPresetUrl = (url: string) => {
    setGatewayUrl(url)
    localStorage.setItem('WHATSAPP_GATEWAY_URL', url)
  }

  const normalizedPhonePreview = (() => {
    let clean = adminPhone.replace(/[^0-9]/g, '')
    while (clean.startsWith('0')) clean = clean.substring(1)
    if (!clean) return ''
    if (clean.length === 10) return `+91 ${clean}`
    if (clean.startsWith('91') && clean.length === 12) return `+91 ${clean.substring(2)}`
    return `+${clean}`
  })()

  // Handle Pairing Code Generation (Single-Device on Phone)
  const handleGeneratePairingCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!adminPhone.trim()) {
      setMessage('Please enter the Admin WhatsApp phone number.')
      return
    }

    localStorage.setItem('ADMIN_WA_PHONE', adminPhone.trim())
    setLoading(true)
    setMessage('Initializing clean gateway socket & requesting 8-digit pairing code...')
    setPairingCode(null)
    setTimeLeft(120)

    const res = await getWhatsAppPairingCode(gatewayUrl, adminPhone.trim())
    setLoading(false)

    if (res.pairingCode) {
      setPairingCode(res.pairingCode)
      setFormattedPhone(res.pairingCode)
      setTimeLeft(120)
      setMessage('Pairing code generated! Follow the 3 steps below in WhatsApp.')
    } else if (res.status === 'CONNECTED') {
      checkStatus()
      setMessage('WhatsApp is ALREADY connected!')
    } else {
      setMessage(res.error || res.message || 'Failed to generate pairing code. Ensure gateway server is running.')
    }
  }

  const handleCopyCode = async () => {
    if (!pairingCode) return
    const plainCode = pairingCode.replace(/[^a-zA-Z0-9]/g, '')
    await navigator.clipboard.writeText(plainCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  // Handle QR Code Fetch (Desktop / 2-Device Mode)
  const handleFetchQr = async () => {
    setLoading(true)
    setMessage('Connecting to WhatsApp Gateway for QR...')
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
    setMessage('Resetting session & clearing auth keys...')
    setPairingCode(null)
    await resetWhatsAppGatewaySession(gatewayUrl)
    setLoading(false)
    setMessage('Session cleared. You can now request a fresh pairing code.')
    setTimeout(() => {
      checkStatus()
    }, 1500)
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
      {/* Header */}
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

      {/* Gateway Status Box */}
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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] text-slate-400 font-medium">Gateway Service URL:</label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleSelectPresetUrl(DEFAULT_GATEWAY_URL)}
                className={`text-[10px] px-2 py-0.5 rounded-lg font-semibold transition-all ${
                  gatewayUrl === DEFAULT_GATEWAY_URL
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                }`}
              >
                Render Cloud
              </button>
              <button
                type="button"
                onClick={() => handleSelectPresetUrl(LOCAL_GATEWAY_URL)}
                className={`text-[10px] px-2 py-0.5 rounded-lg font-semibold transition-all ${
                  gatewayUrl === LOCAL_GATEWAY_URL
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                }`}
              >
                Localhost (3001)
              </button>
            </div>
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

      {/* Connection Mode Selection */}
      {statusInfo.status !== 'CONNECTED' ? (
        <div className="space-y-3">
          {/* Tabs */}
          <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('pairing')}
              className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === 'pairing'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Same Phone (Code)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('qr')}
              className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === 'qr'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>From PC (Scan QR)</span>
            </button>
          </div>

          {/* Tab 1: Same Phone Pairing Code */}
          {activeTab === 'pairing' && (
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Phone className="w-3 h-3 text-emerald-400" />
                  <span>Enter Admin WhatsApp Number</span>
                </label>
                <p className="text-[10px] text-slate-400">
                  No camera or second device required. Generate an 8-character code and paste it inside your WhatsApp.
                </p>
              </div>

              <form onSubmit={handleGeneratePairingCode} className="space-y-2">
                <div>
                  <input
                    type="tel"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    placeholder="e.g. 9876543210 or 919876543210"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  {normalizedPhonePreview && (
                    <div className="flex items-center justify-between mt-1 px-1 text-[10px] text-slate-400">
                      <span>Linking WhatsApp as:</span>
                      <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        {normalizedPhonePreview}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !adminPhone.trim()}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.99]"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{loading ? 'Requesting Code from WhatsApp...' : 'Get 8-Digit Pairing Code'}</span>
                </button>
              </form>

              {/* Pairing Code Display Box */}
              {pairingCode && (
                <div className="mt-3 p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl space-y-3 animate-in fade-in duration-300">
                  <div className="text-center space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold tracking-wider text-emerald-400 uppercase flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                        <span>Waiting for WhatsApp Link</span>
                      </span>
                      <span className={`font-mono font-bold ${timeLeft < 20 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}>
                        ⏱️ Valid for {timeLeft}s
                      </span>
                    </div>

                    <div className="text-2xl font-mono font-black text-white tracking-widest bg-slate-900/90 py-2.5 px-4 rounded-xl border border-emerald-500/40 select-all">
                      {pairingCode}
                    </div>

                    {timeLeft === 0 ? (
                      <p className="text-[11px] text-rose-400 font-semibold pt-1">
                        ⚠️ Code expired! WhatsApp pairing codes expire after 2 minutes.
                      </p>
                    ) : (
                      <p className="text-[10px] text-emerald-300/80 pt-0.5">
                        App is actively listening — as soon as you enter this code, screen will auto-connect!
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      disabled={timeLeft === 0}
                      className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-emerald-300 font-bold py-2 rounded-xl text-[11px] flex items-center justify-center space-x-1.5 transition-all"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied Code!' : 'Copy Code'}</span>
                    </button>

                    <a
                      href="whatsapp://app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-[11px] flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open WhatsApp</span>
                    </a>
                  </div>

                  {/* Step by step guide */}
                  <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/80 text-[10px] text-slate-300 space-y-1">
                    <p className="font-bold text-emerald-400">📲 3 Steps on this phone:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-slate-400">
                      <li>Tap <strong className="text-white">Copy Code</strong> above</li>
                      <li>Open <strong className="text-white">WhatsApp &gt; Linked Devices &gt; Link a Device</strong></li>
                      <li>Tap <strong className="text-emerald-300">"Link with phone number instead"</strong> &amp; paste code</li>
                    </ol>
                  </div>

                  {timeLeft === 0 ? (
                    <button
                      type="button"
                      onClick={() => handleGeneratePairingCode()}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-[11px] transition-all"
                    >
                      Get New Fresh Code
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResetSession}
                      className="w-full text-center text-[10px] text-slate-400 hover:text-amber-400 pt-1 underline"
                    >
                      Got "Couldn't link device"? Click here to reset session &amp; retry
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Desktop QR Code Mode */}
          {activeTab === 'qr' && (
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                If you are using this app on a laptop, tablet, or desktop monitor, generate a QR code to scan with your phone's camera.
              </p>

              <button
                type="button"
                onClick={handleFetchQr}
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 transition-all"
              >
                <QrCode className="w-4 h-4" />
                <span>{loading ? 'Generating QR...' : 'Show QR Code on Screen'}</span>
              </button>
            </div>
          )}

          {/* Reset / Unlink Button */}
          <button
            onClick={handleResetSession}
            disabled={loading}
            className="w-full bg-slate-800/60 hover:bg-slate-800 text-amber-400/80 hover:text-amber-400 font-medium py-2 rounded-xl text-[11px] flex items-center justify-center space-x-1 transition-all border border-slate-800"
          >
            <span>Need a Fresh Pairing Session? Reset Gateway</span>
          </button>
        </div>
      ) : (
        /* Connected State */
        <div className="space-y-2">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-medium flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>Admin WhatsApp number is paired! Automated absent alerts will dispatch after 30s.</span>
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

      {/* QR Code Scanner Modal (Desktop flow) */}
      {showQrModal && qrCodeDataUrl && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-white">Scan with WhatsApp Camera</h3>
            <p className="text-xs text-slate-400">
              WhatsApp on Phone → Linked Devices → Link a Device → Scan QR below:
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
