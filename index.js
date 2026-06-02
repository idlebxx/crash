require("./settings")
const { Telegraf } = require('telegraf')
const fs = require('fs') 
const chalk = require('chalk')
const axios = require('axios')
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, jidDecode, getContentType, downloadContentFromMessage, Browsers } = require("@adiwajshing/baileys")
const pino = require('pino')
const { Boom } = require('@hapi/boom')
const { smsg, getBuffer, getRandom, sleep, isUrl } = require('./lib/myfunc')
const simple2 = require('./lib2/oke.js')
const storeDB = { read: async () => ({}), write: async () => {} }

const bot = new Telegraf(global.BOT_TOKEN)
const usersFile = 'database/users.json';

if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify([]));
}

global.store = { messages: {}, contacts: {} };

async function XeonBotIncStart() {
    const { version, isLatest } = await require('@adiwajshing/baileys').fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState("session")

    const XeonBotInc = simple2({
        auth: state,
        logger: pino({ level: 'silent' }),
        version: [2, 3000, 1026924051],
        printQRInTerminal: true, // سيطبع الـ QR كود في التيرمينال
    }, global.store);

    XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
        try {
            const mek = chatUpdate.messages[0]
            if (!mek.message) return
            const m = smsg(XeonBotInc, mek, global.store)
            // هنا يمكنك إضافة معالجة رسائل الواتساب
        } catch (err) {
            console.log(err)
        }
    })

    XeonBotInc.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('📱 الرجاء مسح رمز QR هذا باستخدام هاتفك:');
            console.log(qr);
        }
        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
                console.log('تم تسجيل الخروج، احذف مجلد session وأعد التشغيل');
            } else {
                XeonBotIncStart();
            }
        } else if (connection === 'open') {
            console.log(chalk.green(`✅ تم الاتصال بـ WhatsApp بنجاح`));
        }
    });

    XeonBotInc.ev.on('creds.update', saveCreds);
    return XeonBotInc;
}

async function startXeony() {
    // هنا بداية بوت التليجرام
    bot.start(async (ctx) => {
        await ctx.reply(`مرحباً بك في البوت ${global.BOT_NAME}`);
        await saveUser(ctx.from.id);
    });

    bot.command('menu', async (ctx) => {
        await ctx.reply(`📱 *قائمة الأوامر* 📱\n/menu - عرض القائمة\n/start - بدء البوت\n/checkid - معرفك`);
    });

    bot.command('checkid', (ctx) => {
        ctx.reply(`معرفك هو: \`${ctx.from.id}\``, { parse_mode: 'Markdown' });
    });

    bot.on('text', async (ctx) => {
        await saveUser(ctx.from.id);
    });

    bot.launch().then(() => {
        console.log(chalk.blue(`✅ تم تشغيل بوت التليجرام: @${bot.botInfo.username}`));
    });

    process.once('SIGINT', () => bot.stop('SIGINT'))
    process.once('SIGTERM', () => bot.stop('SIGTERM'))
}

async function saveUser(userId) {
    let users = [];
    if (fs.existsSync(usersFile)) {
        try {
            const data = fs.readFileSync(usersFile, 'utf8');
            users = JSON.parse(data);
        } catch (error) {}
    }
    if (!users.includes(userId)) {
        users.push(userId);
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    }
}

(async () => {
    try {
        console.log("جاري تشغيل بوت الواتساب...");
        await XeonBotIncStart();
        console.log("جاري تشغيل بوت التليجرام...");
        await startXeony();
        console.log("✅ تم تشغيل البوتين بنجاح");
    } catch (error) {
        console.error("خطأ:", error.message);
        process.exit(1);
    }
})();
