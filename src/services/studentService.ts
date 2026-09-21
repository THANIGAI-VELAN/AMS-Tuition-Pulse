import { supabase } from './supabase'
import { Student, ClassName, FeeStatus } from '../types/database.types'
import { getLocalStudents, saveLocalStudents } from '../utils/offlineStorage'
import { withTimeout } from '../utils/asyncUtils'

let inMemoryStudents: Student[] | null = null

export const getCachedStudents = (className?: ClassName): Student[] => {
  const students = inMemoryStudents || getLocalStudents()
  inMemoryStudents = students
  return className ? students.filter(s => s.class_name === className) : students
}

export const fetchStudents = async (className?: ClassName): Promise<Student[]> => {
  try {
    const query = supabase
      .from('students')
      .select('*')
      .order('name', { ascending: true })

    const res = await withTimeout(className ? query.eq('class_name', className) : query, 4000)

    if (res.error) {
      console.warn('Supabase fetchStudents notice:', res.error.message)
      return getCachedStudents(className)
    }

    const currentCached = getCachedStudents()
    const rawStudents = (res.data || []) as Student[]
    
    // Merge remote data with local cache ensuring joining_date, monthly_fee, gender, and fee_status are preserved
    const students: Student[] = rawStudents.map(remote => {
      const local = currentCached.find(c => c.id === remote.id)
      return {
        ...local,
        ...remote,
        gender: remote.gender || local?.gender || 'MALE',
        joining_date: remote.joining_date || local?.joining_date || remote.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        monthly_fee: remote.monthly_fee ?? local?.monthly_fee ?? 1500,
        fee_status: (remote.fee_status || local?.fee_status || 'PENDING') as FeeStatus
      }
    })

    if (!className) {
      inMemoryStudents = students
      saveLocalStudents(students)
    }
    return students
  } catch (err) {
    return getCachedStudents(className)
  }
}

export const fetchStudentById = async (id: string): Promise<Student | null> => {
  const cached = getCachedStudents().find(s => s.id === id)

  try {
    const res = await withTimeout(
      supabase.from('students').select('*').eq('id', id).single(),
      4000
    )

    if (res.error || !res.data) {
      return cached || null
    }

    const remote = res.data as Student
    const merged: Student = {
      ...cached,
      ...remote,
      gender: remote.gender || cached?.gender || 'MALE',
      joining_date: remote.joining_date || cached?.joining_date || remote.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      monthly_fee: remote.monthly_fee ?? cached?.monthly_fee ?? 1500,
      fee_status: (remote.fee_status || cached?.fee_status || 'PENDING') as FeeStatus
    }
    
    // Update cached student in list
    const current = getCachedStudents()
    const next = current.map(s => s.id === id ? merged : s)
    inMemoryStudents = next
    saveLocalStudents(next)

    return merged
  } catch {
    return cached || null
  }
}

export const createStudent = async (studentData: Omit<Student, 'id' | 'created_at' | 'updated_at'>): Promise<Student> => {
  const newUuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `stu-${Date.now()}`
  const now = new Date().toISOString()
  const fallbackStudent: Student = {
    ...studentData,
    gender: studentData.gender || 'MALE',
    joining_date: studentData.joining_date || now.split('T')[0],
    monthly_fee: Number(studentData.monthly_fee) || 1500,
    fee_status: studentData.fee_status || 'PENDING',
    id: newUuid,
    created_at: now,
    updated_at: now,
  }

  // 1. Optimistic update
  const current = getCachedStudents()
  const next = [...current.filter(s => s.id !== fallbackStudent.id), fallbackStudent]
  inMemoryStudents = next
  saveLocalStudents(next)

  // 2. Direct Supabase insert with full payload
  try {
    const fullPayload = {
      name: studentData.name,
      class_name: studentData.class_name,
      parent_phone: studentData.parent_phone,
      whatsapp_phone: studentData.whatsapp_phone || studentData.parent_phone,
      school: studentData.school || '',
      gender: fallbackStudent.gender,
      joining_date: fallbackStudent.joining_date,
      monthly_fee: fallbackStudent.monthly_fee,
      fee_status: fallbackStudent.fee_status,
      active: studentData.active ?? true
    }

    let res = await withTimeout(
      supabase
        .from('students')
        .insert([fullPayload])
        .select()
        .single(),
      5000
    )

    // Fallback if remote schema doesn't yet have extended columns
    if (res.error) {
      console.warn('Supabase create extended insert notice:', res.error.message)
      const basePayload = {
        name: studentData.name,
        class_name: studentData.class_name,
        parent_phone: studentData.parent_phone,
        whatsapp_phone: studentData.whatsapp_phone || studentData.parent_phone,
        school: studentData.school || '',
        active: studentData.active ?? true
      }
      res = await withTimeout(
        supabase
          .from('students')
          .insert([basePayload])
          .select()
          .single(),
        5000
      )
    }

    if (!res.error && res.data) {
      const created: Student = {
        ...fallbackStudent,
        ...(res.data as Student),
        gender: (res.data as Student).gender || fallbackStudent.gender,
        joining_date: (res.data as Student).joining_date || fallbackStudent.joining_date,
        monthly_fee: (res.data as Student).monthly_fee ?? fallbackStudent.monthly_fee,
        fee_status: (res.data as Student).fee_status || fallbackStudent.fee_status
      }
      const updatedList = next.map(s => s.id === fallbackStudent.id ? created : s)
      inMemoryStudents = updatedList
      saveLocalStudents(updatedList)
      return created
    }
  } catch (err) {
    console.warn('Supabase create fallback to optimistic:', err)
  }

  return fallbackStudent
}

export const updateStudent = async (id: string, studentData: Partial<Student>): Promise<Student | null> => {
  const now = new Date().toISOString()
  const current = getCachedStudents()
  const target = current.find(s => s.id === id)
  if (!target) return null

  const updated: Student = { ...target, ...studentData, updated_at: now }
  const next = current.map(s => s.id === id ? updated : s)
  inMemoryStudents = next
  saveLocalStudents(next)

  try {
    const { students, ...payloadToSend } = studentData as any

    let res = await withTimeout(
      supabase
        .from('students')
        .update({ ...payloadToSend, updated_at: now })
        .eq('id', id)
        .select()
        .single(),
      5000
    )

    // Fallback if remote schema doesn't yet have extended columns
    if (res.error) {
      console.warn('Supabase update extended notice:', res.error.message)
      const { monthly_fee, joining_date, fee_status, gender, ...basePayload } = payloadToSend
      res = await withTimeout(
        supabase
          .from('students')
          .update({ ...basePayload, updated_at: now })
          .eq('id', id)
          .select()
          .single(),
        5000
      )
    }

    if (!res.error && res.data) {
      const synced: Student = {
        ...updated,
        ...(res.data as Student),
        gender: (res.data as Student).gender || updated.gender,
        joining_date: (res.data as Student).joining_date || updated.joining_date,
        monthly_fee: (res.data as Student).monthly_fee ?? updated.monthly_fee,
        fee_status: (res.data as Student).fee_status || updated.fee_status
      }
      const syncedList = next.map(s => s.id === id ? synced : s)
      inMemoryStudents = syncedList
      saveLocalStudents(syncedList)
      return synced
    }
  } catch (err) {
    console.warn('Supabase update fallback to local:', err)
  }

  return updated
}

export const deleteStudent = async (id: string): Promise<boolean> => {
  const current = getCachedStudents()
  const next = current.filter(s => s.id !== id)
  inMemoryStudents = next
  saveLocalStudents(next)

  try {
    const res = await withTimeout(
      supabase.from('students').delete().eq('id', id),
      5000
    )
    if (res.error) {
      console.error('Supabase delete error:', res.error.message)
    }
  } catch (err) {
    console.warn('Supabase delete error:', err)
  }

  return true
}
