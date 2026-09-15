import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchStudents, getCachedStudents } from '../services/studentService'
import { fetchAttendanceByClassAndDate, submitAttendance, getCachedAttendance } from '../services/attendanceService'
import { Student, ClassName, AttendanceStatus } from '../types/database.types'
import { ArrowLeft, Search, CheckCircle2, Info, ShieldCheck, Check, X, AlertCircle, Clock } from 'lucide-react'
import { format, addSeconds } from 'date-fns'

import { getCachedNotifications } from '../services/notificationService'
import { NotificationRecord } from '../types/database.types'

export const ClassAttendance: React.FC = () => {
  const { className } = useParams<{ className: string }>()
  const classVal = (className as ClassName) || '12th'
  const navigate = useNavigate()
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const formattedDateHeader = format(new Date(), 'dd MMMM yyyy')

  // 1. Instant Cache Initialization (0ms render time)
  const [students, setStudents] = useState<Student[]>(() => getCachedStudents(classVal))
  const [notifications, setNotifications] = useState<NotificationRecord[]>(() => getCachedNotifications())
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>(() => {
    const cachedStudents = getCachedStudents(classVal)
    const cachedAtt = getCachedAttendance().filter(a => a.attendance_date === todayStr)
    const initialMap: Record<string, AttendanceStatus> = {}
    cachedStudents.forEach(s => {
      const found = cachedAtt.find(e => e.student_id === s.id)
      initialMap[s.id] = found ? found.status : 'PRESENT'
    })
    return initialMap
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(() => getCachedStudents(classVal).length === 0)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // 2. Background Revalidate & Real-Time Notification Listeners
  useEffect(() => {
    let isMounted = true

    const loadClassData = async () => {
      try {
        const [allStudents, existing] = await Promise.all([
          fetchStudents(classVal),
          fetchAttendanceByClassAndDate(classVal, todayStr)
        ])

        if (isMounted) {
          setStudents(allStudents)
          setNotifications(getCachedNotifications())
          const map: Record<string, AttendanceStatus> = {}
          allStudents.forEach(s => {
            const found = existing.find(e => e.student_id === s.id)
            map[s.id] = found ? found.status : 'PRESENT'
          })
          setAttendanceMap(map)
          setLoading(false)
        }
      } catch {
        if (isMounted) setLoading(false)
      }
    }

    const handleNotifUpdate = () => {
      if (isMounted) setNotifications(getCachedNotifications())
    }

    loadClassData()
    window.addEventListener('sp_notifications_updated', handleNotifUpdate)

    return () => {
      isMounted = false
      window.removeEventListener('sp_notifications_updated', handleNotifUpdate)
    }
  }, [classVal, todayStr])

  const toggleStatus = (studentId: string) => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'PRESENT' ? 'ABSENT' : 'PRESENT'
    }))
  }

  const markAllPresent = () => {
    const updated: Record<string, AttendanceStatus> = {}
    students.forEach(s => {
      updated[s.id] = 'PRESENT'
    })
    setAttendanceMap(updated)
  }

  const presentCount = Object.values(attendanceMap).filter(s => s === 'PRESENT').length
  const absentCount = Object.values(attendanceMap).filter(s => s === 'ABSENT').length
  const absentStudents = students.filter(s => attendanceMap[s.id] === 'ABSENT')

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.parent_phone.includes(searchQuery)
  )

  const handleConfirmSubmit = async () => {
    setSubmitting(true)
    const records = Object.entries(attendanceMap).map(([studentId, status]) => ({
      studentId,
      status
    }))

    const result = await submitAttendance({
      className: classVal,
      attendanceDate: todayStr,
      records
    })

    setSubmitting(false)
    setShowConfirmModal(false)

    navigate('/attendance-success', {
      state: {
        className: classVal,
        presentCount,
        absentCount,
        absentStudents: absentStudents.map(s => s.name),
        scheduledAtIso: result.scheduledAtIso
      }
    })
  }

  const dispatchTimeString = format(addSeconds(new Date(), 30), 'hh:mm:ss a')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28 max-w-md mx-auto relative flex flex-col justify-between">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="font-extrabold text-base text-white tracking-tight">
              {classVal} Standard Attendance
            </h1>
            <p className="text-xs text-blue-400 font-medium">
              {formattedDateHeader} • {students.length} Students
            </p>
          </div>
          <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold">
            Live
          </div>
        </div>
      </header>

      {/* Main Roll Call Content */}
      <main className="p-4 space-y-4 flex-1">
        {/* Quick Filter & Search Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <button
              onClick={markAllPresent}
              className="text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl hover:bg-emerald-500/30 transition-all flex items-center space-x-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark All Present</span>
            </button>
            <span className="text-[11px] text-slate-400 font-medium">
              Default: All Present
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student by name..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Info Banner */}
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Tap any button to toggle student status</span>
          </span>
          <span className="font-semibold text-slate-300">{students.length} Total</span>
        </div>

        {/* Student Cards List */}
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">Loading class roster...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/70 border border-slate-800 rounded-3xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">No Students in {classVal} Standard</p>
              <p className="text-xs text-slate-400 mt-1">
                Add students to {classVal} Standard to start marking daily attendance.
              </p>
            </div>
            <button
              onClick={() => navigate('/students/add')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all inline-flex items-center space-x-1.5"
            >
              <span>+ Add Student to {classVal}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredStudents.map((student) => {
              const status = attendanceMap[student.id] || 'PRESENT'
              const isPresent = status === 'PRESENT'
              const sentNotif = notifications.find(n => 
                n.student_id === student.id && 
                n.status === 'Sent' && 
                ((n.created_at && n.created_at.startsWith(todayStr)) || (n.scheduled_at && n.scheduled_at.startsWith(todayStr)))
              )
              const pendingNotif = notifications.find(n => 
                n.student_id === student.id && 
                n.status === 'Pending' && 
                ((n.created_at && n.created_at.startsWith(todayStr)) || (n.scheduled_at && n.scheduled_at.startsWith(todayStr)))
              )

              return (
                <div
                  key={student.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                    isPresent
                      ? 'bg-slate-900/90 border-slate-800'
                      : 'bg-rose-950/20 border-rose-800/40 shadow-lg shadow-rose-950/20'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white ${
                      isPresent ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-rose-900/80 text-rose-200 border border-rose-700'
                    }`}>
                      {student.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-sm text-white">{student.name}</h4>
                        {sentNotif && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            WhatsApp Alert Sent
                          </span>
                        )}
                        {pendingNotif && !sentNotif && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            30s Alert Pending
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">Phone: {student.parent_phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => toggleStatus(student.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1 transition-all ${
                        isPresent
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                          : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Present</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleStatus(student.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1 transition-all ${
                        !isPresent
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 animate-pulse'
                          : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Absent</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Sticky Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 p-4 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 font-extrabold text-xs">
            <span className="text-emerald-400">{presentCount} Present</span>
            <span className="text-slate-600">•</span>
            <span className="text-rose-400">{absentCount} Absent</span>
          </div>
          <span className="text-[11px] text-blue-400 font-medium">Auto-WhatsApp</span>
        </div>

        <button
          onClick={() => setShowConfirmModal(true)}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-blue-600/30 flex items-center justify-center space-x-2 transition-all active:scale-[0.99]"
        >
          <span>Submit Attendance</span>
        </button>
      </footer>

      {/* Attendance Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-5 animate-in slide-in-from-bottom duration-300">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto mb-2">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-white">Submit Attendance?</h3>
              <p className="text-xs text-slate-400">
                {classVal} Standard • {formattedDateHeader}
              </p>
            </div>

            <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-400">✓ {presentCount} Students Present</span>
                <span className="text-slate-400">Total: {students.length}</span>
              </div>

              {absentCount > 0 ? (
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-rose-400 flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{absentCount} Students Absent:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {absentStudents.map(s => (
                      <span key={s.id} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-emerald-400 font-semibold">100% Full Attendance Today!</p>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
              <div className="font-bold flex items-center space-x-1 text-amber-200">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>30-Second Notification Window</span>
              </div>
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                Parents of absent students will receive an automated WhatsApp notification after 30 seconds (at <strong>{dispatchTimeString}</strong>). If a student arrives late, update attendance before then to automatically cancel dispatch.
              </p>
            </div>

            <div className="space-y-2">
              <button
                disabled={submitting}
                onClick={handleConfirmSubmit}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <span>{submitting ? 'Recording...' : 'Confirm & Submit Attendance'}</span>
              </button>

              <button
                disabled={submitting}
                onClick={() => setShowConfirmModal(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs"
              >
                Keep Reviewing / Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
