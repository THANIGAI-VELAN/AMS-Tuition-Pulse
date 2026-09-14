import React, { useState, useEffect } from 'react'
import { Header } from '../components/layout/Header'
import { NavigationBar } from '../components/layout/NavigationBar'
import { fetchAllNotifications, processPendingNotifications, getCachedNotifications } from '../services/notificationService'
import { NotificationRecord, NotificationStatus } from '../types/database.types'
import { Bell, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, Send, ShieldCheck } from 'lucide-react'
import { format } from 'date-fns'

export const NotificationHistory: React.FC = () => {
  // 1. Instant Cache Init (0ms)
  const [notifications, setNotifications] = useState<NotificationRecord[]>(() => getCachedNotifications())
  const [filter, setFilter] = useState<string>('All')
  const [loading, setLoading] = useState(() => getCachedNotifications().length === 0)
  const [processing, setProcessing] = useState(false)

  const loadNotifications = async () => {
    try {
      const data = await fetchAllNotifications()
      setNotifications(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()

    const handleUpdate = () => {
      setNotifications(getCachedNotifications())
    }

    window.addEventListener('sp_notifications_updated', handleUpdate)
    const interval = setInterval(() => {
      setNotifications(getCachedNotifications())
    }, 3000)

    return () => {
      window.removeEventListener('sp_notifications_updated', handleUpdate)
      clearInterval(interval)
    }
  }, [])

  const handleTriggerRecheck = async () => {
    setProcessing(true)
    await processPendingNotifications()
    await loadNotifications()
    setProcessing(false)
  }

  const filteredNotifs = notifications.filter(n => {
    if (filter === 'All') return true
    return n.status === filter
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 max-w-md mx-auto relative">
      <Header title="SP Academy" subtitle="WhatsApp Notification Center" />

      <main className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Parent Dispatch Log</h2>
            <p className="text-xs text-slate-400 font-medium">WhatsApp notifications tracking</p>
          </div>

          <button
            disabled={processing}
            onClick={handleTriggerRecheck}
            className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold px-3 py-2 rounded-xl flex items-center space-x-1.5 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${processing ? 'animate-spin' : ''}`} />
            <span>{processing ? 'Processing...' : 'Run Re-Check'}</span>
          </button>
        </div>

        <div className="flex items-center space-x-1.5 border-b border-slate-800 pb-2 overflow-x-auto">
          {['All', 'Pending', 'Sent', 'Cancelled', 'Failed'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filter === status
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">Loading notification logs...</div>
        ) : filteredNotifs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">No notifications in category '{filter}'</div>
        ) : (
          <div className="space-y-3">
            {filteredNotifs.map((n) => {
              const studentName = n.students?.name || 'Student'
              const className = n.students?.class_name || 'Class'
              const parentPhone = n.parent_phone

              let statusBg = 'bg-slate-800 text-slate-300 border-slate-700'
              let StatusIcon = Clock

              if (n.status === 'Pending') {
                statusBg = 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                StatusIcon = Clock
              } else if (n.status === 'Sent') {
                statusBg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                StatusIcon = CheckCircle2
              } else if (n.status === 'Cancelled') {
                statusBg = 'bg-slate-800 text-slate-400 border-slate-700'
                StatusIcon = XCircle
              } else if (n.status === 'Failed') {
                statusBg = 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                StatusIcon = AlertCircle
              }

              return (
                <div
                  key={n.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-sm text-white">{studentName}</h3>
                        <span className="text-xs text-slate-400">({className})</span>
                      </div>
                      <p className="text-xs text-slate-400">Parent: {parentPhone}</p>
                    </div>

                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center space-x-1 ${statusBg}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span>{n.status}</span>
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Scheduled Window:</span>
                      <span className="font-medium text-slate-300">
                        {format(new Date(n.scheduled_at), 'dd MMM yyyy • hh:mm a')}
                      </span>
                    </div>

                    {n.provider_message_id && (
                      <div className="flex items-center justify-between">
                        <span>WhatsApp Msg ID:</span>
                        <span className="font-mono text-emerald-400 text-[10px]">{n.provider_message_id}</span>
                      </div>
                    )}

                    {n.failure_reason && (
                      <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-[10px] mt-1">
                        Failure Reason: {n.failure_reason}
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-end space-x-2">
                      <a
                        href={`https://wa.me/${n.parent_phone.replace(/[^0-9]/g, '').length === 10 ? `91${n.parent_phone.replace(/[^0-9]/g, '')}` : n.parent_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`வணக்கம்,

📌 *SP Academy டியூஷன் மையம் அறிவிப்பு:*
உங்கள் பிள்ளை *${studentName}* (${className}) டியூஷன் வகுப்புக்கு வரவில்லை (*ABSENT*).

நன்றி,
*SP Academy நிர்வாகம்*`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 text-[11px] font-bold flex items-center space-x-1.5 transition-all"
                      >
                        <Send className="w-3 h-3" />
                        <span>Send WhatsApp (தமிழ்)</span>
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <NavigationBar />
    </div>
  )
}
