import React, { useState, useEffect } from 'react'
import { Header } from '../components/layout/Header'
import { NavigationBar } from '../components/layout/NavigationBar'
import { fetchStudents, getCachedStudents } from '../services/studentService'
import { fetchAttendanceByClassAndDate, updateSingleAttendance, getCachedAttendance } from '../services/attendanceService'
import { getCachedNotifications } from '../services/notificationService'
import { Student, ClassName, AttendanceRecord, AttendanceStatus, NotificationRecord } from '../types/database.types'
import { Calendar, Filter, CheckCircle2, XCircle, Edit2, ShieldAlert, Check, X, Info } from 'lucide-react'
import { format } from 'date-fns'

export const AttendanceHistory: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState<ClassName>('12th')
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))

  // 1. Instant Cache Init (0ms)
  const [students, setStudents] = useState<Student[]>(() => getCachedStudents('12th'))
  const [notifications, setNotifications] = useState<NotificationRecord[]>(() => getCachedNotifications())
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    return getCachedAttendance().filter(a => a.attendance_date === todayStr)
  })
  const [loading, setLoading] = useState(false)
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)

  const loadData = async () => {
    try {
      const [clsStudents, records] = await Promise.all([
        fetchStudents(selectedClass),
        fetchAttendanceByClassAndDate(selectedClass, selectedDate)
      ])
      setStudents(clsStudents)
      setAttendanceRecords(records)
      setNotifications(getCachedNotifications())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    const handleUpdate = () => setNotifications(getCachedNotifications())
    window.addEventListener('sp_notifications_updated', handleUpdate)
    return () => window.removeEventListener('sp_notifications_updated', handleUpdate)
  }, [selectedClass, selectedDate])

  const handleToggleStatus = async (record: AttendanceRecord, newStatus: AttendanceStatus) => {
    await updateSingleAttendance(record.id, newStatus)
    await loadData()
    setEditingRecordId(null)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 max-w-md mx-auto relative">
      <Header title="SP Academy" subtitle="Attendance History & Logs" />

      <main className="p-4 space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-white tracking-tight">Attendance Logs</h2>
          <p className="text-xs text-slate-400 font-medium">View and modify past class roll calls</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Select Class</span>
            <div className="flex items-center space-x-1.5">
              {(['10th', '11th', '12th'] as ClassName[]).map(cls => (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    selectedClass === cls
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5">
            <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>Select Date</span>
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs font-semibold px-1">
          <span className="text-slate-400">{selectedClass} Standard • {selectedDate}</span>
          <div className="space-x-2">
            <span className="text-emerald-400">
              {attendanceRecords.filter(r => r.status === 'PRESENT').length} Present
            </span>
            <span className="text-rose-400">
              {attendanceRecords.filter(r => r.status === 'ABSENT').length} Absent
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">Loading records...</div>
        ) : students.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">No students in {selectedClass} Standard</div>
        ) : (
          <div className="space-y-2.5">
            {students.map((student) => {
              const record = attendanceRecords.find(r => r.student_id === student.id)
              const status: AttendanceStatus = record ? record.status : 'PRESENT'
              const isPresent = status === 'PRESENT'
              const isEditing = editingRecordId === (record?.id || student.id)
              
              const notif = notifications.find(n => 
                n.student_id === student.id && 
                ((n.created_at && n.created_at.startsWith(selectedDate)) || (n.scheduled_at && n.scheduled_at.startsWith(selectedDate)))
              )

              return (
                <div
                  key={student.id}
                  className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                    isPresent
                      ? 'bg-slate-900/90 border-slate-800'
                      : 'bg-rose-950/20 border-rose-800/40 shadow-lg shadow-rose-950/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white ${
                        isPresent ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {student.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-sm text-white">{student.name}</h4>
                          {notif?.status === 'Sent' && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              WhatsApp Sent
                            </span>
                          )}
                          {notif?.status === 'Pending' && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              10m Alert Pending
                            </span>
                          )}
                          {notif?.status === 'Cancelled' && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-800 text-slate-400 border border-slate-700">
                              Alert Cancelled
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">Parent: {student.parent_name}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {record && isEditing ? (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleToggleStatus(record, 'PRESENT')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px]"
                          >
                            Mark Present
                          </button>
                          <button
                            onClick={() => handleToggleStatus(record, 'ABSENT')}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px]"
                          >
                            Mark Absent
                          </button>
                          <button
                            onClick={() => setEditingRecordId(null)}
                            className="p-1 rounded-lg bg-slate-800 text-slate-400 text-[10px]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className={`px-3 py-1 rounded-xl text-xs font-bold ${
                            isPresent
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {status}
                          </span>

                          {record && (
                            <button
                              onClick={() => setEditingRecordId(record.id)}
                              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200"
                              title="Edit attendance status"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {record && isEditing && notif?.status === 'Sent' && (
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 flex items-center space-x-1.5">
                      <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        Parent was already sent WhatsApp absent notice at {format(new Date(notif.sent_at || notif.updated_at), 'hh:mm a')}. Changing status to <strong>Present</strong> updates class records for late arrival.
                      </span>
                    </div>
                  )}
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
