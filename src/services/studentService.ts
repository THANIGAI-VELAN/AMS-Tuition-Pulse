import { supabase } from './supabase'
import { Student, ClassName } from '../types/database.types'
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

    const students = (res.data || []) as Student[]
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
  if (cached) return cached

  try {
    const res = await withTimeout(
      supabase.from('students').select('*').eq('id', id).single(),
      4000
    )

    if (res.error || !res.data) {
      return getCachedStudents().find(s => s.id === id) || null
    }

    return res.data as Student
  } catch {
    return getCachedStudents().find(s => s.id === id) || null
  }
}

export const createStudent = async (studentData: Omit<Student, 'id' | 'created_at' | 'updated_at'>): Promise<Student> => {
  const newUuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `stu-${Date.now()}`
  const now = new Date().toISOString()
  const fallbackStudent: Student = {
    ...studentData,
    id: newUuid,
    created_at: now,
    updated_at: now,
  }

  // 1. Optimistic update
  const current = getCachedStudents()
  const next = [...current.filter(s => s.id !== fallbackStudent.id), fallbackStudent]
  inMemoryStudents = next
  saveLocalStudents(next)

  // 2. Direct Supabase insert (only passing columns present in remote Supabase table)
  try {
    const supabasePayload = {
      name: studentData.name,
      class_name: studentData.class_name,
      parent_name: studentData.parent_name,
      parent_phone: studentData.parent_phone,
      whatsapp_phone: studentData.whatsapp_phone || studentData.parent_phone,
      school: studentData.school || '',
      active: studentData.active ?? true
    }

    const res = await withTimeout(
      supabase
        .from('students')
        .insert([supabasePayload])
        .select()
        .single(),
      5000
    )

    if (res.error) {
      console.error('Supabase create notice:', res.error.message)
    } else if (res.data) {
      const created = { ...fallbackStudent, ...(res.data as Student) }
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
    // Strip out client-only metadata before sending to Supabase table
    const { monthly_fee, joining_date, fee_status, students, ...supabaseUpdatePayload } = studentData as any

    const res = await withTimeout(
      supabase
        .from('students')
        .update({ ...supabaseUpdatePayload, updated_at: now })
        .eq('id', id)
        .select()
        .single(),
      5000
    )

    if (!res.error && res.data) {
      const synced = { ...updated, ...(res.data as Student) }
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
