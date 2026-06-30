require('dotenv').config();

const mineflayer = require('mineflayer')
const { TelegramBot } = require('node-telegram-bot-api')
const AutoAuth = require('mineflayer-auto-auth')

const tg = new TelegramBot(process.env.TG_API, { polling: true })
const CHAT_ID = '1078401181'

let mcBot = null

function startMc() {
  if (mcBot) { tg.sendMessage(CHAT_ID, '❌ Бот уже запущен'); return }

  mcBot = mineflayer.createBot({
    host: 'kaminiacraft.rustix.cc',
    username: 'intermew',
    auth: 'offline',
    plugins: [AutoAuth],
    AutoAuth: { logging: true, password: '568723', ignoreRepeat: true }
  })

  mcBot.on('login', () => {
    mcBot.chat('Мяу, тестим бота')
    tg.sendMessage(CHAT_ID, '✅ Подключился к серверу')
  })

  mcBot.on('end', (reason) => {
    tg.sendMessage(CHAT_ID, `🔌 Отключился: ${reason || 'неизвестно'}`)
    mcBot = null
  })

  mcBot.on('kicked', (reason) => {
    tg.sendMessage(CHAT_ID, `❌ Кикнут: ${reason}`)
    mcBot = null
  })

  mcBot.on('error', (reason) => {
    tg.sendMessage(CHAT_ID, `⚠️ Ошибка: ${reason}`)
  })

  mcBot.on('chat', (username, message) => {
    tg.sendMessage(CHAT_ID, `<${username}> ${message}`)
  })
}

function stopMc() {
  if (!mcBot) { tg.sendMessage(CHAT_ID, '❌ Бот не запущен'); return }
  mcBot.end()
}

function sendMc(msg, text) {
  if (!mcBot) { tg.sendMessage(msg.chat.id, '❌ Бот не запущен'); return false }
  mcBot.chat(text)
  return true
}

const chestPos = require('vec3')(-917 107 -2410)

const funcs = {
  start: () => { startMc(); return 'start' },
  stop: () => { stopMc(); return 'stop' },
  heal: () => mcBot ? (mcBot.chat('/heal'), 'heal') : null,
  pos: () => {
    if (!mcBot) return null
    const p = mcBot.entity.position
    tg.sendMessage(CHAT_ID, `📍 X: ${p.x.toFixed(0)}, Y: ${p.y.toFixed(0)}, Z: ${p.z.toFixed(0)}`)
    return 'pos'
  },
  chest: async () => {
    if (!mcBot) return null
    try {
      const block = mcBot.blockAt(chestPos)
      if (!block || !block.name.includes('chest')) {
        tg.sendMessage(CHAT_ID, `❌ Сундук не найден на ${chestPos}`)
        return 'chest'
      }
      const container = await mcBot.openContainer(block)
      const items = container.containerItems()
      if (items.length === 0) {
        tg.sendMessage(CHAT_ID, '📦 Сундук пуст')
      } else {
        const list = items.map(i => `  • ${i.name} x${i.count}`).join('\n')
        tg.sendMessage(CHAT_ID, `📦 Содержимое сундука:\n${list}`)
      }
      container.close()
    } catch (err) {
      tg.sendMessage(CHAT_ID, `❌ Ошибка: ${err.message}`)
    }
    return 'chest'
  },
}

tg.onText(/\/say (.+)/, (msg, match) => {
  sendMc(msg, match[1]) && tg.sendMessage(msg.chat.id, `✅ Sent: ${match[1]}`)
})

tg.onText(/\/func (.+)/, async (msg, match) => {
  const name = match[1].trim().split(/\s+/)[0]
  if (!funcs[name]) return tg.sendMessage(msg.chat.id, `❌ Нет такой: ${name}. Доступны: ${Object.keys(funcs).join(', ')}`)
  const result = await funcs[name]()
  if (result === null) tg.sendMessage(msg.chat.id, `❌ Бот не запущен`)
})

tg.sendMessage(CHAT_ID, '🟢 Telegram бот запущен. Используй /func start')
