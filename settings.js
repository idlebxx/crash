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

console.log(chalk.green("✅ Settings loaded"));

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright(`Update ${__filename}`));
    delete require.cache[file];
    require(file);
});
