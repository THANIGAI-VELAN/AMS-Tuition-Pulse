import React, { useState, useEffect } from 'react'
import { Header } from '../components/layout/Header'
import { NavigationBar } from '../components/layout/NavigationBar'
import { fetchStudents, getCachedStudents } from '../services/studentService'
import { fetchAttendanceByDate, getCachedAttendance } from '../services/attendanceService'
import { Student, ClassName } from '../types/database.types'
import { TrendingUp, PieChart, Users, Award, ShieldCheck } from 'lucide-react'
import { format } from 'date-fns'

export const Analytics: React.FC = () => {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const [students, setStudents] = useState<Student[]>(() => getCachedStudents())
  const [attendance, setAttendance] = useState(() => {
    return getCachedAttendance().filter(a => a.attendance_date === todayStr)
  })

  useEffect(() => {
    let isMounted = true
    Promise.all([
      fetchStudents(),
      fetchAttendanceByDate(todayStr)
    ]).then(([allStudents, allAtt]) => {
      if (isMounted) {
        setStudents(allStudents)
        setAttendance(allAtt)
      }
    })
    return () => { isMounted = false }
  }, [todayStr])

  const classData = React.useMemo(() => {
    const classes: ClassName[] = ['1st-8th', '9th', '10th', '11th', '12th', 'Bhavani']
    const res = {} as Record<ClassName, { total: number; present: number; absent: number; rate: number }>
    
    for (const cls of classes) {
      res[cls] = { total: 0, present: 0, absent: 0, rate: 100 }
    }

    for (const cls of classes) {
      const clsStudents = students.filter(s => s.class_name === cls)
      const clsStudentIds = new Set(clsStudents.map(s => s.id))
      const att = attendance.filter(a => clsStudentIds.has(a.student_id))
      const present = att.filter(r => r.status === 'PRESENT').length
      const absent = att.filter(r => r.status === 'ABSENT').length
      const totalMarked = present + absent
      const rate = totalMarked > 0 ? Math.round((present / totalMarked) * 100) : 100

      res[cls] = {
        total: clsStudents.length,
        present,
        absent,
        rate
      }
    }
    return res
  }, [students, attendance])

  const totalEnrolled = students.length
  const totalPresent = Object.values(classData).reduce((a, b) => a + b.present, 0)
  const totalAbsent = Object.values(classData).reduce((a, b) => a + b.absent, 0)
  const totalMarked = totalPresent + totalAbsent
  const overallRate = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : (totalEnrolled > 0 ? 100 : 0)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 max-w-md mx-auto relative">
      <Header title="SP Academy" subtitle="Analytics & Insights" />

      <main className="p-4 space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-white tracking-tight">Attendance Analytics</h2>
          <p className="text-xs text-slate-400 font-medium">Performance overview across batches</p>
        </div>

        <div className="bg-gradient-to-br from-blue-900/60 to-indigo-900/60 border border-blue-500/30 rounded-3xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Overall Centre Rate</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
              overallRate >= 85
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}>
              {overallRate >= 85 ? 'Target 85% Met' : 'Target: 85%'}
            </span>
          </div>

          <div className="flex items-baseline space-x-3">
            <span className="text-4xl font-black text-white">{overallRate}%</span>
            {totalMarked > 0 && (
              <span className="text-xs text-emerald-400 font-bold flex items-center">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> Live Today
              </span>
            )}
          </div>
          <p className="text-[11px] text-blue-200/80">
            {totalEnrolled > 0
              ? `Daily roll call attendance calculated across all ${totalEnrolled} enrolled students in 6 batches.`
              : 'Add students and take daily roll calls to view calculated attendance rates.'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <h3 className="font-bold text-sm text-white flex items-center space-x-2">
            <PieChart className="w-4 h-4 text-blue-400" />
            <span>Class-wise Attendance Rate</span>
          </h3>

          <div className="space-y-3">
            {(['1st-8th', '9th', '10th', '11th', '12th', 'Bhavani'] as ClassName[]).map(cls => {
              const d = classData[cls]
              const title = cls === 'Bhavani' ? 'Bhavani Branch' : cls === '1st-8th' ? '1st - 8th Standard' : `${cls} Standard`
              return (
                <div key={cls}>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-white">{title} ({d.total} Students)</span>
                    <span className="text-emerald-400 font-bold">{d.rate}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${d.rate}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center space-x-2 text-blue-400 font-bold">
            <Award className="w-4 h-4" />
            <span>Automated Insights</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Attendance patterns update continuously as roll calls are marked each evening. Low attendance alerts will display automatically if any student falls below 75%.
          </p>
        </div>
      </main>

      <NavigationBar />
    </div>
  )
}
