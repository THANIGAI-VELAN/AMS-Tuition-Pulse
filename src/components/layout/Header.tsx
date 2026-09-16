import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertTriangle,
  Smartphone,
  ChevronRight,
  ShieldCheck,
  X,
  Zap
} from 'lucide-react'
import {
  getWhatsAppGatewayStatus,
  getEffectiveGatewayUrl,
  getLatestCachedGatewayStatus,
  GatewayStatusResponse
} from '../../services/notificationService'

interface HeaderProps {
  title?: string
  subtitle?: string
  isOnline?: boolean
  showBadge?: boolean
}

export const Header: React.FC<HeaderProps> = ({
  title = 'SP Academy',
  subtitle = 'Tuition Centre Attendance',
  isOnline = true,
  showBadge = true
}) => {
  const navigate = useNavigate()
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatusResponse>(() => getLatestCachedGatewayStatus())
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false)

  useEffect(() => {
    let isMounted = true

    // Initial check
    const checkGw = async () => {
      try {
        const url = getEffectiveGatewayUrl()
        const status = await getWhatsAppGatewayStatus(url)
        if (isMounted) setGatewayStatus(status)
      } catch {
        // Handled in notificationService
      }
    }

    checkGw()

    // Listen to real-time status updates broadcasted anywhere in the app
    const handleStatusUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<GatewayStatusResponse>
      if (customEvent.detail && isMounted) {
        setGatewayStatus(customEvent.detail)
      }
    }

    window.addEventListener('sp_gateway_status_updated', handleStatusUpdate)

    return () => {
      isMounted = false
      window.removeEventListener('sp_gateway_status_updated', handleStatusUpdate)
    }
  }, [])

  const isWaConnected = gatewayStatus.status === 'CONNECTED'

  return (
    <>
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 text-white">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/20 text-white">
              SP
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-base tracking-tight text-white">{title}</h1>
                {showBadge && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse mr-1"></span>
                    Live Roll Call
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Non-technical Status Pill (Clickable) */}
            <button
              type="button"
              onClick={() => setShowStatusModal(true)}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center space-x-1.5 transition-all shadow-sm ${
                isWaConnected
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25 animate-pulse'
              }`}
              title="Click to view App & WhatsApp Status"
            >
              {isWaConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>WA Ready</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>WA Not Linked</span>
                </>
              )}
            </button>

            {/* Network Wifi Icon */}
            <div
              className={`p-2 rounded-xl border text-xs flex items-center justify-center ${
                isOnline
                  ? 'bg-slate-800/80 border-slate-700 text-slate-300'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
              }`}
              title={isOnline ? 'Internet Connected' : 'No Internet Connection'}
            >
              {isOnline ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-rose-400" />}
            </div>
          </div>
        </div>
      </header>

      {/* Non-Technical Teacher System Health & Status Dialog */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm text-white">Application Health Check</h3>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Check if all systems are running properly to deliver automatic WhatsApp absence alerts to parents.
            </p>

            <div className="space-y-2.5">
              {/* WhatsApp Status Card */}
              <div
                className={`p-3 rounded-2xl border flex items-start space-x-3 ${
                  isWaConnected
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isWaConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 text-xs flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">WhatsApp Gateway</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isWaConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {isWaConnected ? 'CONNECTED' : 'NOT LINKED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {isWaConnected
                      ? `Admin WhatsApp is active (+${gatewayStatus.connectedUser || 'Admin'}). Absent alerts will dispatch automatically.`
                      : 'Your WhatsApp is not linked yet! Absent alerts will NOT reach parents until linked.'}
                  </p>
                </div>
              </div>

              {/* Internet Status */}
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start space-x-3 text-xs">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Wifi className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Internet Connection</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      ONLINE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Connected to cloud server for live student roll call and attendance sync.
                  </p>
                </div>
              </div>

              {/* 30s Auto Alert System */}
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start space-x-3 text-xs">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">30s Auto-Dispatch</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    When you submit attendance with absent students, messages automatically send 30 seconds later.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              {!isWaConnected && (
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusModal(false)
                    navigate('/settings')
                  }}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-600/20 transition-all"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Link WhatsApp on this Phone Now</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs transition-all"
              >
                Close Status
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
