require("./settings");
const { Telegraf } = require('telegraf');
const fs = require('fs');
const chalk = require('chalk');
const speed = require('performance-now');
const axios = require('axios');
const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const { Boom } = require('@hapi/boom');

// =============== إعدادات التليجرام ===============
const bot = new Telegraf(global.BOT_TOKEN);
const usersFile = 'users.json';
const premium_file = 'lib/premium.json';
const reseller_file = 'lib/reseller.json';
const pairingDir = './lib2/pairing/';

// =============== إنشاء الملفات والمجلدات ===============
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, JSON.stringify([]));
if (!fs.existsSync(premium_file)) fs.writeFileSync(premium_file, JSON.stringify([]));
if (!fs.existsSync(reseller_file)) fs.writeFileSync(reseller_file, JSON.stringify([]));
if (!fs.existsSync('./database/database.json')) {
    if (!fs.existsSync('./database')) fs.mkdirSync('./database');
    fs.writeFileSync('./database/database.json', JSON.stringify({}));
}
if (!fs.existsSync('baileysDB.json')) fs.writeFileSync('baileysDB.json', JSON.stringify({}));
if (!fs.existsSync(pairingDir)) fs.mkdirSync(pairingDir, { recursive: true });

// =============== قراءة الملفات ===============
let allUsers = JSON.parse(fs.readFileSync(usersFile));
let premiumUsers = JSON.parse(fs.readFileSync(premium_file));
let resellerUsers = JSON.parse(fs.readFileSync(reseller_file));

// =============== دالة إنشاء بوت واتساب جديد ===============
async function createWhatsAppBot(phoneNumber, userId) {
    const sessionPath = pairingDir + phoneNumber;
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        version: [2, 3000, 1026924051],
        printQRInTerminal: false,
    });

    if (!sock.authState.creds.registered) {
        let code = await sock.requestPairingCode(phoneNumber, 'HXBYFLIX');
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        
        // إرسال الكود للمستخدم عبر تليجرام
        await bot.telegram.sendMessage(userId, `🔐 *Pairing Code for ${phoneNumber}*\n\n\`${code}\`\n\n📱 Open WhatsApp > Settings > Linked Devices > Link a Device`, { parse_mode: 'Markdown' });
        console.log(chalk.green(`✅ Pairing code sent for ${phoneNumber}`));
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                createWhatsAppBot(phoneNumber, userId);
            }
        } else if (connection === 'open') {
            console.log(chalk.green(`✅ WhatsApp Bot Created: ${phoneNumber}`));
            await bot.telegram.sendMessage(userId, `✅ *WhatsApp Bot Created Successfully!*\n\n📱 Number: ${phoneNumber}\n🤖 Status: Online`, { parse_mode: 'Markdown' });
        }
    });

    sock.ev.on('creds.update', saveCreds);
    return sock;
}

// =============== دوال المساعدة ===============
async function saveUser(userId) {
    let users = [];
    if (fs.existsSync(usersFile)) {
        try {
            users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        } catch (error) {}
    }
    if (!users.includes(userId)) {
        users.push(userId);
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    }
}

async function checkMembership(userId) {
    try {
        const isInGroup = await bot.telegram.getChatMember(global.GROUP_ID, userId);
        const isInChannel = await bot.telegram.getChatMember(global.CHANNEL_ID, userId);
        return isInGroup.status !== 'left' && isInChannel.status !== 'left';
    } catch (err) {
        return true;
    }
}

async function verifyUser(ctx, next) {
    const userId = ctx.from.id;
    const isMember = await checkMembership(userId);
    if (!isMember) {
        return ctx.replyWithPhoto(global.pp, {
            caption: "❌ *Access Denied!*\n\nيجب الاشتراك في القناة والمجموعة لاستخدام البوت.",
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📢 القناة", url: global.CHANNEL_INVITE_LINK }],
                    [{ text: "👥 المجموعة", url: global.GROUP_LINK }],
                    [{ text: "🔄 تحقق مرة أخرى", callback_data: "check_membership" }]
                ]
            }
        });
    }
    return next();
}

// =============== أوامر التليجرام ===============
async function startXeony() {
    bot.on('callback_query', async (ctx) => {
        if (ctx.callbackQuery.data === "check_membership") {
            const isMember = await checkMembership(ctx.callbackQuery.from.id);
            await ctx.answerCbQuery(isMember ? "✅ تم التحقق!" : "❌ لم تشترك بعد!", { show_alert: true });
            return;
        }
        await ctx.answerCbQuery();
    });

    bot.command("start", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        await ctx.replyWithPhoto(global.pp, {
            caption: `👋 *مرحباً ${ctx.from.first_name}*\n\n🤖 بوت إنشاء بوتات واتساب\n\n📱 *الأوامر:*\n/create <رقم الهاتف> - إنشاء بوت واتساب جديد\n/menu - عرض القائمة\n/checkid - معرف حسابك\n/owner - المطور`,
            parse_mode: "Markdown"
        });
        await saveUser(ctx.from.id);
    });

    bot.command("menu", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        const menu = `
📱 *قائمة الأوامر* 📱

🔹 /start - بدء البوت
🔹 /menu - عرض القائمة
🔹 /checkid - معرف حسابك في تليجرام
🔹 /owner - معلومات المطور

🤖 *أوامر إنشاء بوتات واتساب*
🔹 /create <رقم الهاتف> - إنشاء بوت واتساب جديد
🔹 /listbots - عرض البوتات التي أنشأتها
🔹 /delbot <رقم الهاتف> - حذف بوت

👑 *أوامر المالك*
🔹 /broadcast - إرسال رسالة للجميع
🔹 /addprem <id> - إضافة مستخدم مميز
🔹 /delprem <id> - حذف مستخدم مميز
🔹 /listprem - عرض المستخدمين المميزين
        `;
        await ctx.reply(menu, { parse_mode: 'Markdown' });
    });

    // ✅ الأمر الأساسي: إنشاء بوت واتساب جديد
    bot.command("create", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        
        const text = ctx.message.text.split(' ');
        if (text.length < 2) {
            return ctx.reply("❌ *الرجاء إدخال رقم الهاتف*\n\nمثال: `/create 201234567890`\n\n📱 الرقم مع رمز البلد بدون + أو صفر", { parse_mode: 'Markdown' });
        }
        
        let phoneNumber = text[1].replace(/[^0-9]/g, '');
        if (phoneNumber.length < 10) {
            return ctx.reply("❌ *رقم غير صالح*\n\nالرجاء إدخال رقم صحيح مع رمز البلد", { parse_mode: 'Markdown' });
        }
        
        const userId = ctx.from.id;
        
        await ctx.reply(`⏳ *جاري إنشاء بوت واتساب للرقم:* ${phoneNumber}\n\nسيتم إرسال كود الـ Pairing إليك خلال لحظات...`, { parse_mode: 'Markdown' });
        
        try {
            await createWhatsAppBot(phoneNumber, userId);
        } catch (error) {
            console.error(error);
            await ctx.reply(`❌ *خطأ في إنشاء البوت*\n\n${error.message}`, { parse_mode: 'Markdown' });
        }
    });

    bot.command("checkid", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        await ctx.reply(`📱 *معرف حسابك:*\n\`${ctx.from.id}\``, { parse_mode: 'Markdown' });
        await saveUser(ctx.from.id);
    });

    bot.command("owner", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        await ctx.reply(`👨‍💻 *المطور*\n\n📛 الاسم: IDLEBX\n📱 واتساب: [اضغط هنا](https://wa.me/${global.owner})\n📢 القناة: [اضغط هنا](${global.CHANNEL_INVITE_LINK})`, { parse_mode: 'Markdown', disable_web_page_preview: true });
    });

    bot.command("listprem", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        const isReseller = resellerUsers.includes(ctx.from.id.toString()) || global.DEVELOPER.includes(ctx.from.id.toString());
        if (!isReseller) return ctx.reply("🚫 *للأسف هذا الأمر للمطور والمميزين فقط*", { parse_mode: "Markdown" });
        if (premiumUsers.length === 0) return ctx.reply("📭 لا يوجد مستخدمين مميزين.");
        await ctx.reply(`🌹 *قائمة المميزين:*\n\n${premiumUsers.join('\n')}`, { parse_mode: "Markdown" });
    });

    bot.command('addprem', verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        if (!global.DEVELOPER.includes(ctx.from.id.toString())) return ctx.reply("🚫 *للمطور فقط*", { parse_mode: "Markdown" });
        const text = ctx.message.text.split(' ');
        if (text.length < 2) return ctx.reply("الاستخدام: `/addprem <user_id>`", { parse_mode: "Markdown" });
        const newAdmin = text[1];
        if (premiumUsers.includes(newAdmin)) return ctx.reply("المستخدم موجود بالفعل.");
        premiumUsers.push(newAdmin);
        fs.writeFileSync(premium_file, JSON.stringify(premiumUsers, null, 2));
        await ctx.reply(`✅ المستخدم ${newAdmin} أصبح مميزاً.`);
    });

    bot.command('delprem', verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        if (!global.DEVELOPER.includes(ctx.from.id.toString())) return ctx.reply("🚫 *للمطور فقط*", { parse_mode: "Markdown" });
        const text = ctx.message.text.split(' ');
        if (text.length < 2) return ctx.reply("الاستخدام: `/delprem <user_id>`", { parse_mode: "Markdown" });
        const adminToRemove = text[1];
        if (!premiumUsers.includes(adminToRemove)) return ctx.reply("المستخدم ليس مميزاً.");
        premiumUsers = premiumUsers.filter(id => id !== adminToRemove);
        fs.writeFileSync(premium_file, JSON.stringify(premiumUsers, null, 2));
        await ctx.reply(`✅ المستخدم ${adminToRemove} تمت إزالته من المميزين.`);
    });

    bot.command('addresell', verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        if (!global.DEVELOPER.includes(ctx.from.id.toString())) return ctx.reply("🚫 *للمطور فقط*", { parse_mode: "Markdown" });
        const text = ctx.message.text.split(' ');
        if (text.length < 2) return ctx.reply("الاستخدام: `/addresell <user_id>`", { parse_mode: "Markdown" });
        const newReseller = text[1];
        if (resellerUsers.includes(newReseller)) return ctx.reply("المستخدم موجود بالفعل.");
        resellerUsers.push(newReseller);
        fs.writeFileSync(reseller_file, JSON.stringify(resellerUsers, null, 2));
        await ctx.reply(`✅ المستخدم ${newReseller} أصبح وكيلاً.`);
    });

    bot.command('delresell', verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        if (!global.DEVELOPER.includes(ctx.from.id.toString())) return ctx.reply("🚫 *للمطور فقط*", { parse_mode: "Markdown" });
        const text = ctx.message.text.split(' ');
        if (text.length < 2) return ctx.reply("الاستخدام: `/delresell <user_id>`", { parse_mode: "Markdown" });
        const resellerToRemove = text[1];
        if (!resellerUsers.includes(resellerToRemove)) return ctx.reply("المستخدم ليس وكيلاً.");
        resellerUsers = resellerUsers.filter(id => id !== resellerToRemove);
        fs.writeFileSync(reseller_file, JSON.stringify(resellerUsers, null, 2));
        await ctx.reply(`✅ المستخدم ${resellerToRemove} تمت إزالته من الوكلاء.`);
    });

    bot.command('listresell', verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        if (!global.DEVELOPER.includes(ctx.from.id.toString())) return ctx.reply("🚫 *للمطور فقط*", { parse_mode: "Markdown" });
        if (resellerUsers.length === 0) return ctx.reply("📭 لا يوجد وكلاء.");
        let list = "🌹 *قائمة الوكلاء:*\n\n";
        for (const userId of resellerUsers) {
            try {
                const userInfo = await ctx.telegram.getChat(userId);
                list += `• ${userId} - @${userInfo.username || "بدون معرف"}\n`;
            } catch (err) {
                list += `• ${userId}\n`;
            }
        }
        await ctx.reply(list, { parse_mode: "Markdown" });
    });

    bot.command('broadcast', verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        if (!global.DEVELOPER.includes(ctx.from.id.toString())) return ctx.reply("🚫 *للمطور فقط*", { parse_mode: "Markdown" });
        const cmdParts = ctx.message.text.split(' ');
        if (cmdParts.length < 2) return ctx.reply("الاستخدام: `/broadcast <الرسالة>`", { parse_mode: 'Markdown' });
        const broadcastMessage = cmdParts.slice(1).join(' ');
        const allRecipients = [...new Set([...allUsers, ...premiumUsers])];
        let successCount = 0;
        for (const userId of allRecipients) {
            try {
                await ctx.telegram.sendMessage(userId, broadcastMessage, { parse_mode: 'Markdown' });
                successCount++;
                await new Promise(r => setTimeout(r, 100));
            } catch (err) {}
        }
        await ctx.reply(`✅ تم الإرسال.\n📨 نجح: ${successCount}\n📭 فشل: ${allRecipients.length - successCount}`);
    });

    bot.on('message', async (ctx) => {
        await saveUser(ctx.from.id);
    });

    bot.launch();
    bot.telegram.getMe().then((getme) => {
        console.log(chalk.green(`✅ بوت التليجرام: @${getme.username}`));
    });
}

// =============== التشغيل الرئيسي ===============
(async () => {
    try {
        console.log(chalk.blue("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
        console.log(chalk.green("     🤖 STARTING BOT SYSTEM 🤖"));
        console.log(chalk.blue("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));
        
        console.log(chalk.yellow("🤖 Starting Telegram Bot..."));
        await startXeony();
        
        console.log(chalk.green("✅ Telegram Bot Started!"));
        console.log(chalk.blue("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
        console.log(chalk.green("     🎉 BOT IS RUNNING 🎉"));
        console.log(chalk.blue("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));
    } catch (error) {
        console.error(chalk.red("❌ Error:"), error.message);
        process.exit(1);
    }
})();
