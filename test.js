require('dotenv').config();

const mineflayer = require('mineflayer')
const { TelegramBot } = require('node-telegram-bot-api')
var AutoAuth = require('mineflayer-auto-auth')
const https = require('https')

const tg = new TelegramBot(process.env.TG_API, { polling: true })
const CHAT_ID = '1078401181'

const bot = mineflayer.createBot({
	host: 'kaminiacraft.rustix.cc',
	username: 'intermew',
	auth: 'offline',
	plugins: [AutoAuth],
	AutoAuth: {
		logging: true,
		password: '568723',
		ignoreRepeat: true
	}
	
})

const funcs = {
  test: () => bot.chat('Test function executed'),
  heal: () => bot.chat('/heal'),
  pos: () => {
    const p = bot.entity.position
    tg.sendMessage(CHAT_ID, `X: ${p.x}, Y: ${p.y}, Z: ${p.z}`)
  },
  stop: async () => {
    tg.sendMessage(CHAT_ID, '🛑 Выключаюсь...')
    tg.stopPolling()
    bot.end()
    process.exit(0)
  },
}

tg.onText(/\/say (.+)/, (msg, match) => {
  bot.chat(match[1])
  tg.sendMessage(msg.chat.id, `Sent: ${match[1]}`)
})

tg.onText(/\/func (.+)/, (msg, match) => {
  const name = match[1].trim().split(/\s+/)[0]
  if (funcs[name]) {
    funcs[name]()
    tg.sendMessage(msg.chat.id, `Executed: ${name}`)
  } else {
    tg.sendMessage(msg.chat.id, `Unknown func: ${name}. Available: ${Object.keys(funcs).join(', ')}`)
  }
})

bot.on('login', async () => {
  bot.chat('Мяу, тестим бота')
  tg.sendMessage(CHAT_ID, 'Успешное подключение к серверу')
})

bot.on('end', (reason) => {
  tg.sendMessage(CHAT_ID, `🔌 Отключился: ${reason || 'неизвестно'}`)
})

bot.on('kicked', (reason) => {
  tg.sendMessage(CHAT_ID, `❌ Кикнут с сервера: ${reason}`)
})

bot.on('error', (reason) => {
  tg.sendMessage(CHAT_ID, `Ошибка: ${reason}`)
})

bot.on('chat', (username, message) => {
  tg.sendMessage(CHAT_ID, `<${username}> ${message}`)
})
