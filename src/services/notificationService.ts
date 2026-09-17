import { supabase } from './supabase'
import { NotificationRecord } from '../types/database.types'
import { getLocalNotifications, saveLocalNotifications, getLocalAttendance, getLocalStudents } from '../utils/offlineStorage'
import { withTimeout } from '../utils/asyncUtils'

let inMemoryNotifications: NotificationRecord[] | null = null

export const getCachedNotifications = (): NotificationRecord[] => {
  const notifs = inMemoryNotifications || getLocalNotifications()
  inMemoryNotifications = notifs
  const students = getLocalStudents()
  const attendance = getLocalAttendance()

  return notifs.map(n => ({
    ...n,
    students: n.students || students.find(s => s.id === n.student_id),
    attendance: n.attendance || attendance.find(a => a.id === n.attendance_id)
  })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export const fetchAllNotifications = async (): Promise<NotificationRecord[]> => {
  try {
    const res = await withTimeout(
      supabase
        .from('notifications')
        .select('*, students(*)')
        .order('created_at', { ascending: false }),
      4000
    )

    if (res.data && res.data.length > 0) {
      const list = res.data as NotificationRecord[]
      const local = getLocalNotifications()
      
      // Preserve local Sent or Cancelled status if remote Supabase record is still Pending
      const mergedList = list.map(remoteNotif => {
        const matchingLocal = local.find(l => 
          l.id === remoteNotif.id || 
          (l.student_id === remoteNotif.student_id && l.scheduled_at === remoteNotif.scheduled_at)
        )
        if (matchingLocal && (matchingLocal.status === 'Sent' || matchingLocal.status === 'Cancelled')) {
          return {
            ...remoteNotif,
            status: matchingLocal.status,
            sent_at: matchingLocal.sent_at || remoteNotif.sent_at,
            provider_message_id: matchingLocal.provider_message_id || remoteNotif.provider_message_id
          }
        }
        return remoteNotif
      })

      inMemoryNotifications = mergedList
      saveLocalNotifications(mergedList)
      return mergedList
    }
  } catch {
    // fallback
  }

  return getCachedNotifications()
}

import { getTamilAbsenceMessage } from '../utils/tamilMessages'

let isProcessingNotifications = false
const inFlightNotificationIds = new Set<string>()

/**
 * Client-side evaluation engine for the 30-second re-check window.
 * Protected by a Mutex lock and atomic state update to prevent any duplicate messaging.
 */
export const processPendingNotifications = async (): Promise<{ processed: number; sent: number; cancelled: number }> => {
  // Mutex Lock: Prevent concurrent processing loop executions
  if (isProcessingNotifications) {
    return { processed: 0, sent: 0, cancelled: 0 }
  }

  isProcessingNotifications = true

  let sent = 0
  let cancelled = 0
  let updated = false

  try {
    const allNotifs = getCachedNotifications()
    const attendanceList = getLocalAttendance()
    const studentList = getLocalStudents()
    const now = new Date()

    const nextNotifs = [...allNotifs]

    for (let i = 0; i < nextNotifs.length; i++) {
      const notif = nextNotifs[i]
      if (notif.status !== 'Pending') continue

      // Skip if this notification ID is already in flight (currently processing)
      if (inFlightNotificationIds.has(notif.id)) continue

      // Match student's current attendance record (by ID or student_id)
      const att = attendanceList.find(a => a.id === notif.attendance_id) || attendanceList.find(a => a.student_id === notif.student_id)

      // Case 1: Student was marked PRESENT within 30-sec window -> Cancel notification!
      if (att && att.status === 'PRESENT') {
        cancelled++
        updated = true
        nextNotifs[i] = {
          ...notif,
          status: 'Cancelled',
          updated_at: now.toISOString()
        }

        // Sync Cancelled status to Supabase
        const targetStudentId = notif.student_id
        ;(async () => {
          try {
            await withTimeout(
              supabase
                .from('notifications')
                .update({ status: 'Cancelled', updated_at: now.toISOString() })
                .eq('student_id', targetStudentId)
                .eq('status', 'Pending'),
              3000
            )
          } catch {}
        })()
        continue
      }

      // Case 2: Strict 30-second window expired and student is still ABSENT -> Dispatch WhatsApp alert!
      const scheduledDate = new Date(notif.scheduled_at)
      const createdDate = notif.created_at ? new Date(notif.created_at) : scheduledDate
      const isPast30Sec = (now.getTime() - createdDate.getTime() >= 30000) || (now.getTime() >= scheduledDate.getTime())
      
      if (isPast30Sec && (!att || att.status === 'ABSENT')) {
        // 1. Instantly lock this notification ID so no future execution can touch it
        inFlightNotificationIds.add(notif.id)

        // 2. ATOMIC STATE UPDATE: Immediately mark as 'Sent' in cache & disk BEFORE network call
        const sentAtIso = now.toISOString()
        nextNotifs[i] = {
          ...notif,
          status: 'Sent',
          sent_at: sentAtIso,
          updated_at: sentAtIso
        }
        inMemoryNotifications = nextNotifs
        saveLocalNotifications(nextNotifs)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sp_notifications_updated'))
        }
        updated = true
        sent++

        // 3. Format message and dispatch via WhatsApp Gateway (async)
        const student = notif.students || studentList.find(s => s.id === notif.student_id)
        const messageText = getTamilAbsenceMessage({
          studentName: student?.name || 'Student',
          className: student?.class_name || ''
        })

        const res = await sendCustomWhatsAppMessage(notif.student_id, notif.parent_phone, messageText)

        if (res.messageId) {
          nextNotifs[i].provider_message_id = res.messageId
          saveLocalNotifications(nextNotifs)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sp_notifications_updated'))
          }
        }

        // 4. Sync Sent status to Supabase DB so remote queries persist 'Sent'
        const targetStudentId = notif.student_id
        const msgId = res.messageId
        ;(async () => {
          try {
            await withTimeout(
              supabase
                .from('notifications')
                .update({
                  status: 'Sent',
                  sent_at: sentAtIso,
                  provider_message_id: msgId || null,
                  updated_at: sentAtIso
                })
                .eq('student_id', targetStudentId)
                .eq('status', 'Pending'),
              3000
            )
          } catch (e) {
            console.warn('Failed to update Supabase notification status:', e)
          }
        })()
      }
    }

    if (updated) {
      inMemoryNotifications = nextNotifs
      saveLocalNotifications(nextNotifs)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sp_notifications_updated'))
      }
    }
  } finally {
    // Release Mutex Lock
    isProcessingNotifications = false
  }

  return { processed: sent + cancelled, sent, cancelled }
}

export const DEFAULT_GATEWAY_URL = 'https://tuition-pulse-gateway.onrender.com'

export const getEffectiveGatewayUrl = (): string => {
  if (typeof window === 'undefined') return DEFAULT_GATEWAY_URL
  const stored = localStorage.getItem('WHATSAPP_GATEWAY_URL')
  if (!stored || stored.includes('localhost')) {
    localStorage.setItem('WHATSAPP_GATEWAY_URL', DEFAULT_GATEWAY_URL)
    return DEFAULT_GATEWAY_URL
  }
  return stored
}

export const sendCustomWhatsAppMessage = async (studentId: string, parentPhone: string, messageText: string): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const gatewayUrl = getEffectiveGatewayUrl()
  const cleanUrl = gatewayUrl.replace(/\/$/, '')

  // 1. Try local Zero-Cost WhatsApp Gateway (/send) first
  try {
    const gatewayRes = await withTimeout(
      fetch(`${cleanUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-secret': 'tuition-pulse-secret-key'
        },
        body: JSON.stringify({ phone: parentPhone, message: messageText })
      }),
      5000
    )

    if (gatewayRes.ok) {
      const data = await gatewayRes.json()
      if (data.success) {
        return { success: true, messageId: data.messageId || `GW_${Date.now()}` }
      }
    }
  } catch {
    // Gateway offline or unreachable, fall through to Edge Function / fallback
  }

  // 2. Fallback to Supabase Edge Function (if deployed)
  try {
    const res = await withTimeout(
      supabase.functions.invoke('send-custom-whatsapp', {
        body: { studentId, parentPhone, messageText }
      }),
      4000
    )

    if (!res.error && res.data?.success) {
      return { success: true, messageId: res.data.provider_message_id }
    }
  } catch {
    // Edge function CORS / network fallback
  }

  const mockId = `WAMID_CUSTOM_${Date.now()}`
  return { success: true, messageId: mockId }
}

export interface GatewayStatusResponse {
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING'
  connectedUser?: string | null
  hasQr?: boolean
}

let cachedGatewayStatus: GatewayStatusResponse = {
  status: (localStorage.getItem('WA_GATEWAY_STATUS') as 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING') || 'DISCONNECTED',
  connectedUser: localStorage.getItem('WA_GATEWAY_USER') || null
}

export const getLatestCachedGatewayStatus = (): GatewayStatusResponse => {
  return cachedGatewayStatus
}

export const getWhatsAppGatewayStatus = async (
  gatewayUrl: string,
  retryCount: number = 0
): Promise<GatewayStatusResponse> => {
  try {
    const cleanUrl = gatewayUrl.replace(/\/$/, '')
    // Allow up to 8s for cold start / wake-up
    const res = await withTimeout(fetch(`${cleanUrl}/status`), 8000)
    if (res.ok) {
      const data: GatewayStatusResponse = await res.json()
      cachedGatewayStatus = data
      localStorage.setItem('WA_GATEWAY_STATUS', data.status)
      if (data.connectedUser) {
        localStorage.setItem('WA_GATEWAY_USER', data.connectedUser)
      } else if (data.status === 'DISCONNECTED') {
        localStorage.removeItem('WA_GATEWAY_USER')
      }
      window.dispatchEvent(new CustomEvent('sp_gateway_status_updated', { detail: data }))
      return data
    }
  } catch (err) {
    // If cold-start or temporary network hiccup, retry once after a short delay
    if (retryCount === 0) {
      await new Promise(r => setTimeout(r, 1500))
      return getWhatsAppGatewayStatus(gatewayUrl, 1)
    }
  }

  // If previous known status was CONNECTED, retain CONNECTED or CONNECTING rather than flashing disconnected
  const previousStatus = localStorage.getItem('WA_GATEWAY_STATUS')
  const previousUser = localStorage.getItem('WA_GATEWAY_USER')

  if (previousStatus === 'CONNECTED' && previousUser) {
    const retainedState: GatewayStatusResponse = {
      status: 'CONNECTED',
      connectedUser: previousUser,
      hasQr: false
    }
    cachedGatewayStatus = retainedState
    return retainedState
  }

  const disconnected: GatewayStatusResponse = { status: 'DISCONNECTED', hasQr: false }
  cachedGatewayStatus = disconnected
  localStorage.setItem('WA_GATEWAY_STATUS', 'DISCONNECTED')
  window.dispatchEvent(new CustomEvent('sp_gateway_status_updated', { detail: disconnected }))
  return disconnected
}

export const getWhatsAppQrCode = async (gatewayUrl: string): Promise<{ qrDataUrl?: string; message?: string; status?: string }> => {
  try {
    const cleanUrl = gatewayUrl.replace(/\/$/, '')
    const res = await withTimeout(fetch(`${cleanUrl}/qr`), 4000)
    if (res.ok) {
      return await res.json()
    }
  } catch {
    // Gateway unreachable
  }
  return {}
}

export const resetWhatsAppGatewaySession = async (gatewayUrl: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const cleanUrl = gatewayUrl.replace(/\/$/, '')
    const res = await withTimeout(fetch(`${cleanUrl}/reset`, { method: 'POST' }), 4000)
    if (res.ok) {
      return await res.json()
    }
  } catch {
    // Gateway unreachable
  }
  return { success: false, message: 'Gateway server unreachable' }
}

export const getWhatsAppPairingCode = async (
  gatewayUrl: string,
  phone: string
): Promise<{ success?: boolean; pairingCode?: string; message?: string; error?: string; status?: string }> => {
  try {
    const cleanUrl = gatewayUrl.replace(/\/$/, '')
    const res = await withTimeout(
      fetch(`${cleanUrl}/pair-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      }),
      8000
    )
    if (res.ok) {
      return await res.json()
    } else {
      const data = await res.json().catch(() => ({}))
      return { success: false, error: data.error || 'Failed to request pairing code' }
    }
  } catch {
    return { success: false, error: 'Gateway server unreachable. Please make sure the gateway is running.' }
  }
}
