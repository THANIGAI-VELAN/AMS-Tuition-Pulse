import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2, Clock, Send, Home, Bell, ChevronRight, ShieldAlert } from 'lucide-react'
import { format, differenceInSeconds } from 'date-fns'
import { processPendingNotifications } from '../services/notificationService'

export const AttendanceSuccess: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const state = location.state as {
    className?: string
    presentCount?: number
    absentCount?: number
    absentStudents?: string[]
    scheduledAtIso?: string
  } | null

  const className = state?.className || '12th'
  const presentCount = state?.presentCount ?? 26
  const absentCount = state?.absentCount ?? 2
  const absentStudents = state?.absentStudents || ['Priya S', 'Harini M']
  const scheduledAtIso = state?.scheduledAtIso || new Date(Date.now() + 30000).toISOString()

  const [secondsLeft, setSecondsLeft] = useState<number>(30)

  useEffect(() => {
    const target = new Date(scheduledAtIso)
    const update = () => {
      const diff = differenceInSeconds(target, new Date())
      const remaining = diff > 0 ? diff : 0
      setSecondsLeft(remaining)
      if (remaining === 0) {
        processPendingNotifications()
      }
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [scheduledAtIso])

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const formattedCountdown = `${mins}:${secs < 10 ? '0' : ''}${secs}`

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 max-w-md mx-auto flex flex-col justify-between">
      <div className="pt-8 text-center space-y-6">
        <div className="relative inline-flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40 flex items-center justify-center shadow-2xl shadow-emerald-500/30 animate-bounce">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <span className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white shadow-md">
            Live Sync
          </span>
        </div>

        <div className="space-y-1">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Roll Call Confirmed
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight pt-1">
            Attendance Recorded!
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            {className} Standard • {format(new Date(), 'dd MMMM yyyy')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <span className="text-3xl font-black text-emerald-400">{presentCount}</span>
            <p className="text-xs font-semibold text-slate-400 mt-1">Present</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <span className="text-3xl font-black text-rose-400">{absentCount}</span>
            <p className="text-xs font-semibold text-slate-400 mt-1">Absent</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-left space-y-3.5 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <Clock className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">30-Sec Dispatch Window</h3>
                <p className="text-[11px] text-slate-400">Automatic Cancel Window</p>
              </div>
            </div>

            <div className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              <span>{formattedCountdown}</span>
            </div>
          </div>

          <div className="space-y-2 text-xs border-t border-slate-800 pt-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>WhatsApp notification scheduled for:</span>
              <span className="font-bold text-slate-200">{format(new Date(scheduledAtIso), 'hh:mm:ss a')}</span>
            </div>

            {absentCount > 0 ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Pending Parents ({absentCount}):</span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 font-medium">
                    Pending Cancel
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {absentStudents.map((name, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-rose-300 border border-slate-700">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-emerald-400 text-xs font-semibold">No WhatsApp notifications scheduled (All present)</p>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Need to make a correction? Change status to <strong>Present</strong> in History while 30-sec window is active to automatically cancel WhatsApp dispatch.
            </p>
          </div>
        </div>
      </div>

      <div className="py-6 space-y-2.5">
        <button
          onClick={() => navigate('/')}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-blue-600/30 flex items-center justify-center space-x-2 transition-all active:scale-95"
        >
          <Home className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <button
          onClick={() => navigate('/notifications')}
          className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold py-3 rounded-2xl text-xs flex items-center justify-center space-x-1.5 transition-all"
        >
          <Bell className="w-4 h-4 text-blue-400" />
          <span>View Notification Status</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
