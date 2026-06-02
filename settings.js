const fs = require("fs");
const chalk = require("chalk");

// ⭐⭐⭐ ضع التوكن الخاص بك هنا ⭐⭐⭐
global.BOT_TOKEN = "8788758313:AAHNtqL_gXLslINX7OW9o6VYuhCnOmbgH0Q"; 

global.BOT_NAME = "𝗖𝗥𝗔𝗦𝗛 𝗜𝗗𝗟𝗘𝗕 𝗫";
global.OWNER_NAME = "https://t.me/idlebx2";
global.OWNER = ["https://t.me/idlebx2", "https://www.youtube.com/@abnadlep"];

// ⭐⭐⭐ تأكد من صحة هذه المعرفات ⭐⭐⭐
global.DEVELOPER = ["7240148750"];

global.pp = 'https://i.postimg.cc/gj3Pqv70/idleb.jpg';
global.link = 'https://whatsapp.com/channel/0029Vb8035sJ93wZlpYTP10z';
global.idch = 'https://whatsapp.com/channel/0029Vb8035sJ93wZlpYTP10z';

// إعدادات التليجرام
global.GROUP_ID = -1003235079144; 
global.CHANNEL_ID =  -1003992890677; 
global.GROUP_LINK = "https://t.me/idlebx2";
global.CHANNEL_INVITE_LINK = "https://t.me/idlebx2";
global.WHATSAPP_LINK = "https://whatsapp.com/channel/0029Vb8035sJ93wZlpYTP10z";
global.YOUTUBE_LINK = "https://www.youtube.com/@idlebx2";
global.INSTAGRAM_LINK = "https://instagram.com/xlb_me";

global.baileysDB = 'baileysDB.json';
global.botDb = 'database/database.json';

global.prefa = ['','!','.',',','🐤','🗿'];

global.mess = {
    success: 'Done✓',
    admin: 'This Command Can Only Be Used By Group Admins !',
    botAdmin: 'This Command Can Only Be Used When Bot Becomes Group Admin !',
    OnlyOwner: 'This Command Can Only Be Used By Premium User !',
    OnlyGrup: 'This Command Can Only Be Used In Group Chat !',
    private: 'This Command Can Only Be Used In Private Chat !',
    wait: 'Wait a minute...',
    notregist: 'You are not registered in the Bot Database.',
    premium: 'This Command Can Only Be Used By Premium User !'
}

const { english } = require("./lib/lang");
global.language = english;
global.lang = language;

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update ${__filename}`))
    delete require.cache[file]
    require(file)
})
