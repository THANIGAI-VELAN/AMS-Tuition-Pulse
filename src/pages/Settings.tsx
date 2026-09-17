import React, { useState, useEffect } from 'react'
import { Header } from '../components/layout/Header'
import { NavigationBar } from '../components/layout/NavigationBar'
import { WhatsAppGatewayCard } from '../components/WhatsAppGatewayCard'
import { ClassGroupsManagerCard } from '../components/ClassGroupsManagerCard'
import { useAuth } from '../context/AuthContext'
import { Download, LogOut, ShieldCheck, Smartphone, Database, CheckCircle2, Zap, Wifi } from 'lucide-react'

export const Settings: React.FC = () => {
  const { user, logout } = useAuth()
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handler)

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
      }
      setDeferredPrompt(null)
    } else {
      alert('To install SP Academy on Android Chrome, tap the browser menu (⋮) and select "Add to Home screen".')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 max-w-md mx-auto relative">
      <Header title="SP Academy" subtitle="Settings & Portal Config" />

      <main className="p-4 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex items-center space-x-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold text-lg flex items-center justify-center shadow-md">
            SP
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">SP Academy Admin</h3>
            <p className="text-xs text-slate-400">{user?.email || 'spracademy18@gmail.com'}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Educator Portal Administrator
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Progressive Web App (PWA)</h3>
              <p className="text-xs text-slate-400">Install to Home Screen for instant access</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="flex items-center justify-between text-white font-medium">
              <span>Status:</span>
              <span className={`font-bold text-xs ${isInstalled ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isInstalled ? 'Installed on Device' : 'Ready to Install'}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Standalone app mode supports Android Chrome full-screen experience and offline roll call caching.
            </p>
          </div>

          {!isInstalled && (
            <button
              onClick={handleInstallClick}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Add to Home Screen</span>
            </button>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl text-xs">
          <div className="flex items-center space-x-2 text-white font-bold">
            <Database className="w-4 h-4 text-blue-400" />
            <span>Database & Cloud Architecture</span>
          </div>

          <div className="space-y-2 text-slate-300">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Backend Database</span>
              <span className="font-medium">Supabase PostgreSQL + RLS</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Scheduled Worker</span>
              <span className="font-medium">Supabase Edge Function + pg_cron</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">WhatsApp Engine</span>
              <span className="font-medium text-emerald-400">Method 2 Baileys / Cloud API</span>
            </div>
          </div>
        </div>

        {/* Class WhatsApp Groups Manager */}
        <ClassGroupsManagerCard />

        {/* WhatsApp Personal Phone Link Card (Method 2) */}
        <WhatsAppGatewayCard />

        <button
          onClick={logout}
          className="w-full bg-slate-900 hover:bg-slate-800 border border-rose-800/40 text-rose-400 font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center space-x-2 transition-all shadow-md"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out Educator Session</span>
        </button>
      </main>

      <NavigationBar />
    </div>
  )
}
