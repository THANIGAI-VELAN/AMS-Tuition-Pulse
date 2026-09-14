import { supabase } from './supabase'
import { FeeRecord, FeeStatus } from '../types/database.types'
import { getLocalFeeRecords, saveLocalFeeRecords } from '../utils/offlineStorage'
import { withTimeout } from '../utils/asyncUtils'

let inMemoryFeeRecords: FeeRecord[] | null = null

export const getCachedFeeRecords = (): FeeRecord[] => {
  const records = inMemoryFeeRecords || getLocalFeeRecords()
  inMemoryFeeRecords = records
  return records
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export const getMonthName = (month: number): string => {
  return MONTH_NAMES[month - 1] || `Month ${month}`
}

/**
 * Fetch fee history for a student. Auto-populates monthly ledger records
 * from joining_date (or past 3 months) up to current month if missing.
 */
export const fetchFeeRecordsForStudent = async (
  studentId: string,
  joiningDateStr?: string,
  monthlyFee: number = 1500
): Promise<FeeRecord[]> => {
  let records = getCachedFeeRecords().filter(f => f.student_id === studentId)

  // Fetch from Supabase
  try {
    const res = await withTimeout(
      supabase
        .from('fees')
        .select('*')
        .eq('student_id', studentId)
        .order('year', { ascending: true })
        .order('month', { ascending: true }),
      3000
    )

    if (res.data && res.data.length > 0) {
      records = res.data as FeeRecord[]
      const currentAll = getCachedFeeRecords()
      const filtered = currentAll.filter(f => f.student_id !== studentId)
      const nextAll = [...filtered, ...records]
      inMemoryFeeRecords = nextAll
      saveLocalFeeRecords(nextAll)
    }
  } catch {
    // fallback to local cache
  }

  // Calculate month range from joining date (or default last 3 months) up to now
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-12

  let startYear = currentYear
  let startMonth = currentMonth - 2
  if (startMonth < 1) {
    startMonth += 12
    startYear -= 1
  }

  if (joiningDateStr) {
    const jDate = new Date(joiningDateStr)
    if (!isNaN(jDate.getTime())) {
      startYear = jDate.getFullYear()
      startMonth = jDate.getMonth() + 1
    }
  }

  // Generate missing monthly ledger records
  const generatedRecords: FeeRecord[] = []
  let y = startYear
  let m = startMonth

  while (y < currentYear || (y === currentYear && m <= currentMonth)) {
    const existing = records.find(r => r.year === y && r.month === m)
    if (existing) {
      generatedRecords.push(existing)
    } else {
      const isPastMonth = y < currentYear || (y === currentYear && m < currentMonth)
      const defaultStatus: FeeStatus = isPastMonth ? 'OVERDUE' : 'PENDING'
      const newRecord: FeeRecord = {
        id: `fee_${studentId}_${y}_${m}`,
        student_id: studentId,
        month: m,
        year: y,
        amount_due: monthlyFee,
        amount_paid: 0,
        status: defaultStatus,
        created_at: new Date(y, m - 1, 1).toISOString(),
        updated_at: new Date().toISOString()
      }
      generatedRecords.push(newRecord)
    }

    m++
    if (m > 12) {
      m = 1
      y++
    }
  }

  // Save generated records back to cache
  const allCached = getCachedFeeRecords()
  const otherCached = allCached.filter(f => f.student_id !== studentId)
  const merged = [...otherCached, ...generatedRecords]
  inMemoryFeeRecords = merged
  saveLocalFeeRecords(merged)

  return generatedRecords.sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))
}

/**
 * Update a specific month's fee payment record (e.g. Mark PAID, PENDING, OVERDUE)
 */
export const updateFeeRecord = async (
  feeRecordId: string,
  updates: Partial<FeeRecord>
): Promise<FeeRecord | null> => {
  const current = getCachedFeeRecords()
  const targetIndex = current.findIndex(f => f.id === feeRecordId)
  if (targetIndex === -1) return null

  const nowIso = new Date().toISOString()
  const updatedRecord: FeeRecord = {
    ...current[targetIndex],
    ...updates,
    updated_at: nowIso
  }

  current[targetIndex] = updatedRecord
  inMemoryFeeRecords = current
  saveLocalFeeRecords(current)

  // Sync with Supabase
  try {
    await withTimeout(
      supabase
        .from('fees')
        .upsert({
          student_id: updatedRecord.student_id,
          month: updatedRecord.month,
          year: updatedRecord.year,
          amount_due: updatedRecord.amount_due,
          amount_paid: updatedRecord.amount_paid,
          payment_date: updatedRecord.payment_date,
          status: updatedRecord.status
        }),
      3000
    )
  } catch {
    // offline fallback
  }

  return updatedRecord
}

/**
 * Add a custom past fee / arrears month record
 */
export const addCustomFeeRecord = async (
  studentId: string,
  month: number,
  year: number,
  amountDue: number,
  status: FeeStatus = 'PENDING'
): Promise<FeeRecord> => {
  const nowIso = new Date().toISOString()
  const newFee: FeeRecord = {
    id: `fee_${studentId}_${year}_${month}_${Date.now()}`,
    student_id: studentId,
    month,
    year,
    amount_due: amountDue,
    amount_paid: status === 'PAID' ? amountDue : 0,
    status,
    payment_date: status === 'PAID' ? nowIso : undefined,
    created_at: nowIso,
    updated_at: nowIso
  }

  const current = getCachedFeeRecords()
  const next = [...current.filter(f => !(f.student_id === studentId && f.month === month && f.year === year)), newFee]
  inMemoryFeeRecords = next
  saveLocalFeeRecords(next)

  return newFee
}
