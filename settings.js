const fs = require("fs");
const chalk = require("chalk");

// =============== توكن بوت التليجرام ===============
global.BOT_TOKEN = "8788758313:AAHNtqL_gXLslINX7OW9o6VYuhCnOmbgH0Q";

// =============== معلومات البوت ===============
global.BOT_NAME = "𝗖𝗥𝗔𝗦𝗛 𝗜𝗗𝗟𝗘𝗕 𝗫";
global.owner = "963969061988";
global.DEVELOPER = ["7240148750"];

// =============== روابط التواصل ===============
global.WHATSAPP_LINK = "https://whatsapp.com/channel/0029Vb8035sJ93wZlpYTP10z";
global.YOUTUBE_LINK = "https://www.youtube.com/@idlebx2";
global.INSTAGRAM_LINK = "https://instagram.com/xlb_me";
global.GROUP_LINK = "https://t.me/idlebx2";
global.CHANNEL_INVITE_LINK = "https://t.me/idlebx2";

// =============== معرفات القنوات ===============
global.GROUP_ID = -1003235079144;
global.CHANNEL_ID = -1003992890677;

// =============== صور وخلفيات ===============
global.pp = 'https://i.postimg.cc/gj3Pqv70/idleb.jpg';
global.link = 'https://whatsapp.com/channel/0029Vb8035sJ93wZlpYTP10z';
global.idch = 'https://whatsapp.com/channel/0029Vb8035sJ93wZlpYTP10z';

// =============== إعدادات إضافية ===============
global.baileysDB = 'baileysDB.json';
global.botDb = 'database/database.json';
global.prefa = ['', '!', '.', ',', '🐤', '🗿'];

global.mess = {
    success: '✅ Done',
    admin: '⛔ Only group admins!',
    botAdmin: '⛔ Bot needs to be admin!',
    OnlyOwner: '⛔ Premium only!',
    OnlyGrup: '⛔ Groups only!',
    private: '⛔ Private chat only!',
    wait: '⏳ Processing...'
};

// =============== تم إزالة الـ require("./lib/lang") ===============
// لأن الملف غير موجود، تم إنشاء اللغة مباشرة هنا

global.language = {
    first_chat: (botName, userName) => {
        return `👋 مرحباً ${userName}\n\n🤖 أنا بوت ${botName}\n📱 يمكنك استخدام الأوامر التالية:\n\n/start - بدء البوت\n/menu - عرض القائمة\n/checkid - معرف حسابك\n/owner - معلومات المطور`;
    }
};

global.lang = global.language;

console.log(chalk.green("✅ Settings loaded successfully"));

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright(`Update ${__filename}`));
    delete require.cache[file];
    require(file);
});
