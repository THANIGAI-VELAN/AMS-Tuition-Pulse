import { supabase } from './supabase'
import { AttendanceRecord, AttendanceStatus, ClassName, NotificationRecord } from '../types/database.types'
import { getLocalAttendance, saveLocalAttendance, getLocalNotifications, saveLocalNotifications, getLocalStudents } from '../utils/offlineStorage'
import { getCachedStudents } from './studentService'
import { withTimeout } from '../utils/asyncUtils'

export interface AttendanceSubmissionPayload {
  className: ClassName
  attendanceDate: string // YYYY-MM-DD
  records: { studentId: string; status: AttendanceStatus }[]
  markedByUserId?: string
}

export interface AttendanceSubmissionResult {
  attendanceRecords: AttendanceRecord[]
  notificationsCreated: NotificationRecord[]
  scheduledAtIso: string
}

let inMemoryAttendance: AttendanceRecord[] | null = null

export const getCachedAttendance = (): AttendanceRecord[] => {
  const att = inMemoryAttendance || getLocalAttendance()
  inMemoryAttendance = att
  return att
}

export const submitAttendance = async (payload: AttendanceSubmissionPayload): Promise<AttendanceSubmissionResult> => {
  const { className, attendanceDate, records, markedByUserId } = payload
  const now = new Date()
  const scheduledTime = new Date(now.getTime() + 10 * 60 * 1000)
  const scheduledAtIso = scheduledTime.toISOString()

  const newAttendanceRecords: AttendanceRecord[] = []
  const newNotifications: NotificationRecord[] = []
  const students = getCachedStudents()

  for (const item of records) {
    const student = students.find(s => s.id === item.studentId)
    const attId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    
    const attRecord: AttendanceRecord = {
      id: attId,
      student_id: item.studentId,
      attendance_date: attendanceDate,
      status: item.status,
      marked_by: markedByUserId,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      students: student
    }
    newAttendanceRecords.push(attRecord)

    // If ABSENT -> Create Pending notification with 10-min window
    if (item.status === 'ABSENT' && student) {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      const notifRecord: NotificationRecord = {
        id: notifId,
        attendance_id: attId,
        student_id: item.studentId,
        parent_phone: student.whatsapp_phone || student.parent_phone,
        scheduled_at: scheduledAtIso,
        status: 'Pending',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        students: student,
        attendance: attRecord
      }
      newNotifications.push(notifRecord)
    }
  }

  // Optimistic local update (instant 0ms response)
  const currentAttendance = getCachedAttendance()
  const filteredAtt = currentAttendance.filter(
    a => !(a.attendance_date === attendanceDate && records.some(r => r.studentId === a.student_id))
  )
  const nextAtt = [...filteredAtt, ...newAttendanceRecords]
  inMemoryAttendance = nextAtt
  saveLocalAttendance(nextAtt)

  const currentNotifications = getLocalNotifications()
  // 1. Cancel any existing Pending notification for students marked PRESENT or re-marked ABSENT in this batch
  const updatedNotifications = currentNotifications.map(n => {
    const matchingRecord = records.find(r => r.studentId === n.student_id)
    if (matchingRecord && n.status === 'Pending') {
      if (matchingRecord.status === 'PRESENT') {
        return {
          ...n,
          status: 'Cancelled' as const,
          updated_at: now.toISOString()
        }
      } else if (matchingRecord.status === 'ABSENT') {
        // Cancel old pending alert to replace with fresh 10-min window
        return {
          ...n,
          status: 'Cancelled' as const,
          updated_at: now.toISOString()
        }
      }
    }
    return n
  })

  saveLocalNotifications([...updatedNotifications, ...newNotifications])

  // Background Supabase Sync
  ;(async () => {
    try {
      for (const att of newAttendanceRecords) {
        await withTimeout(
          supabase
            .from('attendance')
            .upsert({
              student_id: att.student_id,
              attendance_date: att.attendance_date,
              status: att.status,
              marked_by: att.marked_by
            }, { onConflict: 'student_id,attendance_date' }),
          3000
        )
      }

      for (const notif of newNotifications) {
        const notifPayload: Record<string, any> = {
          student_id: notif.student_id,
          parent_phone: notif.parent_phone,
          scheduled_at: notif.scheduled_at,
          status: 'Pending'
        }
        if (notif.attendance_id && !notif.attendance_id.startsWith('att_')) {
          notifPayload.attendance_id = notif.attendance_id
        }
        await withTimeout(
          supabase
            .from('notifications')
            .insert(notifPayload),
          3000
        )
      }
    } catch (err) {
      console.warn('Supabase submit background sync fallback:', err)
    }
  })()

  return {
    attendanceRecords: newAttendanceRecords,
    notificationsCreated: newNotifications,
    scheduledAtIso
  }
}

export const fetchAttendanceByDate = async (dateStr: string): Promise<AttendanceRecord[]> => {
  try {
    const res = await withTimeout(
      supabase
        .from('attendance')
        .select('*, students(*)')
        .eq('attendance_date', dateStr),
      4000
    )

    if (res.data && res.data.length > 0) {
      const records = res.data as AttendanceRecord[]
      const current = getCachedAttendance()
      const filtered = current.filter(a => a.attendance_date !== dateStr)
      const next = [...filtered, ...records]
      inMemoryAttendance = next
      saveLocalAttendance(next)
      return records
    }
  } catch {
    // fallback
  }

  const local = getCachedAttendance()
  return local.filter(a => a.attendance_date === dateStr)
}

export const fetchAttendanceByClassAndDate = async (className: ClassName, dateStr: string): Promise<AttendanceRecord[]> => {
  const local = getCachedAttendance()
  const students = getCachedStudents()
  const matchingStudents = students.filter(s => s.class_name === className).map(s => s.id)
  const cachedForClass = local.filter(a => a.attendance_date === dateStr && matchingStudents.includes(a.student_id))

  try {
    const res = await withTimeout(
      supabase
        .from('attendance')
        .select('*, students!inner(*)')
        .eq('attendance_date', dateStr)
        .eq('students.class_name', className),
      4000
    )

    if (res.data && res.data.length > 0) {
      return res.data as AttendanceRecord[]
    }
  } catch {
    // fallback to cache
  }

  return cachedForClass
}

export const updateSingleAttendance = async (attendanceId: string, newStatus: AttendanceStatus): Promise<void> => {
  const nowIso = new Date().toISOString()
  const localAtt = getCachedAttendance()
  const target = localAtt.find(a => a.id === attendanceId)

  if (target) {
    target.status = newStatus
    target.updated_at = nowIso
    saveLocalAttendance([...localAtt])

    if (newStatus === 'PRESENT') {
      const localNotifs = getLocalNotifications()
      const updatedNotifs = localNotifs.map(n => {
        if (n.attendance_id === attendanceId && n.status === 'Pending') {
          return {
            ...n,
            status: 'Cancelled' as const,
            updated_at: nowIso
          }
        }
        return n
      })
      saveLocalNotifications(updatedNotifs)
    }
  }

  try {
    await withTimeout(
      supabase
        .from('attendance')
        .update({ status: newStatus, updated_at: nowIso })
        .eq('id', attendanceId),
      3000
    )

    if (newStatus === 'PRESENT') {
      await withTimeout(
        supabase
          .from('notifications')
          .update({ status: 'Cancelled', updated_at: nowIso })
          .eq('attendance_id', attendanceId)
          .eq('status', 'Pending'),
        3000
      )
    }
  } catch {
    // ignore background sync errors
  }
}
