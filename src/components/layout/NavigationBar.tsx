import React from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Users, Clock, Settings, BarChart2 } from 'lucide-react'

export const NavigationBar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/students', label: 'Students', icon: Users },
    { to: '/history', label: 'History', icon: Clock },
    { to: '/analytics', label: 'Analytics', icon: BarChart2 },
    { to: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 pb-safe">
      <div className="max-w-md mx-auto flex items-center justify-around py-2 px-1">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center py-1 px-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-blue-400 font-semibold bg-blue-500/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[11px]">{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

