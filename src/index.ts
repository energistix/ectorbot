import { Client, Collection, IntentsBitField, Message } from "discord.js"
import fs from "fs"
// @ts-ignore
import Ector from "ector"

const ector = new Ector("bot", "user")
loadCN("./bot.json", ector)

function saveCN(filePath: string, ector: Ector) {
  fs.writeFileSync(filePath, JSON.stringify(this.ector))
  return true
}

function loadCN(filePath: string, ector: Ector) {
  Object.assign(ector.cn, JSON.parse(fs.readFileSync(filePath, "utf8")))
  return true
}

function learn(sentence: string, save = true) {
  // remove code blocks and then add an entry then save if save is true
  ector.addEntry(sentence.replace(/```.*?```/g, ""))
  if (save) saveCN("./bot.json", ector)
}

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
})

async function fetchMessages(
  channelId: string,
  ammount: number,
  messages: Collection<string, Message>
): Promise<string[]> {
  // fetch messages and return their content in a list
  // keep in mind that cases where the ammount is over 100 have to be managed specially

  const channel = await client.channels.fetch(channelId)
  if (!channel) throw new Error(`Channel ${channelId} not found`)
  // @ts-ignore
  if (!channel.isTextBased())
    throw new Error(`Channel ${channel.name}[${channelId}] is not text based`)

  // @ts-ignore
  const fetchedMessages = await channel.messages.fetch({
    limit: ammount <= 100 ? ammount : 100,
    ...(messages.size > 0 ? { before: messages.lastKey() } : {}),
  })
  messages = messages.concat(fetchedMessages)

  console.log(`fetched ${messages.size} messages`)

  if (messages.size >= ammount)
    return messages.map((message) => message.content)
  else return fetchMessages(channelId, ammount - fetchedMessages.size, messages)
}

client.on("ready", async () => {
  console.log("Ready!")
  const ch = await client.channels.fetch("622847072768360489")
  if (!("send" in ch)) return
  ch.send("Hello World !")
})

client.on("messageCreate", async (message) => {
  if (message.author.bot) return
  learn(message.content)

  if (message.channelId === "622847072768360489") {
    let response = ector.generateResponse().sentence

    // filter out mentions and replace them by names of member, roles and channels
    response = await replaceAsync(
      response,
      /<@!?(\d+)>/g,
      async (match, id) => {
        const member = await message.guild.members.fetch(id).catch(() => {})
        if (member) return member.displayName
        const role = await message.guild.roles.fetch(id).catch(() => {})
        if (role) return role.name
        const channel = await message.guild.channels.fetch(id).catch(() => {})
        if (channel) return channel.name
        return id
      }
    )

    // filter out links
    response = response.replace(/https?:\/\/\S+/g, "")

    if (response.length > 0) message.reply(response)
  }
})

async function replaceAsync(str: string, regex: RegExp, asyncFn) {
  const promises = []
  // @ts-ignore
  str.replace(regex, (match, ...args) => {
    const promise = asyncFn(match, ...args)
    promises.push(promise)
  })
  const data = await Promise.all(promises)
  return str.replace(regex, () => data.shift())
}

client.login(
  "NTA3MDg0NTEzNjE3MjQ4MjY4.GDMjDC.uSaTer_v-dWUUYSS0uA3Y7aCRg_ZxfydAF9dYI"
)
