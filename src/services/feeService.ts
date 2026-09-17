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
 * Helper to sync a fee record directly to Supabase table
 * using query-then-update/insert (compatible with tables without UNIQUE constraint).
 */
const syncFeeRecordToSupabase = async (
  studentId: string,
  month: number,
  year: number,
  amountDue: number,
  amountPaid: number,
  status: FeeStatus,
  paymentDate?: string | null
): Promise<void> => {
  try {
    const nowIso = new Date().toISOString()
    const { data } = await withTimeout(
      supabase
        .from('fees')
        .select('id')
        .eq('student_id', studentId)
        .eq('month', month)
        .eq('year', year)
        .limit(1),
      3000
    )

    const existing = data && data.length > 0 ? data[0] : null

    if (existing && existing.id) {
      await withTimeout(
        supabase
          .from('fees')
          .update({
            amount_due: amountDue,
            amount_paid: amountPaid,
            payment_date: paymentDate || null,
            status,
            updated_at: nowIso
          })
          .eq('id', existing.id),
        3000
      )
    } else {
      await withTimeout(
        supabase
          .from('fees')
          .insert([{
            student_id: studentId,
            month,
            year,
            amount_due: amountDue,
            amount_paid: amountPaid,
            payment_date: paymentDate || null,
            status,
            updated_at: nowIso
          }]),
        3000
      )
    }
  } catch (err) {
    console.warn('Supabase fee sync notice:', err)
  }
}

/**
 * Fetch fee history for a student. Auto-populates monthly ledger records
 * from joining_date (or past 3 months) up to current month if missing,
 * while preserving any custom past fee entries.
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

  const isBeforeOrEqualCurrent = (yr: number, mo: number) => {
    return yr < currentYear || (yr === currentYear && mo <= currentMonth)
  }

  let hasProcessedStart = false

  while (isBeforeOrEqualCurrent(y, m) || (!hasProcessedStart && y === startYear && m === startMonth)) {
    hasProcessedStart = true
    // If multiple records exist in DB for same month, pick the latest / paid one
    const matchingRecords = records.filter(r => r.year === y && r.month === m)
    const existing = matchingRecords.sort((a, b) => {
      if (a.status === 'PAID' && b.status !== 'PAID') return -1
      if (b.status === 'PAID' && a.status !== 'PAID') return 1
      return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
    })[0]

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

    if (!isBeforeOrEqualCurrent(y, m)) {
      break
    }

    m++
    if (m > 12) {
      m = 1
      y++
    }
  }

  // Include any extra custom/past fee records that lie outside the standard range
  records.forEach(r => {
    if (!generatedRecords.some(g => g.year === r.year && g.month === r.month)) {
      generatedRecords.push(r)
    }
  })

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
  let targetIndex = current.findIndex(f => f.id === feeRecordId)

  // Fallback matching if feeRecordId is synthetic e.g. fee_studentId_year_month
  if (targetIndex === -1 && feeRecordId.startsWith('fee_')) {
    const parts = feeRecordId.split('_')
    if (parts.length >= 4) {
      const studentId = parts[1]
      const year = Number(parts[2])
      const month = Number(parts[3])
      targetIndex = current.findIndex(f => f.student_id === studentId && f.year === year && f.month === month)
    }
  }

  const nowIso = new Date().toISOString()
  let updatedRecord: FeeRecord

  if (targetIndex !== -1) {
    updatedRecord = {
      ...current[targetIndex],
      ...updates,
      updated_at: nowIso
    }
    current[targetIndex] = updatedRecord
  } else {
    // If not found in cache, construct new record
    const parts = feeRecordId.split('_')
    const studentId = updates.student_id || (parts.length >= 2 ? parts[1] : '')
    const year = updates.year || (parts.length >= 3 ? Number(parts[2]) : new Date().getFullYear())
    const month = updates.month || (parts.length >= 4 ? Number(parts[3]) : new Date().getMonth() + 1)
    updatedRecord = {
      id: feeRecordId,
      student_id: studentId,
      month,
      year,
      amount_due: updates.amount_due ?? 1500,
      amount_paid: updates.amount_paid ?? 0,
      payment_date: updates.payment_date,
      status: updates.status || 'PENDING',
      created_at: nowIso,
      updated_at: nowIso,
      ...updates
    }
    current.push(updatedRecord)
  }

  inMemoryFeeRecords = current
  saveLocalFeeRecords(current)

  // Sync with Supabase
  await syncFeeRecordToSupabase(
    updatedRecord.student_id,
    updatedRecord.month,
    updatedRecord.year,
    updatedRecord.amount_due,
    updatedRecord.amount_paid,
    updatedRecord.status,
    updatedRecord.payment_date
  )

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
  const paymentDate = status === 'PAID' ? nowIso.split('T')[0] : undefined
  const amountPaid = status === 'PAID' ? amountDue : 0

  const newFee: FeeRecord = {
    id: `fee_${studentId}_${year}_${month}_${Date.now()}`,
    student_id: studentId,
    month,
    year,
    amount_due: amountDue,
    amount_paid: amountPaid,
    status,
    payment_date: paymentDate,
    created_at: nowIso,
    updated_at: nowIso
  }

  const current = getCachedFeeRecords()
  const next = [...current.filter(f => !(f.student_id === studentId && f.month === month && f.year === year)), newFee]
  inMemoryFeeRecords = next
  saveLocalFeeRecords(next)

  // Sync to Supabase
  await syncFeeRecordToSupabase(
    studentId,
    month,
    year,
    amountDue,
    amountPaid,
    status,
    paymentDate
  )

  return newFee
}
