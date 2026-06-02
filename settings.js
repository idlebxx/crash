const fs = require("fs");

const chalk = require("chalk")

//global.BOT_TOKEN = "" // create bot here https://t.me/Botfather and get bot token

global.BOT_NAME = "𝗖𝗥𝗔𝗦𝗛 𝗜𝗗𝗟𝗘𝗕 𝗫" //your bot name

global.OWNER_NAME = "https://t.me/idlebx2" //your name with sign @

global.OWNER = ["https://t.me/idlebx2", "https://www.youtube.com/@abnadlep"] // Make sure the username is correct so that the special owner features can be used.

global.DEVELOPER = ["7240148750"] //developer telegram id to operate addprem delprem and listprem

global.ppp = 'https://streamable.com/ddswro' //your bot pp

global.pp = 'https://i.postimg.cc/gj3Pqv70/idleb.jpg'

//approval

global.GROUP_ID = -1003235079144; // Replace with your group ID

global.CHANNEL_ID =  -1003992890677; // Replace with your channel ID

global.GROUP_LINK = "https://t.me/idlebx2"; // Replace with your group link

global.CHANNEL_INVITE_LINK = "https://t.me/idlebx2"; // Replace with your private channel invite link

    global.WHATSAPP_LINK = "https://whatsapp.com/channel/0029Vb8035sJ93wZlpYTP10z"; // Replace with your group link

global.YOUTUBE_LINK = "https://www.youtube.com/@idlebx2"; // Replace with your youtube link

global.INSTAGRAM_LINK = "https://instagram.com/xlb_me"; // Replace with your ig link

global.owner = global.owner = ['963969061988'] //owner whatsapp

const {

   english

} = require("./lib");

global.language = english

global.lang = language

let file = require.resolve(__filename)

fs.watchFile(file, () => {

fs.unwatchFile(file)

console.log(chalk.redBright(`Update ${__filename}`))

delete require.cache[file]

require(file)

})