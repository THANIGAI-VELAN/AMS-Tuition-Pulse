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
      browser: Browsers.windows('Desktop'),
      printQRInTerminal: false,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      retryRequestDelayMs: 250,
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
        connectionStatus = 'DISCONNECTED'
        console.log('[GATEWAY] Fresh pairing QR code generated.')
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 401

        connectionStatus = 'DISCONNECTED'
        latestQrCode = null
        connectedUser = null

        console.log(`[GATEWAY] Connection closed (Status Code: ${statusCode}). Reconnect allowed: ${shouldReconnect}`)

        if (shouldReconnect) {
          const delay = statusCode === DisconnectReason.restartRequired ? 1000 : 3000
          reconnectTimer = setTimeout(() => connectToWhatsApp(), delay)
        } else {
          console.log('[GATEWAY] Session logged out from phone. Resetting auth...')
          clearAuthSession()
          reconnectTimer = setTimeout(() => connectToWhatsApp(), 2000)
        }
      } else if (connection === 'open') {
        connectionStatus = 'CONNECTED'
        latestQrCode = null
        connectedUser = socket.user?.id ? socket.user.id.split(':')[0] : 'Admin'
        console.log(`[GATEWAY] WhatsApp Connected Successfully! User Phone: +${connectedUser}`)
      }
    })
  } catch (err) {
    console.error('[GATEWAY] Error in connectToWhatsApp:', err)
    connectionStatus = 'DISCONNECTED'
    reconnectTimer = setTimeout(() => connectToWhatsApp(), 5000)
  }
}

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

// 3. Reset Session Endpoint (Force Fresh QR Code)
app.post('/reset', (req, res) => {
  connectionStatus = 'DISCONNECTED'
  connectedUser = null
  latestQrCode = null

  if (socket) {
    try {
      socket.end()
    } catch (e) {
      // ignore
    }
    socket = null
  }

  clearAuthSession()
  console.log('[GATEWAY] Manual session reset triggered.')
  reconnectTimer = setTimeout(() => connectToWhatsApp(), 1500)

  res.json({ success: true, message: 'Session reset. Generating fresh QR code...' })
})

// 3.5 Pairing Code Endpoint (For Single-Device Linking on Mobile)
app.post('/pair-code', async (req, res) => {
  const { phone } = req.body
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' })
  }

  let cleanPhone = phone.replace(/[^0-9]/g, '')
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`
  }

  if (connectionStatus === 'CONNECTED') {
    return res.status(200).json({ status: 'CONNECTED', message: 'WhatsApp is already connected!' })
  }

  if (!socket) {
    return res.status(503).json({ error: 'Gateway socket is still initializing, please retry in 2 seconds.' })
  }

  try {
    const code = await socket.requestPairingCode(cleanPhone)
    const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code
    console.log(`[GATEWAY] Pairing code generated for +${cleanPhone}: ${formattedCode}`)
    res.json({ success: true, pairingCode: formattedCode })
  } catch (err) {
    console.error('[GATEWAY] Error generating pairing code:', err)
    res.status(500).json({ error: err.message || 'Failed to generate pairing code from WhatsApp' })
  }
})

const sentMessageDeduplication = new Map()

// 4. Send Message Endpoint
app.post('/send', verifySecret, async (req, res) => {
  const { phone, message } = req.body

  if (!phone || !message) {
    return res.status(400).json({ error: 'Phone number and message text are required' })
  }

  if (connectionStatus !== 'CONNECTED' || !socket) {
    return res.status(503).json({ error: 'WhatsApp is not connected. Please scan QR code in settings.' })
  }

  try {
    let cleanPhone = phone.replace(/[^0-9]/g, '')
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`
    }

    // High-speed deduplication protection (5-second throttle per identical message to same phone)
    const dedupKey = `${cleanPhone}:${message.trim()}`
    const lastSentTime = sentMessageDeduplication.get(dedupKey)
    const now = Date.now()

    if (lastSentTime && (now - lastSentTime < 5000)) {
      console.log(`[GATEWAY] Skipped duplicate send to ${cleanPhone} within 5s.`)
      return res.json({ success: true, messageId: 'DEDUPLICATED_SKIP', note: 'Duplicate message skipped' })
    }

    sentMessageDeduplication.set(dedupKey, now)
    if (sentMessageDeduplication.size > 500) {
      sentMessageDeduplication.clear()
    }

    const jid = `${cleanPhone}@s.whatsapp.net`
    const sent = await socket.sendMessage(jid, { text: message })

    if (sent?.key?.id) {
      // Cache message content for encryption retry handshakes
      msgRetryCache.set(sent.key.id, { conversation: message })
      if (msgRetryCache.size > 1000) {
        const firstKey = msgRetryCache.keys().next().value
        msgRetryCache.delete(firstKey)
      }
    }

    console.log(`[GATEWAY] Message sent successfully to ${cleanPhone}. MsgId: ${sent?.key?.id || 'OK'}`)
    res.json({ success: true, messageId: sent?.key?.id || `GW_${Date.now()}` })
  } catch (err) {
    console.error('[GATEWAY] Error sending WhatsApp message:', err)
    res.status(500).json({ error: err.message || 'Failed to send message' })
  }
})

// Start server and initialize WhatsApp client
app.listen(PORT, () => {
  console.log(`[GATEWAY] Tuition Pulse WhatsApp Gateway running on port ${PORT}`)
  connectToWhatsApp()
})
