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
    AutoAuth: { logging: true, password: '568723', ignoreRepeat: true },
    standUntouched: true,
  })

  mcBot.on('login', () => {
    tg.sendMessage(CHAT_ID, '✅ Подключился к серверу')
  })

  mcBot.on('spawn', () => {
    mcBot.waitForTicks(3)
    mcBot.chat('/clan home')
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
    tg.sendMessage(CHAT_ID, `<${username}>: ${message}`)
  })

  mcBot.on('message', (jsonMsg, position) => {
    if (position === 'game_info') return
    tg.sendMessage(CHAT_ID, `${jsonMsg}`)
  })

  mcBot.on('message', (json) => {
    const msg = json.toString()
    if (msg.includes('IgorVasilekIV') && msg.includes('просит телепортироваться к вам')) {
      mcBot.chat('/tpaccept')
    }
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

// сундук
const chestPos = require('vec3')(-917, 108, -2410)

const funcs = {
  start: () => { startMc(); return 'start' },
  stop: () => { stopMc(); return 'stop' },
  pos: () => {
    if (!mcBot) return null
    const p = mcBot.entity.position
    tg.sendMessage(CHAT_ID, `📍 X: <code>${p.x.toFixed(0)}</code>, Y: <code>${p.y.toFixed(0)}</code>, Z: <code>${p.z.toFixed(0)}</code>`, { parse_mode: 'HTML' })
    return 'pos'
  },
  chest: async () => {
    if (!mcBot) return null
    try {
      const block = mcBot.blockAt(chestPos)
      if (!block || !block.name.includes('chest')) {
        tg.sendMessage(CHAT_ID, `❌ Сундук не найден на <code>${chestPos}</code>`, { parse_mode: 'HTML' })
        return 'chest'
      }
      const container = await mcBot.openContainer(block)
      const items = container.containerItems()
      if (items.length === 0) {
        tg.sendMessage(CHAT_ID, '📦 Сундук пуст')
      } else {
        const groups = {}
        for (const i of items) {
          groups[i.name] = (groups[i.name] || 0) + i.count
        }
        const total = Object.values(groups).reduce((a, b) => a + b, 0)
        const list = Object.entries(groups)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => `  • <code>${name}</code> x<code>${count}</code>`)
          .join('\n')
        tg.sendMessage(CHAT_ID, `📦 <b>Сундук</b> (<code>${total}</code> всего):\n${list}`, { parse_mode: 'HTML' })
      }
      container.close()
    } catch (err) {
      tg.sendMessage(CHAT_ID, `❌ Ошибка: <code>${err.message}</code>`, { parse_mode: 'HTML' })
    }
    return 'chest'
  },
}

tg.onText(/\/say (.+)/, async (msg, match) => {
  sendMc(msg, match[1]) && tg.sendMessage(msg.chat.id, `✅ Sent: <code>${match[1]}</code>`, { parse_mode: 'HTML' })
})

tg.onText(/\/func (.+)/, async (msg, match) => {
  const name = match[1].trim().split(/\s+/)[0]
  if (!funcs[name]) return tg.sendMessage(msg.chat.id, `❌ Нет такой: <code>${name}</code>. Доступны: ${Object.keys(funcs).join(', ')}`, { parse_mode: 'HTML' })
  const result = await funcs[name]()
  if (result === null) tg.sendMessage(msg.chat.id, `❌ Бот не запущен`)
})

tg.sendMessage(CHAT_ID, '🟢 Telegram бот запущен. Используй <code>/func start</code>', { parse_mode: 'HTML' })
