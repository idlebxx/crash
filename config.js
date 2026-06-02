global.ownernomer = "963969061988"
global.dev = ["963969061988","963969061988","963969061988", "963969061988","963969061988","963969061988"]
global.ownername = "IDLEBX"
global.ytname = "MOOHAMED"
global.socialm = "GitHub: IDLEBX"
global.location = "Egypt, menofia, Ashmoun"

global.ownernumber = 'IDLEBX'  //creator number
global.ownername = 'MOOHAMED' //owner name
global.botname = '𝗖𝗥𝗔𝗦𝗛 𝗜𝗗𝗟𝗘𝗕 𝗫' //name of the bot

//sticker details
global.packname = '\n\n\n\n\n\n\nSticker By'
global.author = 'FLIXUXW ⚉\n\nContact: 963969061988'

//console view/theme
global.themeemoji = '🪀'
global.wm = "HXTEAM."

//theme link
global.link = 'https://whatsapp.com/channel/0029Vb8035sJ93wZlpYTP10z'
global.idch = 'https://whatsapp.com/channel/0029Vb8035sJ93wZlpYTP10z'

global.baileysDB = 'baileysDB.json'
global.botDb = 'database.json'

//prefix
global.prefa = ['','!','.',',','🐤','🗿'] 

global.limitawal = {
    premium: "Infinity",
    free: 20
}

//menu type 
//v1 is image menu, 
//v2 is link + image menu,
//v3 is video menu,
//v4 is call end menu
global.typemenu = 'v1'

// Global Respon
global.mess = {
    success: 'Done✓',
    admin: `\`[ # ]\` This Command Can Only Be Used By Group Admins !`,
    botAdmin: `\`[ # ]\` This Command Can Only Be Used When Bot Becomes Group Admin !`,
    OnlyOwner: `\`[ # ]\` This Command Can Only Be Used By Premium User ! \n\nWant Premium? Chat Developer.\nTelegram: @IDLEBX\nWhatsApp: +963969061988`,
    OnlyGrup: `\`[ # ]\` This Command Can Only Be Used In Group Chat !`,
    private: `\`[ # ]\` This Command Can Only Be Used In Private Chat !`,
    wait: `\`[ # ]\` Wait Wait a minute`,
    notregist: `\`[ # ]\` You are not registered in the Bot Database. Please register first.`,
    premium: `\`[ # ]\` This Command Can Only Be Used By Premium User ! \n\nWant Premium? Chat Developer.\nYouTube: @abnadlep\nTelegram: @IDLEBX\nWhatsApp: +963969061988`,
}

module.exports = {

    banner: [

        "963969061988@s.whatsapp.net",

        "963969061988@s.whatsapp.net",

        "963969061988@s.whatsapp.net",

        "963969061988@s.whatsapp.net",

        "963969061988@s.whatsapp.net",

        "963969061988@s.whatsapp.net"

    ]

};

let fs = require('fs')
let file = require.resolve(__filename)
fs.watchFile(file, () => {
fs.unwatchFile(file)
console.log(`Update ${__filename}`)
delete require.cache[file]
require(file)
})