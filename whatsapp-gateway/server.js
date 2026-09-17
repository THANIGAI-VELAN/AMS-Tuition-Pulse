import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import QRCode from 'qrcode'
import fs from 'fs'
import pino from 'pino'
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} from '@whiskeysockets/baileys'

dotenv.config()

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

// Message cache for multi-device encryption retries
// Fixes "Waiting for this message. This may take a while" in WhatsApp
const msgRetryCache = new Map()

function clearAuthSession() {
  try {
    if (fs.existsSync('auth_info_baileys')) {
      fs.rmSync('auth_info_baileys', { recursive: true, force: true })
      console.log('[GATEWAY] Cleared auth session directory.')
    }
  } catch (err) {
    console.error('[GATEWAY] Error clearing auth session:', err)
  }
}

async function connectToWhatsApp() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  // Safely teardown any previous socket listeners and connection
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
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    const { version, isLatest } = await fetchLatestBaileysVersion()
    console.log(`[GATEWAY] Using Baileys v${version.join('.')}, isLatest: ${isLatest}`)

    socket = makeWASocket({
      version,
      logger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      browser: Browsers.ubuntu('Chrome'),
      printQRInTerminal: false,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      retryRequestDelayMs: 500,
      maxRetries: 5,
      syncFullHistory: false,
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: false,
      getMessage: async (key) => {
        if (key.id && msgRetryCache.has(key.id)) {
          const cached = msgRetryCache.get(key.id)
          return cached
        }
        return { conversation: 'SP Academy Tuition Notification' }
      }
    })

    socket.ev.on('creds.update', saveCreds)

    socket.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        latestQrCode = qr
        if (connectionStatus !== 'CONNECTED') {
          connectionStatus = 'DISCONNECTED'
        }
        console.log('[GATEWAY] Fresh pairing QR code generated.')
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.statusCode
        const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401
        const shouldReconnect = !isLoggedOut

        latestQrCode = null

        console.log(`[GATEWAY] Connection closed (Status Code: ${statusCode}). Reconnect allowed: ${shouldReconnect}`)

        if (shouldReconnect) {
          connectionStatus = 'CONNECTING'
          // 515 = restartRequired (WhatsApp sends this when phone pairing succeeds to establish registered state)
          const delay = statusCode === DisconnectReason.restartRequired ? 1500 : 3000
          reconnectTimer = setTimeout(() => connectToWhatsApp(), delay)
        } else {
          console.log('[GATEWAY] Session logged out from phone. Resetting auth...')
          connectionStatus = 'DISCONNECTED'
          connectedUser = null
          clearAuthSession()
          reconnectTimer = setTimeout(() => connectToWhatsApp(), 2000)
        }
      } else if (connection === 'open') {
        connectionStatus = 'CONNECTED'
        latestQrCode = null
        const userJid = socket?.user?.id || ''
        connectedUser = userJid ? userJid.split(':')[0].replace(/[^0-9]/g, '') : (connectedUser || 'Admin')
        console.log(`[GATEWAY] WhatsApp Connected Successfully! User Phone: +${connectedUser}`)
      }
    })
  } catch (err) {
    console.error('[GATEWAY] Error in connectToWhatsApp:', err)
    connectionStatus = 'CONNECTING'
    reconnectTimer = setTimeout(() => connectToWhatsApp(), 5000)
  }
}

// 24/7 Keep-Alive Self Ping to prevent Render.com free tier from sleeping
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
}, 7 * 60 * 1000) // Ping every 7 minutes

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

// 3.5 Pairing Code Endpoint (For Single-Device Linking on Mobile)
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
    // Reset session to ensure fresh pairing keys & socket
    console.log(`[GATEWAY] Requesting fresh pairing session for +${cleanPhone}...`)
    clearAuthSession()
    await connectToWhatsApp()

    // Wait until the socket WebSocket connection opens (up to 8 seconds)
    let attempts = 0
    while ((!socket || !socket.ws || socket.ws.readyState !== 1) && attempts < 32) {
      await new Promise(r => setTimeout(r, 250))
      attempts++
    }

    if (!socket) {
      throw new Error('Gateway socket failed to initialize')
    }

    // Small delay to ensure handshake readiness
    await new Promise(r => setTimeout(r, 600))

    const code = await socket.requestPairingCode(cleanPhone)
    const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code
    console.log(`[GATEWAY] Pairing code generated successfully for +${cleanPhone}: ${formattedCode}`)
    res.json({ success: true, pairingCode: formattedCode, rawCode: code, phone: cleanPhone })
  } catch (err) {
    console.error('[GATEWAY] Error generating pairing code:', err)
    res.status(500).json({
      error: err.message || 'Failed to generate pairing code from WhatsApp. Try resetting the session first.'
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
    return res.status(503).json({ error: 'WhatsApp is not connected. Please scan QR code in settings.' })
  }

  try {
    const isGroup = String(phone).endsWith('@g.us')
    const targetJid = isGroup ? phone : formatPhoneToJid(phone)

    // High-speed deduplication protection (5-second throttle per identical message to same destination)
    const dedupKey = `${targetJid}:${message.trim()}`
    const lastSentTime = sentMessageDeduplication.get(dedupKey)
    const now = Date.now()

    if (lastSentTime && (now - lastSentTime < 5000)) {
      console.log(`[GATEWAY] Skipped duplicate send to ${targetJid} within 5s.`)
      return res.json({ success: true, messageId: 'DEDUPLICATED_SKIP', note: 'Duplicate message skipped' })
    }

    sentMessageDeduplication.set(dedupKey, now)
    if (sentMessageDeduplication.size > 500) {
      sentMessageDeduplication.clear()
    }

    const sent = await socket.sendMessage(targetJid, { text: message })

    if (sent?.key?.id) {
      // Cache message content for encryption retry handshakes
      msgRetryCache.set(sent.key.id, { conversation: message })
      if (msgRetryCache.size > 1000) {
        const firstKey = msgRetryCache.keys().next().value
        msgRetryCache.delete(firstKey)
      }
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
