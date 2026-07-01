require('dotenv').config();

const mineflayer = require('mineflayer')
const { TelegramBot } = require('node-telegram-bot-api')
const AutoAuth = require('mineflayer-auto-auth')

const tg = new TelegramBot(process.env.RED_TG_API, { polling: true })
const CHAT_ID = '1078401181'

let mcBot = null

function startMc() {
  if (mcBot) { tg.sendMessage(CHAT_ID, '❌ Бот уже запущен'); return }

  mcBot = mineflayer.createBot({
    host: 'kaminiacraft.rustix.cc',
    username: 'oximew',
    auth: 'offline',
    plugins: [AutoAuth],
    AutoAuth: { logging: true, password: '568723', ignoreRepeat: true },
    standUntouched: true,
  })

  mcBot.on('login', () => {
    tg.sendMessage(CHAT_ID, '✅ Подключился к серверу')
  })

  mcBot.on('spawn', () => {
    setTimeout(() => mcBot.chat('/clan home'), 2000)
    setTimeout(() => mcBot.chat('/crawl'), 9000)
  })

  mcBot.on('end', (reason) => {
    tg.sendMessage(CHAT_ID, `🔌 Отключился: ${reason || 'неизвестно'}`)
    mcBot = null
  })

  mcBot.on('kicked', (reason) => {
    tg.sendMessage(CHAT_ID, `❌ Кикнут: ${JSON.stringify(reason)}`)
    mcBot = null
  })

  mcBot.on('error', (reason) => {
    tg.sendMessage(CHAT_ID, `⚠️ Ошибка: ${reason}`)
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

const funcs = {
  start: () => { startMc(); return 'start' },
  stop: () => { stopMc(); return 'stop' },
  pos: () => {
    if (!mcBot) return null
    const p = mcBot.entity.position
    tg.sendMessage(CHAT_ID, `📍 X: <code>${p.x.toFixed(0)}</code>, Y: <code>${p.y.toFixed(0)}</code>, Z: <code>${p.z.toFixed(0)}</code>`, { parse_mode: 'HTML' })
    return 'pos'
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
