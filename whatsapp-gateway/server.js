import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import QRCode from 'qrcode'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pino from 'pino'
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} from '@whiskeysockets/baileys'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys')
const MSG_STORE_FILE = path.join(AUTH_DIR, 'messages_cache.json')

const app = express()
const PORT = process.env.PORT || 3001
const API_SECRET = process.env.GATEWAY_API_SECRET || 'tuition-pulse-secret-key'

const logger = pino({ level: 'error' })

app.use(cors())
app.use(express.json())

// Global Safety Handlers to prevent server crashes
process.on('uncaughtException', (err) => {
  console.error('[GATEWAY] Uncaught Exception:', err.message || err)
})

process.on('unhandledRejection', (reason) => {
  console.error('[GATEWAY] Unhandled Rejection:', reason)
})

let socket = null
let latestQrCode = null
let connectionStatus = 'DISCONNECTED' // DISCONNECTED | CONNECTING | CONNECTED
let connectedUser = null
let reconnectTimer = null
let isConnecting = false
let isPairingInProgress = false

// ============================================================================
// Robust Message Store for Multi-Device E2EE Retries
// Resolves "Waiting for this message. This may take a while" in WhatsApp
// ============================================================================
const memoryMessageStore = new Map()

// Load persisted messages from disk on startup
function loadMessageStore() {
  try {
    if (fs.existsSync(MSG_STORE_FILE)) {
      const data = JSON.parse(fs.readFileSync(MSG_STORE_FILE, 'utf-8'))
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item?.id && item?.message) {
            memoryMessageStore.set(item.id, item.message)
            if (item.remoteJid) {
              memoryMessageStore.set(`${item.remoteJid}_${item.id}`, item.message)
            }
          }
        }
        console.log(`[GATEWAY] Loaded ${data.length} cached messages for retry resolution.`)
      }
    }
  } catch (e) {
    console.warn('[GATEWAY] Could not load message cache:', e.message)
  }
}

// Persist messages periodically to disk (keeping last 1000 messages)
let saveStoreTimeout = null
function persistMessageStore() {
  if (saveStoreTimeout) return
  saveStoreTimeout = setTimeout(() => {
    saveStoreTimeout = null
    try {
      if (!fs.existsSync(AUTH_DIR)) return
      const list = []
      for (const [key, msg] of memoryMessageStore.entries()) {
        if (!key.includes('_')) {
          list.push({ id: key, message: msg })
        }
      }
      const trimmed = list.slice(-1000)
      fs.writeFileSync(MSG_STORE_FILE, JSON.stringify(trimmed))
    } catch (e) {
      // ignore
    }
  }, 3000)
}

function saveMessageToStore(id, messageProto, remoteJid) {
  if (!id || !messageProto) return
  memoryMessageStore.set(id, messageProto)
  if (remoteJid) {
    memoryMessageStore.set(`${remoteJid}_${id}`, messageProto)
  }
  // Keep memory map bounded
  if (memoryMessageStore.size > 2000) {
    const firstKey = memoryMessageStore.keys().next().value
    memoryMessageStore.delete(firstKey)
  }
  persistMessageStore()
}

function getStoredMessage(id, remoteJid) {
  if (!id) return undefined
  if (remoteJid && memoryMessageStore.has(`${remoteJid}_${id}`)) {
    return memoryMessageStore.get(`${remoteJid}_${id}`)
  }
  if (memoryMessageStore.has(id)) {
    return memoryMessageStore.get(id)
  }
  return undefined
}

// Retry counter cache store for Baileys
const retryCounterMap = new Map()
const msgRetryCounterCache = {
  get: (key) => retryCounterMap.get(key),
  set: (key, val) => retryCounterMap.set(key, val),
  del: (key) => retryCounterMap.delete(key),
  flushAll: () => retryCounterMap.clear()
}

function clearAuthSession() {
  try {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true })
      console.log(`[GATEWAY] Cleared auth session directory at: ${AUTH_DIR}`)
    }
    memoryMessageStore.clear()
    retryCounterMap.clear()
  } catch (err) {
    console.error('[GATEWAY] Error clearing auth session:', err)
  }
}

async function connectToWhatsApp(isPairingSetup = false) {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  if (isConnecting && !isPairingSetup) {
    console.log('[GATEWAY] Connection already in progress, skipping duplicate call.')
    return socket
  }

  isConnecting = true

  // Safely teardown previous socket listeners and close old connection
  if (socket) {
    try {
      socket.ev.removeAllListeners('creds.update')
      socket.ev.removeAllListeners('connection.update')
      socket.ev.removeAllListeners('messages.upsert')
      socket.end(undefined)
    } catch (e) {
      // ignore
    }
    socket = null
  }

  connectionStatus = 'CONNECTING'
  console.log('[GATEWAY] Initializing WhatsApp connection...')

  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
    const { version, isLatest } = await fetchLatestBaileysVersion()
    console.log(`[GATEWAY] Using Baileys v${version.join('.')}, isLatest: ${isLatest}`)

    loadMessageStore()

    socket = makeWASocket({
      version,
      logger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      msgRetryCounterCache,
      // Standard browser signature required for pairing code companion devices
      browser: Browsers.ubuntu('Chrome'),
      printQRInTerminal: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      retryRequestDelayMs: 500,
      maxRetries: 5,
      syncFullHistory: false,
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: false,
      getMessage: async (key) => {
        if (!key?.id) return undefined
        const found = getStoredMessage(key.id, key.remoteJid)
        if (found) {
          return found
        }
        return undefined
      }
    })

    // Capture all incoming and outgoing messages to answer E2EE retry challenges
    socket.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        if (msg.key?.id && msg.message) {
          saveMessageToStore(msg.key.id, msg.message, msg.key.remoteJid)
        }
      }
    })

    socket.ev.on('creds.update', async () => {
      try {
        await saveCreds()
      } catch (err) {
        console.error('[GATEWAY] Error saving credentials:', err)
      }
    })

    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr && !isPairingInProgress) {
        latestQrCode = qr
        if (connectionStatus !== 'CONNECTED') {
          connectionStatus = 'DISCONNECTED'
        }
        console.log('[GATEWAY] Fresh pairing QR code generated.')
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.statusCode
        latestQrCode = null
        isConnecting = false

        // 515 = restartRequired (WhatsApp sends this when phone pairing succeeds to finalize registration)
        const isRestartRequired = statusCode === DisconnectReason.restartRequired || statusCode === 515
        const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401

        console.log(`[GATEWAY] Connection closed (Status Code: ${statusCode}). isRestartRequired: ${isRestartRequired}, isLoggedOut: ${isLoggedOut}`)

        if (isRestartRequired) {
          console.log('[GATEWAY] Pairing confirmed by device! Restarting with registered credentials...')
          isPairingInProgress = false
          connectionStatus = 'CONNECTING'
          reconnectTimer = setTimeout(() => connectToWhatsApp(), 1000)
        } else if (isLoggedOut && !isPairingInProgress && state.creds.registered) {
          // Only clear session if user explicitly unlinked an ALREADY registered session from their phone
          console.log('[GATEWAY] Session unlinked from WhatsApp device. Resetting auth...')
          connectionStatus = 'DISCONNECTED'
          connectedUser = null
          clearAuthSession()
          reconnectTimer = setTimeout(() => connectToWhatsApp(), 2000)
        } else {
          // Any other network drop, timeout, or intermediate pairing reconnect -> Auto-reconnect!
          console.log('[GATEWAY] Temporary connection drop. Reconnecting in 2.5s...')
          connectionStatus = 'CONNECTING'
          reconnectTimer = setTimeout(() => connectToWhatsApp(), 2500)
        }
      } else if (connection === 'open') {
        isConnecting = false
        isPairingInProgress = false
        connectionStatus = 'CONNECTED'
        latestQrCode = null
        const userJid = socket?.user?.id || ''
        connectedUser = userJid ? userJid.split(':')[0].replace(/[^0-9]/g, '') : (connectedUser || 'Admin')
        console.log(`[GATEWAY] WhatsApp Connected Successfully! User Phone: +${connectedUser}`)
      }
    })

    isConnecting = false
    return socket
  } catch (err) {
    console.error('[GATEWAY] Error in connectToWhatsApp:', err)
    isConnecting = false
    connectionStatus = 'CONNECTING'
    reconnectTimer = setTimeout(() => connectToWhatsApp(), 5000)
    return null
  }
}

// 24/7 Keep-Alive Self Ping to prevent cloud servers (e.g. Render) from sleeping
const SELF_PING_URL = process.env.RENDER_EXTERNAL_URL || 'https://tuition-pulse-gateway.onrender.com'
setInterval(async () => {
  try {
    const res = await fetch(`${SELF_PING_URL.replace(/\/$/, '')}/status`)
    if (res.ok) {
      console.log(`[GATEWAY] 24/7 Keep-Alive heartbeat OK (${new Date().toLocaleTimeString()})`)
    }
  } catch (e) {
    // ignore
  }
}, 5 * 60 * 1000) // Ping every 5 minutes

// Security Middleware
const verifySecret = (req, res, next) => {
  const secret = req.headers['x-api-secret'] || req.query.secret
  if (secret !== API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API Secret' })
  }
  next()
}

// 1. Connection Status Endpoint
app.get('/status', (req, res) => {
  res.json({
    status: connectionStatus,
    connectedUser: connectedUser,
    hasQr: !!latestQrCode,
    uptime: Math.round(process.uptime())
  })
})

// 2. QR Code Image Endpoint (Data URL)
app.get('/qr', async (req, res) => {
  if (connectionStatus === 'CONNECTED') {
    return res.status(200).json({ status: 'CONNECTED', message: 'Device already paired' })
  }

  if (!latestQrCode) {
    return res.status(503).json({ status: 'WAITING', message: 'Generating fresh QR code, retry in 2 seconds...' })
  }

  try {
    const qrDataUrl = await QRCode.toDataURL(latestQrCode, { margin: 2, scale: 7 })
    res.json({ status: 'DISCONNECTED', qrDataUrl })
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR image' })
  }
})

// 3. Reset Session Endpoint (Force Fresh Session)
app.post('/reset', (req, res) => {
  connectionStatus = 'DISCONNECTED'
  connectedUser = null
  latestQrCode = null
  isPairingInProgress = false

  if (socket) {
    try {
      socket.ev.removeAllListeners('creds.update')
      socket.ev.removeAllListeners('connection.update')
      socket.ev.removeAllListeners('messages.upsert')
      socket.end(undefined)
    } catch (e) {
      // ignore
    }
    socket = null
  }

  clearAuthSession()
  console.log('[GATEWAY] Manual session reset triggered.')
  reconnectTimer = setTimeout(() => connectToWhatsApp(), 1500)

  res.json({ success: true, message: 'Session reset. Generating fresh session...' })
})

// 3.5 Pairing Code Endpoint (For Phone Pairing without camera)
app.post('/pair-code', async (req, res) => {
  const { phone } = req.body
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' })
  }

  // Normalize phone number (strip all non-digits and leading zeros)
  let cleanPhone = String(phone).replace(/[^0-9]/g, '')
  while (cleanPhone.startsWith('0')) {
    cleanPhone = cleanPhone.substring(1)
  }

  // Default to India country code (91) if 10 digits
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`
  }

  if (cleanPhone.length < 10 || cleanPhone.length > 15) {
    return res.status(400).json({ error: 'Invalid phone number. Please include valid country code (e.g. 919876543210).' })
  }

  if (connectionStatus === 'CONNECTED' && socket) {
    return res.json({ status: 'CONNECTED', message: 'WhatsApp is already connected!' })
  }

  try {
    isPairingInProgress = true
    console.log(`[GATEWAY] Requesting fresh pairing session for +${cleanPhone}...`)

    // Clean out old unregistered keys so we start with a clean pairing slate
    clearAuthSession()
    await connectToWhatsApp(true)

    // Wait until the socket WebSocket connection opens (up to 10 seconds)
    let attempts = 0
    while ((!socket || !socket.ws || socket.ws.readyState !== 1) && attempts < 40) {
      await new Promise(r => setTimeout(r, 250))
      attempts++
    }

    if (!socket) {
      throw new Error('Gateway socket failed to initialize')
    }

    // Small delay to allow handshake packet readiness
    await new Promise(r => setTimeout(r, 1000))

    if (socket.authState?.creds?.registered) {
      return res.json({ status: 'CONNECTED', message: 'WhatsApp is already connected!' })
    }

    const code = await socket.requestPairingCode(cleanPhone)
    const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code
    console.log(`[GATEWAY] Pairing code generated successfully for +${cleanPhone}: ${formattedCode}`)
    res.json({ success: true, pairingCode: formattedCode, rawCode: code, phone: cleanPhone })
  } catch (err) {
    isPairingInProgress = false
    console.error('[GATEWAY] Error generating pairing code:', err)
    res.status(500).json({
      error: err.message || 'Failed to generate pairing code from WhatsApp. Please retry in a moment.'
    })
  }
})

const sentMessageDeduplication = new Map()

function formatPhoneToJid(phone) {
  let clean = String(phone).replace(/[^0-9]/g, '')
  while (clean.startsWith('0')) {
    clean = clean.substring(1)
  }
  if (clean.length === 10) {
    clean = `91${clean}`
  }
  return `${clean}@s.whatsapp.net`
}

// 4. Send Message Endpoint (Supports individual phone numbers and @g.us group JIDs)
app.post('/send', verifySecret, async (req, res) => {
  const { phone, message } = req.body

  if (!phone || !message) {
    return res.status(400).json({ error: 'Phone number/Group ID and message text are required' })
  }

  if (connectionStatus !== 'CONNECTED' || !socket) {
    return res.status(503).json({ error: 'WhatsApp is not connected. Please connect WhatsApp in settings.' })
  }

  try {
    const isGroup = String(phone).endsWith('@g.us')
    const targetJid = isGroup ? phone : formatPhoneToJid(phone)

    // Deduplication protection (3-second throttle per identical message to same destination)
    const dedupKey = `${targetJid}:${message.trim()}`
    const lastSentTime = sentMessageDeduplication.get(dedupKey)
    const now = Date.now()

    if (lastSentTime && (now - lastSentTime < 3000)) {
      console.log(`[GATEWAY] Skipped duplicate send to ${targetJid} within 3s.`)
      return res.json({ success: true, messageId: 'DEDUPLICATED_SKIP', note: 'Duplicate message skipped' })
    }

    sentMessageDeduplication.set(dedupKey, now)
    if (sentMessageDeduplication.size > 500) {
      sentMessageDeduplication.clear()
    }

    // Send the message via socket
    const sent = await socket.sendMessage(targetJid, { text: message })

    if (sent?.key?.id && sent?.message) {
      // Immediately cache full proto message for multi-device encryption retries
      saveMessageToStore(sent.key.id, sent.message, targetJid)
    }

    console.log(`[GATEWAY] Message sent successfully to ${targetJid}. MsgId: ${sent?.key?.id || 'OK'}`)
    res.json({ success: true, messageId: sent?.key?.id || `GW_${Date.now()}`, jid: targetJid })
  } catch (err) {
    console.error('[GATEWAY] Error sending WhatsApp message:', err)
    res.status(500).json({ error: err.message || 'Failed to send message' })
  }
})

// 5. Create WhatsApp Group Endpoint
app.post('/groups/create', verifySecret, async (req, res) => {
  const { groupName, phones } = req.body

  if (!groupName) {
    return res.status(400).json({ error: 'groupName is required' })
  }

  if (connectionStatus !== 'CONNECTED' || !socket) {
    return res.status(503).json({ error: 'WhatsApp is not connected. Please connect WhatsApp first.' })
  }

  try {
    const validPhones = Array.isArray(phones) ? phones : []
    const participantJids = validPhones
      .map(p => formatPhoneToJid(p))
      .filter((jid, idx, arr) => arr.indexOf(jid) === idx)

    console.log(`[GATEWAY] Creating WhatsApp group "${groupName}" with ${participantJids.length} participants...`)
    const group = await socket.groupCreate(groupName, participantJids)
    const groupId = group?.id

    let inviteCode = ''
    let inviteUrl = ''
    try {
      if (groupId) {
        inviteCode = await socket.groupInviteCode(groupId)
        if (inviteCode) {
          inviteUrl = `https://chat.whatsapp.com/${inviteCode}`
        }
      }
    } catch (e) {
      console.warn('[GATEWAY] Could not fetch group invite code immediately:', e.message)
    }

    console.log(`[GATEWAY] Group created successfully: ${groupName} (${groupId})`)
    res.json({
      success: true,
      groupId,
      groupName,
      inviteCode,
      inviteUrl,
      participantCount: participantJids.length
    })
  } catch (err) {
    console.error('[GATEWAY] Error creating WhatsApp group:', err)
    res.status(500).json({ error: err.message || 'Failed to create WhatsApp group' })
  }
})

// 6. Sync / Add Participants to Group
app.post('/groups/sync', verifySecret, async (req, res) => {
  const { groupId, phones } = req.body

  if (!groupId || !phones || !Array.isArray(phones)) {
    return res.status(400).json({ error: 'groupId and array of phones are required' })
  }

  if (connectionStatus !== 'CONNECTED' || !socket) {
    return res.status(503).json({ error: 'WhatsApp is not connected.' })
  }

  try {
    const participantJids = phones
      .map(p => formatPhoneToJid(p))
      .filter((jid, idx, arr) => arr.indexOf(jid) === idx)

    if (participantJids.length > 0) {
      const response = await socket.groupParticipantsUpdate(groupId, participantJids, 'add')
      console.log(`[GATEWAY] Synced participants to group ${groupId}:`, response)
    }

    res.json({ success: true, message: `Attempted adding ${participantJids.length} participants to group.` })
  } catch (err) {
    console.error('[GATEWAY] Error syncing group participants:', err)
    res.status(500).json({ error: err.message || 'Failed to sync group participants' })
  }
})

// 7. List Participating Groups
app.get('/groups', verifySecret, async (req, res) => {
  if (connectionStatus !== 'CONNECTED' || !socket) {
    return res.status(503).json({ error: 'WhatsApp is not connected.' })
  }

  try {
    const groups = await socket.groupFetchAllParticipating()
    const groupList = Object.values(groups).map(g => ({
      id: g.id,
      subject: g.subject,
      creation: g.creation,
      owner: g.owner,
      size: g.participants?.length || 0
    }))
    res.json({ success: true, groups: groupList })
  } catch (err) {
    console.error('[GATEWAY] Error listing WhatsApp groups:', err)
    res.status(500).json({ error: err.message || 'Failed to list WhatsApp groups' })
  }
})

// Start server and initialize WhatsApp client
app.listen(PORT, () => {
  console.log(`[GATEWAY] Tuition Pulse WhatsApp Gateway running on port ${PORT}`)
  connectToWhatsApp()
})
