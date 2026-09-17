import React, { useState, useEffect } from 'react'
import { fetchStudents } from '../services/studentService'
import { fetchClassGroups, createClassWhatsAppGroup, syncClassWhatsAppGroup } from '../services/groupService'
import { Student, ClassGroup, ClassName } from '../types/database.types'
import { Users, ExternalLink, PlusCircle, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

export const ClassGroupsManagerCard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([])
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([])
  const [loadingClass, setLoadingClass] = useState<ClassName | null>(null)
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null)

  const loadData = async () => {
    const [stus, grps] = await Promise.all([fetchStudents(), fetchClassGroups()])
    setStudents(stus)
    setClassGroups(grps)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateOrSync = async (className: ClassName) => {
    setLoadingClass(className)
    setMessage(null)

    const existingGroup = classGroups.find(g => g.class_name === className)

    if (existingGroup) {
      const res = await syncClassWhatsAppGroup(existingGroup, students)
      if (res.success) {
        setMessage({ text: `✅ ${className} Standard group participants synchronized!`, success: true })
        await loadData()
      } else {
        setMessage({ text: res.error || 'Failed to sync group participants.', success: false })
      }
    } else {
      const res = await createClassWhatsAppGroup(className, students)
      if (res.success && res.group) {
        setMessage({ text: `✅ Created WhatsApp group for ${className} Standard with ${res.group.participant_count} parent numbers!`, success: true })
        await loadData()
      } else {
        setMessage({ text: res.error || 'Failed to create WhatsApp group. Make sure WhatsApp is connected.', success: false })
      }
    }

    setLoadingClass(null)
  }

  const classes: ClassName[] = ['10th', '11th', '12th']

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Class WhatsApp Groups</h3>
            <p className="text-[11px] text-slate-400">1-Click parent group mapping & announcements</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-2xl border text-xs flex items-start space-x-2 ${
          message.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          {message.success ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="space-y-2.5">
        {classes.map(cls => {
          const group = classGroups.find(g => g.class_name === cls)
          const activeCount = students.filter(s => s.class_name === cls && s.active).length
          const isLoading = loadingClass === cls

          return (
            <div
              key={cls}
              className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between space-x-3"
            >
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs text-white">{cls} Standard Group</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                    group
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {group ? 'MAPPED' : 'NOT CREATED'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  {group ? `${activeCount} Students Mapped` : `${activeCount} Parents Available`}
                </p>
              </div>

              <div className="flex items-center space-x-1.5">
                {group?.invite_url && (
                  <a
                    href={group.invite_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 hover:text-white text-xs font-bold"
                    title="Open Group Invite"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <button
                  type="button"
                  disabled={isLoading || activeCount === 0}
                  onClick={() => handleCreateOrSync(cls)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all active:scale-95 disabled:opacity-50 ${
                    group
                      ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30'
                  }`}
                >
                  {group ? (
                    <>
                      <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isLoading ? 'animate-spin' : ''}`} />
                      <span>{isLoading ? 'Syncing...' : 'Sync'}</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{isLoading ? 'Creating...' : 'Create'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
