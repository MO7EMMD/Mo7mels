import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import qrcode from 'qrcode-terminal'
import { Client, LocalAuth } from 'whatsapp-web.js'
import * as db from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dbPath = path.join(__dirname, 'data', 'db.json')

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'mo7mels-bot' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  },
})

let whatsappConfig = await db.getWhatsappBotConfig()

async function syncConfig() {
  whatsappConfig = await db.getWhatsappBotConfig()
}

function normalizeCommand(text, prefix) {
  return String(text || '').trim().toLowerCase().startsWith(prefix.toLowerCase())
}

function buildStatusMessage(chatName) {
  const groupCount = whatsappConfig.allowedGroups.length
  const scope = chatName ? `في ${chatName}` : 'في هذه المحادثة'
  return `${whatsappConfig.welcomeMessage}\n\n${scope}.\nالحالة: ${whatsappConfig.lastStatus}\nالمجموعات المفعلة: ${groupCount}`
}

client.on('qr', async (qr) => {
  qrcode.generate(qr, { small: true })
  await db.updateWhatsappBotConfig({
    lastStatus: 'qr',
    lastSeenAt: new Date().toISOString(),
    lastError: '',
  })
})

client.on('authenticated', async () => {
  await db.updateWhatsappBotConfig({
    lastStatus: 'authenticated',
    lastSeenAt: new Date().toISOString(),
    lastError: '',
  })
})

client.on('ready', async () => {
  await db.updateWhatsappBotConfig({
    lastStatus: 'ready',
    lastSeenAt: new Date().toISOString(),
    lastError: '',
  })
  console.log('WhatsApp bot is ready.')
})

client.on('auth_failure', async (message) => {
  console.error('WhatsApp auth failure:', message)
  await db.updateWhatsappBotConfig({
    lastStatus: 'auth_failure',
    lastSeenAt: new Date().toISOString(),
    lastError: String(message || 'Authentication failed'),
  })
})

client.on('disconnected', async (reason) => {
  console.error('WhatsApp bot disconnected:', reason)
  await db.updateWhatsappBotConfig({
    lastStatus: 'disconnected',
    lastSeenAt: new Date().toISOString(),
    lastError: String(reason || 'Disconnected'),
  })
})

client.on('message', async (message) => {
  try {
    whatsappConfig = await db.getWhatsappBotConfig()

    if (!whatsappConfig.enabled) {
      return
    }

    const chat = await message.getChat()
    const isGroup = Boolean(chat?.isGroup)

    if (isGroup) {
      if (!whatsappConfig.replyInGroups) return
      if (
        whatsappConfig.allowedGroups.length > 0 &&
        !whatsappConfig.allowedGroups.includes(chat.id._serialized)
      ) {
        return
      }
    } else if (!whatsappConfig.replyInPrivate) {
      return
    }

    const body = String(message.body || '').trim()
    const prefix = whatsappConfig.commandPrefix || '!bot'

    if (!normalizeCommand(body, prefix)) {
      return
    }

    const command = body.slice(prefix.length).trim().toLowerCase()
    const chatName = chat?.name || chat?.formattedTitle || ''

    if (!command || command === 'help') {
      await message.reply(buildStatusMessage(chatName))
      return
    }

    if (command === 'status') {
      await message.reply(
        `الحالة: ${whatsappConfig.lastStatus}\nالوضع: ${whatsappConfig.enabled ? 'مفعل' : 'متوقف'}\n${buildStatusMessage(chatName)}`,
      )
      return
    }

    if (command === 'groups') {
      const groups = whatsappConfig.allowedGroups.length
        ? whatsappConfig.allowedGroups.map((groupId, index) => `${index + 1}. ${groupId}`).join('\n')
        : 'لا توجد مجموعات مضافة بعد.'
      await message.reply(`المجموعات المسموحة:\n${groups}`)
      return
    }

    await message.reply(buildStatusMessage(chatName))
  } catch (error) {
    console.error('Failed to handle WhatsApp message:', error)
  }
})

await syncConfig()
fs.watchFile(dbPath, { interval: 2000 }, async () => {
  try {
    await syncConfig()
  } catch (error) {
    console.error('Failed to sync WhatsApp bot config:', error)
  }
})

await db.updateWhatsappBotConfig({
  lastStatus: 'starting',
  lastSeenAt: new Date().toISOString(),
  lastError: '',
})

await client.initialize()

process.on('SIGINT', async () => {
  try {
    await db.updateWhatsappBotConfig({
      lastStatus: 'stopped',
      lastSeenAt: new Date().toISOString(),
      lastError: '',
    })
  } catch {
    // ignore shutdown issues
  }
  process.exit(0)
})
