import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { NavigationBar } from '../components/layout/NavigationBar'
import { fetchStudents, getCachedStudents } from '../services/studentService'
import { fetchAllNotifications, getCachedNotifications } from '../services/notificationService'
import { fetchAttendanceByDate, getCachedAttendance } from '../services/attendanceService'
import { ClassName, Student, NotificationRecord, AttendanceRecord } from '../types/database.types'
import { Users, Clock, ArrowRight, Zap, Send, ShieldCheck, ChevronRight, UserPlus, ClipboardCheck, MessageSquarePlus } from 'lucide-react'
import { format } from 'date-fns'

export const Home: React.FC = () => {
  const navigate = useNavigate()
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])

  // 1. Instant Cache Initialization (0ms render time)
  const [students, setStudents] = useState<Student[]>(() => getCachedStudents())
  const [notifications, setNotifications] = useState<NotificationRecord[]>(() => getCachedNotifications())
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>(() => {
    return getCachedAttendance().filter(a => a.attendance_date === todayStr)
  })

  // 2. Background Stale-While-Revalidate without blocking the UI
  useEffect(() => {
    let isMounted = true

    const refreshData = async () => {
      try {
        const [allStudents, allNotifs, allTodayAtt] = await Promise.all([
          fetchStudents(),
          fetchAllNotifications(),
          fetchAttendanceByDate(todayStr)
        ])

        if (isMounted) {
          setStudents(allStudents)
          setNotifications(allNotifs)
          setTodayAttendance(allTodayAtt)
        }
      } catch {
        // Cached data is already displayed
      }
    }

    refreshData()
    return () => { isMounted = false }
  }, [todayStr])

  // Calculate dynamic stats instantly in memory
  const totalStudentsCount = students.length

  const classStats = useMemo(() => {
    const classes: ClassName[] = ['10th', '11th', '12th']
    const stats: Record<ClassName, { total: number; marked: boolean; present: number; absent: number }> = {
      '10th': { total: 0, marked: false, present: 0, absent: 0 },
      '11th': { total: 0, marked: false, present: 0, absent: 0 },
      '12th': { total: 0, marked: false, present: 0, absent: 0 },
    }

    for (const cls of classes) {
      const clsStudents = students.filter(s => s.class_name === cls)
      const clsStudentIds = new Set(clsStudents.map(s => s.id))
      const attRecords = todayAttendance.filter(a => clsStudentIds.has(a.student_id))

      const marked = attRecords.length > 0
      const present = attRecords.filter(r => r.status === 'PRESENT').length
      const absent = attRecords.filter(r => r.status === 'ABSENT').length

      stats[cls] = {
        total: clsStudents.length,
        marked,
        present,
        absent
      }
    }

    return stats
  }, [students, todayAttendance])

  const totalPresentToday = Object.values(classStats).reduce((acc, c) => acc + c.present, 0)
  const totalAbsentToday = Object.values(classStats).reduce((acc, c) => acc + c.absent, 0)
  const anyClassMarked = Object.values(classStats).some(c => c.marked)
  const attendanceRate = totalPresentToday + totalAbsentToday > 0
    ? Math.round((totalPresentToday / (totalPresentToday + totalAbsentToday)) * 100)
    : 0

  const pendingCount = notifications.filter(n => n.status === 'Pending').length
  const sentCount = notifications.filter(n => n.status === 'Sent').length

  const classCards: { className: ClassName; title: string; timing: string }[] = [
    { className: '10th', title: '10th Standard', timing: '04:00 PM - 05:30 PM' },
    { className: '11th', title: '11th Standard', timing: '05:30 PM - 07:00 PM' },
    { className: '12th', title: '12th Standard', timing: '07:00 PM - 08:30 PM' },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 max-w-md mx-auto relative">
      <Header title="SP Academy" subtitle="Tuition Centre Dashboard" />

      <main className="p-4 space-y-5">
        {/* Welcome Banner */}
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>{format(new Date(), 'EEEE, d MMMM yyyy')}</span>
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Good evening, Admin 👋
          </h2>
          <p className="text-xs text-slate-400">
            {totalStudentsCount > 0
              ? `${totalStudentsCount} student${totalStudentsCount > 1 ? 's' : ''} enrolled across 3 batches`
              : 'Welcome! Add students or start taking class attendance below'}
          </p>
        </div>

        {/* Quick Actions Bar */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={() => navigate('/attendance/12th')}
            className="p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex flex-col items-center justify-center space-y-1.5 shadow-lg shadow-blue-600/25 transition-all active:scale-95"
          >
            <ClipboardCheck className="w-5 h-5" />
            <span>Take Attendance</span>
          </button>

          <button
            onClick={() => navigate('/students/add')}
            className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-xs flex flex-col items-center justify-center space-y-1.5 transition-all active:scale-95 shadow-md"
          >
            <UserPlus className="w-5 h-5 text-emerald-400" />
            <span>Add Student</span>
          </button>

          <button
            onClick={() => navigate('/custom-message')}
            className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-xs flex flex-col items-center justify-center space-y-1.5 transition-all active:scale-95 shadow-md"
          >
            <MessageSquarePlus className="w-5 h-5 text-blue-400" />
            <span>WhatsApp Msg</span>
          </button>
        </div>

        {/* Feature Tip Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border border-blue-500/30 text-xs text-blue-200 flex items-start space-x-3 shadow-lg">
          <Zap className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-white">Automated WhatsApp Broadcast</p>
            <p className="text-[11px] text-blue-200/80 leading-relaxed">
              Mark attendance & submit. 10 minutes after submission, parents of absent students are automatically notified.
            </p>
          </div>
        </div>

        {/* Empty State Banner if no students exist */}
        {totalStudentsCount === 0 && (
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">No Students Added Yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Add students to your classes. All details sync live to your Supabase database.
              </p>
            </div>
            <button
              onClick={() => navigate('/students/add')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all inline-flex items-center space-x-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Your First Student</span>
            </button>
          </div>
        )}

        {/* Today's Attendance Cards Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Today's Attendance
            </h3>
            <span className="text-[11px] text-slate-400">3 Batches</span>
          </div>

          <div className="space-y-3">
            {classCards.map((c) => {
              const stat = classStats[c.className]
              const studentCount = stat.total

              return (
                <div
                  key={c.className}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-extrabold text-base text-white">{c.title}</h4>
                        {stat.marked ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Completed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Roll Call Pending
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 flex items-center space-x-1 mt-1">
                        <Users className="w-3.5 h-3.5 text-blue-400 inline" />
                        <span>{studentCount} Enrolled Student{studentCount !== 1 ? 's' : ''}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-medium text-slate-400 flex items-center justify-end space-x-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{c.timing}</span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    {stat.marked ? (
                      <div className="text-xs space-x-3 font-semibold">
                        <span className="text-emerald-400">{stat.present} Present</span>
                        <span className="text-rose-400">{stat.absent} Absent</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Not marked today</span>
                    )}

                    <button
                      onClick={() => navigate(`/attendance/${c.className}`)}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center space-x-1.5 shadow-md shadow-blue-600/30 transition-all active:scale-95"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      <span>{stat.marked ? 'Review / Edit' : 'Take Attendance'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Today's Overview Stats Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Today's Overview
            </h3>
            <span className="text-[11px] text-blue-400 font-semibold cursor-pointer" onClick={() => navigate('/analytics')}>
              View Analytics →
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 text-center">
              <span className="text-2xl font-black text-white">{totalStudentsCount}</span>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Total Students</p>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 text-center">
              <span className="text-2xl font-black text-emerald-400">{totalPresentToday}</span>
              <p className="text-[11px] font-semibold text-emerald-500 mt-0.5">
                {anyClassMarked ? `Present (${attendanceRate}%)` : 'Present'}
              </p>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 text-center">
              <span className="text-2xl font-black text-rose-400">{totalAbsentToday}</span>
              <p className="text-[11px] font-semibold text-rose-400 mt-0.5">
                {anyClassMarked ? `Absent (${100 - attendanceRate}%)` : 'Absent'}
              </p>
            </div>
          </div>

          {/* Parent WhatsApp Dispatch Status Card */}
          <div
            onClick={() => navigate('/notifications')}
            className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 cursor-pointer hover:border-slate-700 transition-all flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-white">Parent WhatsApp Dispatch</p>
                <div className="flex items-center space-x-2 text-xs mt-0.5">
                  <span className="text-emerald-400 font-semibold">{sentCount} Sent</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-amber-400 font-semibold">{pendingCount} Pending (10m window)</span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500" />
          </div>
        </div>

        {/* Daily Reminder Footer Card */}
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-start space-x-3">
          <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Marking attendance on time prevents unexcused absence queries and ensures parents receive prompt WhatsApp updates.
          </p>
        </div>
      </main>

      <NavigationBar />
    </div>
  )
}
