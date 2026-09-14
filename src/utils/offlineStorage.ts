import { Student, AttendanceRecord, NotificationRecord, FeeRecord } from '../types/database.types'

const STUDENTS_KEY = 'sp_academy_students'
const ATTENDANCE_KEY = 'sp_academy_attendance'
const NOTIFICATIONS_KEY = 'sp_academy_notifications'
const FEES_KEY = 'sp_academy_fees'

// Legacy seed student IDs to automatically purge from previous cache
const LEGACY_MOCK_IDS = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'])

export const getLocalStudents = (): Student[] => {
  const stored = localStorage.getItem(STUDENTS_KEY)
  if (!stored) {
    return []
  }
  try {
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    // Filter out any leftover legacy mock students
    const clean = parsed.filter(s => s && s.id && !LEGACY_MOCK_IDS.has(String(s.id)))
    if (clean.length !== parsed.length) {
      localStorage.setItem(STUDENTS_KEY, JSON.stringify(clean))
    }
    return clean
  } catch {
    return []
  }
}

export const saveLocalStudents = (students: Student[]) => {
  const clean = students.filter(s => s && s.id && !LEGACY_MOCK_IDS.has(String(s.id)))
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(clean))
}

export const getLocalAttendance = (): AttendanceRecord[] => {
  const stored = localStorage.getItem(ATTENDANCE_KEY)
  if (!stored) return []
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const saveLocalAttendance = (records: AttendanceRecord[]) => {
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records))
}

export const getLocalNotifications = (): NotificationRecord[] => {
  const stored = localStorage.getItem(NOTIFICATIONS_KEY)
  if (!stored) return []
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const saveLocalNotifications = (records: NotificationRecord[]) => {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(records))
}

export const getLocalFeeRecords = (): FeeRecord[] => {
  const stored = localStorage.getItem(FEES_KEY)
  if (!stored) return []
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const saveLocalFeeRecords = (records: FeeRecord[]) => {
  localStorage.setItem(FEES_KEY, JSON.stringify(records))
}

export const clearAllLocalData = () => {
  localStorage.removeItem(STUDENTS_KEY)
  localStorage.removeItem(ATTENDANCE_KEY)
  localStorage.removeItem(NOTIFICATIONS_KEY)
  localStorage.removeItem(FEES_KEY)
}
