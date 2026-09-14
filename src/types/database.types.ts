export type ClassName = '10th' | '11th' | '12th'
export type AttendanceStatus = 'PRESENT' | 'ABSENT'
export type NotificationStatus = 'Pending' | 'Scheduled' | 'Sent' | 'Failed' | 'Cancelled'
export type FeeStatus = 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE'

export interface Student {
  id: string
  name: string
  class_name: ClassName
  parent_name: string
  parent_phone: string
  whatsapp_phone: string
  school?: string
  monthly_fee?: number
  joining_date?: string
  fee_status?: FeeStatus
  active: boolean
  created_at: string
  updated_at: string
}

export interface AttendanceRecord {
  id: string
  student_id: string
  attendance_date: string // YYYY-MM-DD
  status: AttendanceStatus
  marked_by?: string
  created_at: string
  updated_at: string
  students?: Student
}

export interface NotificationRecord {
  id: string
  attendance_id?: string
  student_id: string
  parent_phone: string
  scheduled_at: string
  sent_at?: string
  status: NotificationStatus
  provider_message_id?: string
  failure_reason?: string
  created_at: string
  updated_at: string
  students?: Student
  attendance?: AttendanceRecord
}

export interface FeeRecord {
  id: string
  student_id: string
  month: number
  year: number
  amount_due: number
  amount_paid: number
  payment_date?: string
  status: FeeStatus
  created_at: string
  updated_at: string
  students?: Student
}

export interface ClassSummary {
  className: ClassName
  totalStudents: number
  markedToday: boolean
  presentCount: number
  absentCount: number
  attendanceRate: number
}
