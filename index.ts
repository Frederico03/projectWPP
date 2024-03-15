import makeWASocket, { AnyMessageContent, delay, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import MAIN_LOGGER from "./logger";

const logger = MAIN_LOGGER.child({})
logger.level = 'trace'

const useMobile = process.argv.includes('--mobile')
const usePairingCode = process.argv.includes('--use-pairing-code')

async function run() {

  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
  const { version, isLatest } = await fetchLatestBaileysVersion()
  console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`)

  const sock = makeWASocket({
    version,
    mobile: useMobile,
    printQRInTerminal: !usePairingCode,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
  });

  sock.ev.process(
    async (events) => {

      if (events['connection.update']) {
        {
          const update = events['connection.update']
          const { connection, lastDisconnect } = update
          if (connection === 'close') {
            // reconnect if not logged out
            if ((lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut) {
              run()
            } else {
              console.log('Connection closed. You are logged out.')
            }
          }
          console.log('connection update', update)
        }
      }

      sock.ev.on("creds.update", saveCreds);
      if (events['labels.association']) {
        console.log(events['labels.association'])
      }

      if (events['creds.update']) {
        await saveCreds()
      }

      if (events['labels.edit']) {
        console.log(events['labels.edit'])
      }

      if (events.call) {
        console.log('recv call event', events.call)
      }

      if (events['messages.upsert']) {
        const upsert = events['messages.upsert']
        const body = upsert.messages[0]
        const nome = body.pushName || "Usuário(a)"
        const key = body.key
        const jid = key.remoteJid
        const isGroup = key.remoteJid?.endsWith('@g.us')
        console.log('recv messages ', JSON.stringify(upsert, undefined, 2))

        if (upsert.type === 'notify') {

          for (const msg of upsert.messages) {
            let i: number = 0
            console.log('msg number -->', i++)
            console.log(msg)
            if (!msg.key.fromMe && jid !== 'status@broadcast' && !isGroup) {

              const msgImage = body.message!.conversation
              if (msgImage && msgImage.startsWith('/imagine')) {

                console.log('replying to', msg.key.remoteJid)
                await sock!.readMessages([msg.key])
                await sendMessageWTyping({ text: `Hello ${nome}!` }, msg.key.remoteJid!)
              }
            }
          }
        }
      }
    }
  )

  const sendMessageWTyping = async (msg: AnyMessageContent, jid: string) => {
    await sock.presenceSubscribe(jid)
    await delay(500)

    await sock.sendPresenceUpdate('composing', jid)
    await delay(2000)

    await sock.sendPresenceUpdate('paused', jid)

    await sock.sendMessage(jid, msg)
  }

}

run()