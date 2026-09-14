import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import QRCode from 'qrcode'
import fs from 'fs'
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001
const API_SECRET = process.env.GATEWAY_API_SECRET || 'tuition-pulse-secret-key'

app.use(cors())
app.use(express.json())

// Global Safety Handlers to prevent server crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception caught:', err.message || err)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection caught:', reason)
})

let socket = null
let latestQrCode = null
let connectionStatus = 'DISCONNECTED' // DISCONNECTED | CONNECTING | CONNECTED
let connectedUser = null

function clearAuthSession() {
  try {
    if (fs.existsSync('auth_info_baileys')) {
      fs.rmSync('auth_info_baileys', { recursive: true, force: true })
      console.log('Cleared old auth_info_baileys session directory.')
    }
  } catch (err) {
    console.error('Error clearing auth session directory:', err)
  }
}

async function connectToWhatsApp() {
  connectionStatus = 'CONNECTING'

  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    const { version } = await fetchLatestBaileysVersion()

    socket = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      defaultQueryTimeoutMs: undefined,
      syncFullHistory: false,
      markOnlineOnConnect: true,
      getMessage: async () => {
        return { conversation: 'Tuition Pulse Notification' }
      }
    })

    socket.ev.on('creds.update', saveCreds)

    socket.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        latestQrCode = qr
        connectionStatus = 'DISCONNECTED'
        console.log('New QR Code generated for WhatsApp pairing')
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 401

        connectionStatus = 'DISCONNECTED'
        latestQrCode = null
        connectedUser = null

        if (shouldReconnect) {
          console.log(`Connection closed (code ${statusCode}), reconnecting...`)
          setTimeout(() => connectToWhatsApp(), 3000)
        } else {
          console.log('Logged out from WhatsApp on device. Clearing session...')
          clearAuthSession()
          setTimeout(() => connectToWhatsApp(), 2000)
        }
      } else if (connection === 'open') {
        connectionStatus = 'CONNECTED'
        latestQrCode = null
        connectedUser = socket.user?.id ? socket.user.id.split(':')[0] : 'Admin'
        console.log(`WhatsApp Connected Successfully! User: ${connectedUser}`)
      }
    })
  } catch (err) {
    console.error('Error in connectToWhatsApp:', err)
    connectionStatus = 'DISCONNECTED'
    setTimeout(() => connectToWhatsApp(), 5000)
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
    hasQr: !!latestQrCode
  })
})

// 2. QR Code Image Endpoint (Data URL)
app.get('/qr', async (req, res) => {
  if (connectionStatus === 'CONNECTED') {
    return res.status(200).json({ status: 'CONNECTED', message: 'Device already paired' })
  }

  if (!latestQrCode) {
    return res.status(503).json({ status: 'WAITING', message: 'QR Code is generating, try again in 3 seconds...' })
  }

  try {
    const qrDataUrl = await QRCode.toDataURL(latestQrCode)
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
  console.log('Manual session reset requested. Re-initializing WhatsApp client...')
  setTimeout(() => connectToWhatsApp(), 1500)

  res.json({ success: true, message: 'Session reset. Generating fresh QR code...' })
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

    // Gateway-Level Deduplication Protection (2-minute cooldown per phone + message text)
    const dedupKey = `${cleanPhone}:${message.trim()}`
    const lastSentTime = sentMessageDeduplication.get(dedupKey)
    const now = Date.now()

    if (lastSentTime && (now - lastSentTime < 120000)) {
      console.log(`[GATEWAY DEDUPLICATED] Ignored duplicate message to ${cleanPhone} within 2 mins.`)
      return res.json({ success: true, messageId: 'DEDUPLICATED_SKIP', note: 'Duplicate message blocked by gateway rate limiter' })
    }

    sentMessageDeduplication.set(dedupKey, now)

    const jid = `${cleanPhone}@s.whatsapp.net`
    const sent = await socket.sendMessage(jid, { text: message })
    res.json({ success: true, messageId: sent?.key?.id || 'SENT' })
  } catch (err) {
    console.error('Error sending WhatsApp message:', err)
    res.status(500).json({ error: err.message || 'Failed to send message' })
  }
})

// Start server and initialize WhatsApp client
app.listen(PORT, () => {
  console.log(`Tuition Pulse WhatsApp Gateway running on port ${PORT}`)
  connectToWhatsApp()
})
