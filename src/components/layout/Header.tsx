import React from 'react'
import { Bell, Sparkles, Wifi, WifiOff } from 'lucide-react'

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
  return (
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
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1"></span>
                  Live Roll Call
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className={`p-1.5 rounded-lg border text-xs flex items-center space-x-1 ${isOnline ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-amber-400" />}
          </div>
          <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full"></span>
          </div>
        </div>
      </div>
    </header>
  )
}

