export type ClassName = '1st-8th' | '9th' | '10th' | '11th' | '12th' | 'Bhavani'

export const ALL_CLASSES: ClassName[] = ['1st-8th', '9th', '10th', '11th', '12th', 'Bhavani']

export const CLASS_DISPLAY_NAMES: Record<ClassName, string> = {
  '1st-8th': '1st - 8th Standard',
  '9th': '9th Standard',
  '10th': '10th Standard',
  '11th': '11th Standard',
  '12th': '12th Standard',
  'Bhavani': 'Bhavani Branch'
}

export const CLASS_SHORT_NAMES: Record<ClassName, string> = {
  '1st-8th': '1st-8th Std',
  '9th': '9th Std',
  '10th': '10th Std',
  '11th': '11th Std',
  '12th': '12th Std',
  'Bhavani': 'Bhavani'
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT'
export type NotificationStatus = 'Pending' | 'Scheduled' | 'Sent' | 'Failed' | 'Cancelled'
export type FeeStatus = 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE'

export interface Student {
  id: string
  name: string
  class_name: ClassName
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

export interface ClassGroup {
  id: string
  class_name: ClassName
  group_jid: string
  group_name: string
  invite_url?: string
  participant_count?: number
  created_at: string
  updated_at: string
}

