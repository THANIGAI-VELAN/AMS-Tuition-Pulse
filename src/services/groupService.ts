import { supabase } from './supabase'
import { ClassGroup, ClassName, Student } from '../types/database.types'
import { getLocalClassGroups, saveLocalClassGroups } from '../utils/offlineStorage'
import { withTimeout } from '../utils/asyncUtils'
import { getEffectiveGatewayUrl } from './notificationService'

let inMemoryClassGroups: ClassGroup[] | null = null

export const getCachedClassGroups = (): ClassGroup[] => {
  const groups = inMemoryClassGroups || getLocalClassGroups()
  inMemoryClassGroups = groups
  return groups
}

/**
 * Fetch all registered Class WhatsApp Groups from Supabase / offline cache
 */
export const fetchClassGroups = async (): Promise<ClassGroup[]> => {
  const currentCached = getCachedClassGroups()

  try {
    const res = await withTimeout(
      supabase
        .from('class_groups')
        .select('*')
        .order('class_name', { ascending: true }),
      3500
    )

    if (res.data && res.data.length > 0) {
      const remoteGroups = res.data as ClassGroup[]
      const merged = remoteGroups.map(remote => {
        const local = currentCached.find(c => c.class_name === remote.class_name)
        return {
          ...local,
          ...remote
        }
      })
      inMemoryClassGroups = merged
      saveLocalClassGroups(merged)
      return merged
    }
  } catch (err) {
    console.warn('Supabase fetchClassGroups notice:', err)
  }

  return currentCached
}

/**
 * Save / update Class WhatsApp Group mapping in Supabase and offline storage
 */
export const saveClassGroupMapping = async (group: ClassGroup): Promise<ClassGroup> => {
  const current = getCachedClassGroups()
  const next = [...current.filter(g => g.class_name !== group.class_name), group]
  inMemoryClassGroups = next
  saveLocalClassGroups(next)

  try {
    const nowIso = new Date().toISOString()
    const { data } = await supabase
      .from('class_groups')
      .select('id')
      .eq('class_name', group.class_name)
      .limit(1)

    const existing = data && data.length > 0 ? data[0] : null

    if (existing && existing.id) {
      await withTimeout(
        supabase
          .from('class_groups')
          .update({
            group_jid: group.group_jid,
            group_name: group.group_name,
            invite_url: group.invite_url || null,
            participant_count: group.participant_count || 0,
            updated_at: nowIso
          })
          .eq('id', existing.id),
        3000
      )
    } else {
      await withTimeout(
        supabase
          .from('class_groups')
          .insert([{
            class_name: group.class_name,
            group_jid: group.group_jid,
            group_name: group.group_name,
            invite_url: group.invite_url || null,
            participant_count: group.participant_count || 0,
            updated_at: nowIso
          }]),
        3000
      )
    }
  } catch (err) {
    console.warn('Supabase saveClassGroupMapping notice:', err)
  }

  return group
}

/**
 * Create a new WhatsApp Group for a class on the connected WhatsApp device
 */
export const createClassWhatsAppGroup = async (
  className: ClassName,
  students: Student[],
  customName?: string
): Promise<{ success: boolean; group?: ClassGroup; error?: string }> => {
  const gatewayUrl = getEffectiveGatewayUrl().replace(/\/$/, '')
  const groupName = customName || `SP Academy - ${className} Standard`

  // Extract all valid parent phone numbers for this class
  const classStudents = students.filter(s => s.class_name === className && s.active)
  const phones = classStudents
    .map(s => s.whatsapp_phone || s.parent_phone)
    .filter(p => p && p.trim().length >= 10)

  try {
    const res = await withTimeout(
      fetch(`${gatewayUrl}/groups/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-secret': 'tuition-pulse-secret-key'
        },
        body: JSON.stringify({
          groupName,
          phones
        })
      }),
      15000
    )

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      return { success: false, error: errData.error || `Gateway returned HTTP ${res.status}` }
    }

    const data = await res.json()
    if (!data.success || !data.groupId) {
      return { success: false, error: data.error || 'Failed to create group on WhatsApp' }
    }

    const nowIso = new Date().toISOString()
    const newClassGroup: ClassGroup = {
      id: `cg-${className}-${Date.now()}`,
      class_name: className,
      group_jid: data.groupId,
      group_name: data.groupName || groupName,
      invite_url: data.inviteUrl || undefined,
      participant_count: data.participantCount || phones.length,
      created_at: nowIso,
      updated_at: nowIso
    }

    await saveClassGroupMapping(newClassGroup)
    return { success: true, group: newClassGroup }
  } catch (err: any) {
    console.error('Error creating class WhatsApp group:', err)
    return { success: false, error: err?.message || 'Network error connecting to WhatsApp Gateway' }
  }
}

/**
 * Sync active student parent phone numbers to an existing WhatsApp Group
 */
export const syncClassWhatsAppGroup = async (
  group: ClassGroup,
  students: Student[]
): Promise<{ success: boolean; error?: string }> => {
  const gatewayUrl = getEffectiveGatewayUrl().replace(/\/$/, '')
  const classStudents = students.filter(s => s.class_name === group.class_name && s.active)
  const phones = classStudents
    .map(s => s.whatsapp_phone || s.parent_phone)
    .filter(p => p && p.trim().length >= 10)

  try {
    const res = await withTimeout(
      fetch(`${gatewayUrl}/groups/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-secret': 'tuition-pulse-secret-key'
        },
        body: JSON.stringify({
          groupId: group.group_jid,
          phones
        })
      }),
      10000
    )

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      return { success: false, error: errData.error || `Gateway returned HTTP ${res.status}` }
    }

    const data = await res.json()
    if (data.success) {
      const updated: ClassGroup = {
        ...group,
        participant_count: phones.length,
        updated_at: new Date().toISOString()
      }
      await saveClassGroupMapping(updated)
      return { success: true }
    }

    return { success: false, error: data.error || 'Sync failed' }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error syncing group' }
  }
}

/**
 * Dispatch an announcement message to a Class WhatsApp Group
 */
export const sendClassGroupAnnouncement = async (
  groupJid: string,
  messageText: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const gatewayUrl = getEffectiveGatewayUrl().replace(/\/$/, '')

  try {
    const res = await withTimeout(
      fetch(`${gatewayUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-secret': 'tuition-pulse-secret-key'
        },
        body: JSON.stringify({
          phone: groupJid,
          message: messageText
        })
      }),
      10000
    )

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      return { success: false, error: errData.error || `HTTP ${res.status}` }
    }

    const data = await res.json()
    if (data.success) {
      return { success: true, messageId: data.messageId }
    }

    return { success: false, error: data.error || 'Failed to dispatch group message' }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error dispatching group message' }
  }
}

/**
 * Broadcast message individually to all parents in a class batch
 */
export const sendClassBroadcastBatch = async (
  students: Student[],
  messageText: string,
  onProgress?: (sent: number, total: number) => void
): Promise<{ sentCount: number; failedCount: number }> => {
  const gatewayUrl = getEffectiveGatewayUrl().replace(/\/$/, '')
  let sentCount = 0
  let failedCount = 0
  const total = students.length

  for (let i = 0; i < students.length; i++) {
    const s = students[i]
    const phone = s.whatsapp_phone || s.parent_phone
    if (!phone) {
      failedCount++
      continue
    }

    try {
      const res = await fetch(`${gatewayUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-secret': 'tuition-pulse-secret-key'
        },
        body: JSON.stringify({
          phone,
          message: messageText
        })
      })

      if (res.ok) {
        sentCount++
      } else {
        failedCount++
      }
    } catch {
      failedCount++
    }

    if (onProgress) {
      onProgress(i + 1, total)
    }

    // Small delay between batch sends to prevent rate limits
    if (i < students.length - 1) {
      await new Promise(r => setTimeout(r, 600))
    }
  }

  return { sentCount, failedCount }
}
