require('dotenv').config();

const mineflayer = require('mineflayer')
const { TelegramBot } = require('node-telegram-bot-api')
const AutoAuth = require('mineflayer-auto-auth')

const tg = new TelegramBot(process.env.IRON_TG_API, { polling: true })
const CHAT_ID = '1078401181'

let mcBot = null
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

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
    setTimeout(() => mcBot.chat('/clan home'), 2000)
    setTimeout(() => mcBot.chat('/crawl'), 9000)
  })

  mcBot.on('end', (reason) => {
    const msg = typeof reason === 'object' ? reason.value || JSON.stringify(reason) : reason
    tg.sendMessage(CHAT_ID, `🔌 Отключился: ${msg || 'неизвестно'}`)
    mcBot = null
  })

  mcBot.on('kicked', (reason) => {
    const msg = typeof reason === 'object' ? reason.value || JSON.stringify(reason) : reason
    tg.sendMessage(CHAT_ID, `❌ Кикнут: ${msg}`)
    mcBot = null
  })

  mcBot.on('error', (reason) => {
    tg.sendMessage(CHAT_ID, `⚠️ Ошибка: ${reason}`)
  })

  /*mcBot.on('chat', (username, message) => {
    tg.sendMessage(CHAT_ID, `<${username}>: ${message}`)
  })
*/
  mcBot.on('message', (jsonMsg, position) => {
    if (position === 'game_info') return
    const clean = jsonMsg.toString().replace(/[^\x20-\x7Eа-яА-ЯёЁ0-9\s]/g, '').trim()
    if (clean) tg.sendMessage(CHAT_ID, clean)
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
let chestBusy = false

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
    if (chestBusy) {
      tg.sendMessage(CHAT_ID, `⏳ Сундук уже открывается, подожди`)
      return 'chest'
    }
    chestBusy = true
    let container = null
    try {
      const block = mcBot.blockAt(chestPos)
      if (!block || !block.name.includes('chest')) {
        tg.sendMessage(CHAT_ID, `❌ Сундук не найден на <code>${chestPos}</code>`, { parse_mode: 'HTML' })
        return 'chest'
      }
      container = await mcBot.openContainer(block)
      const items = container.containerItems()
      if (items.length === 0) {
        tg.sendMessage(CHAT_ID, '📦 Сундук пуст')
      } else {
        const blockOf = {
          iron_ingot: ['iron_block', 9], gold_ingot: ['gold_block', 9],
          diamond: ['diamond_block', 9], emerald: ['emerald_block', 9],
          netherite_ingot: ['netherite_block', 9], copper_ingot: ['copper_block', 9],
          raw_iron: ['raw_iron_block', 9], raw_gold: ['raw_gold_block', 9],
          raw_copper: ['raw_copper_block', 9],
          coal: ['coal_block', 9], redstone: ['redstone_block', 9],
          lapis_lazuli: ['lapis_block', 9], quartz: ['quartz_block', 9],
          slime_ball: ['slime_block', 9], wheat: ['hay_block', 9],
          bone_meal: ['bone_block', 9],
          brick: ['brick_block', 4], nether_brick: ['nether_brick_block', 4],
          snowball: ['snow_block', 4], amethyst_shard: ['amethyst_block', 4],
        }
        const itemOf = {}
        for (const [item, [block, per]] of Object.entries(blockOf)) {
          itemOf[block] = [item, per]
        }
        const groups = {}
        for (const i of items) {
          groups[i.name] = (groups[i.name] || 0) + i.count
        }
        const total = Object.values(groups).reduce((a, b) => a + b, 0)
        const list = Object.entries(groups)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => {
            const conv = blockOf[name]
            if (conv) return `  • <code>${name}</code> x<code>${count}</code> (= ${Math.floor(count / conv[1])} ${conv[0]})`
            const rev = itemOf[name]
            if (rev) return `  • <code>${name}</code> x<code>${count}</code> (= ${count * rev[1]} ${rev[0]})`
            return `  • <code>${name}</code> x<code>${count}</code>`
          })
          .join('\n')
        tg.sendMessage(CHAT_ID, `<tg-emoji emoji-id="6021525053567409034">🗃</tg-emoji> <b>Сундук</b> (<code>${total}</code> всего):\n${list}`, { parse_mode: 'HTML' })
      }
    } catch (err) {
      tg.sendMessage(CHAT_ID, `❌ Ошибка: <code>${err.message}</code>`, { parse_mode: 'HTML' })
    } finally {
      if (container) container.close()
      chestBusy = false
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
