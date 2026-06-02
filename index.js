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

// =============== قراءة البيانات ===============
let allUsers = JSON.parse(fs.readFileSync(usersFile));
let premiumUsers = JSON.parse(fs.readFileSync(premium_file));
let resellerUsers = JSON.parse(fs.readFileSync(reseller_file));

// =============== حفظ المستخدمين ===============
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

// =============== التحقق من العضوية ===============
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

// =============== دالة إرسال الردود مع الصورة ===============
async function sendWithImage(ctx, text, extraOptions = {}) {
    return ctx.replyWithPhoto(global.pp, {
        caption: text,
        parse_mode: 'Markdown',
        ...extraOptions
    });
}

// =============== التحقق من الأدمن ===============
function isAdmin(userId) {
    const isDev = global.DEVELOPER.includes(userId.toString());
    const isReseller = resellerUsers.includes(userId.toString());
    const isPremium = premiumUsers.includes(userId.toString());
    return isDev || isReseller || isPremium;
}

// =============== إنشاء بوت واتساب (نفس الطريقة الأصلية) ===============
async function createWhatsAppBot(phoneNumber, userId) {
    const sessionPath = pairingDir + phoneNumber;
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        version: [2, 3000, 1026924051],
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 10000,
    });

    // انتظار 3 ثواني قبل طلب الكود (مثل الملف الأصلي)
    setTimeout(async () => {
        if (!sock.authState.creds.registered) {
            try {
                let code = await sock.requestPairingCode(phoneNumber, 'HXBYFLIX');
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                
                // حفظ الكود في ملف مؤقت
                fs.writeFileSync('./lib2/pairing/pairing.json', JSON.stringify({ code: code }, null, 2));
                
                // إرسال الكود للمستخدم
                await bot.telegram.sendMessage(userId, `🔐 *Pairing Code for ${phoneNumber}*\n\n*\`${code}\`*\n\n📱 *كيفية الربط:*\n1️⃣ افتح واتساب\n2️⃣ اذهب إلى الإعدادات (Settings)\n3️⃣ اضغط على الأجهزة المرتبطة (Linked Devices)\n4️⃣ اضغط على ربط جهاز (Link a Device)\n5️⃣ أدخل هذا الكود`, { parse_mode: 'Markdown' });
                
                console.log(chalk.green(`✅ Pairing code sent for ${phoneNumber}: ${code}`));
            } catch (err) {
                console.error(chalk.red(`Error sending code for ${phoneNumber}:`, err));
                await bot.telegram.sendMessage(userId, `❌ *خطأ في إنشاء البوت*\n\nالرقم: ${phoneNumber}\nالخطأ: ${err.message}`, { parse_mode: 'Markdown' });
            }
        }
    }, 3000); // تأخير 3 ثواني مثل الملف الأصلي

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                setTimeout(() => createWhatsAppBot(phoneNumber, userId), 5000);
            } else {
                await bot.telegram.sendMessage(userId, `❌ *تم تسجيل الخروج*\n\nالرقم: ${phoneNumber}\nتم حذف الجلسة.`, { parse_mode: 'Markdown' });
            }
        } else if (connection === 'open') {
            console.log(chalk.green(`✅ WhatsApp Bot Connected: ${phoneNumber}`));
            await bot.telegram.sendMessage(userId, `✅ *تم إنشاء البوت بنجاح!*\n\n📱 الرقم: ${phoneNumber}\n🤖 الحالة: متصل`, { parse_mode: 'Markdown' });
        }
    });

    sock.ev.on('creds.update', saveCreds);
    return sock;
}

// =============== أوامر التليجرام ===============
async function startBot() {
    bot.on('callback_query', async (ctx) => {
        if (ctx.callbackQuery.data === "check_membership") {
            const isMember = await checkMembership(ctx.callbackQuery.from.id);
            await ctx.answerCbQuery(isMember ? "✅ تم التحقق! أهلاً بك" : "❌ لم تشترك بعد", { show_alert: true });
            return;
        }
        await ctx.answerCbQuery();
    });

    bot.command("start", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        
        const welcomeMessage = `🔥 *بسم الله الرحمن الرحيم* 🔥

✨ أهلاً بك يا *${ctx.from.first_name}* ✨

🤖 *أنا بوت ${global.BOT_NAME}*  
⚡ أقوى بوت لإنشاء بوتات واتساب حقيقية  
📱 بواسطة أمر واحد فقط  

━━━━━━━━━━━━━━━━━━  
💎 *مميزات البوت:*  
🔹 إنشاء بوتات واتساب بضغطة زر  
🔹 نظام حماية وحظر تلقائي  
🔹 لوحة تحكم للأدمن والمطور  
🔹 سرعة فائقة في الأداء  
━━━━━━━━━━━━━━━━━━  

📌 *لبدء الاستخدام:*  
اكتب /menu  

━━━━━━━━━━━━━━━━━━  
💬 *طور بواسطة:* @IDLEBX  
📢 *قناتنا:* [اضغط هنا](${global.CHANNEL_INVITE_LINK})  
━━━━━━━━━━━━━━━━━━`;

        await sendWithImage(ctx, welcomeMessage);
        await saveUser(ctx.from.id);
    });

    bot.command("menu", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;

        const isUserAdmin = isAdmin(ctx.from.id);
        
        let menu = `📱 *قائمة الأوامر الرئيسية* 📱

🔹 /start - بدء البوت
🔹 /menu - عرض القائمة
🔹 /create <رقم الهاتف> - إنشاء بوت واتساب جديد
🔹 /checkid - معرف حسابك في تليجرام
🔹 /owner - معلومات المطور
🔹 /ping - قياس سرعة البوت

`;

        if (isUserAdmin) {
            menu += `
━━━━━━━━━━━━━━━━━━
👑 *أوامر الأدمن* 👑

🔸 /addprem <id> - إضافة مستخدم مميز
🔸 /delprem <id> - حذف مستخدم مميز
🔸 /listprem - عرض المستخدمين المميزين
🔸 /addresell <id> - إضافة وكيل
🔸 /delresell <id> - حذف وكيل
🔸 /listresell - عرض الوكلاء
🔸 /broadcast <رسالة> - إرسال للجميع
`;
        }

        menu += `\n━━━━━━━━━━━━━━━━━━\n💬 *تم التطوير بواسطة:* @IDLEBX`;

        await sendWithImage(ctx, menu);
    });

    // ✅ الأمر الأساسي لإنشاء بوت واتساب
    bot.command("create", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;

        const text = ctx.message.text.split(' ');
        if (text.length < 2) {
            return sendWithImage(ctx, `❌ *الرجاء إدخال رقم الهاتف*\n\nمثال:\n\`/create 201234567890\`\n\n📱 *ملاحظة:* الرقم مع رمز البلد بدون + أو صفر\nمثال: 201014508636`);
        }

        // تنظيف الرقم من أي أحرف
        let phoneNumber = text[1].replace(/[^0-9]/g, '');
        
        // التأكد من أن الرقم يبدأ برمز البلد بشكل صحيح
        if (phoneNumber.startsWith('0')) {
            phoneNumber = phoneNumber.substring(1);
        }
        
        if (phoneNumber.length < 10) {
            return sendWithImage(ctx, `❌ *رقم غير صالح*\n\nالرجاء إدخال رقم صحيح مع رمز البلد\nمثال: 201014508636`);
        }

        // التحقق من أن الرقم ليس رقم المطور
        if (phoneNumber === global.owner || phoneNumber === "963969061988") {
            return sendWithImage(ctx, `⚠️ *لا يمكن إنشاء بوت بهذا الرقم*\n\nهذا الرقم محمي من قبل المطور.`);
        }

        await sendWithImage(ctx, `⏳ *جاري إنشاء بوت واتساب للرقم:* \`${phoneNumber}\`\n\n🔄 سيتم إرسال كود التفعيل خلال 3 ثوانٍ...`);
        
        try {
            await createWhatsAppBot(phoneNumber, ctx.from.id);
        } catch (error) {
            console.error(error);
            await sendWithImage(ctx, `❌ *خطأ في إنشاء البوت*\n\nالرقم: \`${phoneNumber}\`\nالخطأ: ${error.message}`);
        }
    });

    bot.command("checkid", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        await sendWithImage(ctx, `📱 *معرف حسابك في تليجرام:*\n\n\`${ctx.from.id}\``);
        await saveUser(ctx.from.id);
    });

    bot.command("owner", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        await sendWithImage(ctx, `👨‍💻 *معلومات المطور*\n\n📛 *الاسم:* IDLEBX\n📱 *واتساب:* [اضغط هنا](https://wa.me/${global.owner})\n📢 *القناة:* [اضغط هنا](${global.CHANNEL_INVITE_LINK})\n💬 *المجموعة:* [اضغط هنا](${global.GROUP_LINK})`);
    });

    bot.command("ping", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        const start = Date.now();
        await ctx.reply("🏓");
        const end = Date.now();
        await sendWithImage(ctx, `⚡ *سرعة البوت:* \`${end - start}ms\``);
    });

    // =============== أوامر الأدمن ===============
    bot.command("addprem", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        if (!isAdmin(ctx.from.id)) return;
        const text = ctx.message.text.split(' ');
        if (text.length < 2) return sendWithImage(ctx, "الاستخدام: `/addprem <user_id>`");
        const newAdmin = text[1];
        if (premiumUsers.includes(newAdmin)) return sendWithImage(ctx, "المستخدم موجود بالفعل.");
        premiumUsers.push(newAdmin);
        fs.writeFileSync(premium_file, JSON.stringify(premiumUsers, null, 2));
        await sendWithImage(ctx, `✅ *تمت الإضافة بنجاح*\n\n🆔 المستخدم: \`${newAdmin}\`\n⭐ أصبح مستخدم مميز.`);
    });

    bot.command("delprem", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        if (!isAdmin(ctx.from.id)) return;
        const text = ctx.message.text.split(' ');
        if (text.length < 2) return sendWithImage(ctx, "الاستخدام: `/delprem <user_id>`");
        const adminToRemove = text[1];
        if (!premiumUsers.includes(adminToRemove)) return sendWithImage(ctx, "المستخدم ليس مميزاً.");
        premiumUsers = premiumUsers.filter(id => id !== adminToRemove);
        fs.writeFileSync(premium_file, JSON.stringify(premiumUsers, null, 2));
        await sendWithImage(ctx, `✅ *تمت الإزالة بنجاح*\n\n🆔 المستخدم: \`${adminToRemove}\``);
    });

    bot.command("listprem", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        if (!isAdmin(ctx.from.id)) return;
        if (premiumUsers.length === 0) return sendWithImage(ctx, "📭 *لا يوجد مستخدمين مميزين حالياً*");
        await sendWithImage(ctx, `🌹 *قائمة المستخدمين المميزين:*\n\n${premiumUsers.join('\n')}`);
    });

    bot.command("addresell", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        if (!global.DEVELOPER.includes(ctx.from.id.toString())) return;
        const text = ctx.message.text.split(' ');
        if (text.length < 2) return sendWithImage(ctx, "الاستخدام: `/addresell <user_id>`");
        const newReseller = text[1];
        if (resellerUsers.includes(newReseller)) return sendWithImage(ctx, "المستخدم موجود بالفعل.");
        resellerUsers.push(newReseller);
        fs.writeFileSync(reseller_file, JSON.stringify(resellerUsers, null, 2));
        await sendWithImage(ctx, `✅ *تمت إضافة وكيل جديد*\n\n🆔 المعرف: \`${newReseller}\``);
    });

    bot.command("delresell", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        if (!global.DEVELOPER.includes(ctx.from.id.toString())) return;
        const text = ctx.message.text.split(' ');
        if (text.length < 2) return sendWithImage(ctx, "الاستخدام: `/delresell <user_id>`");
        const resellerToRemove = text[1];
        if (!resellerUsers.includes(resellerToRemove)) return sendWithImage(ctx, "المستخدم ليس وكيلاً.");
        resellerUsers = resellerUsers.filter(id => id !== resellerToRemove);
        fs.writeFileSync(reseller_file, JSON.stringify(resellerUsers, null, 2));
        await sendWithImage(ctx, `✅ *تمت إزالة الوكيل*\n\n🆔 المعرف: \`${resellerToRemove}\``);
    });

    bot.command("listresell", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        if (!global.DEVELOPER.includes(ctx.from.id.toString())) return;
        if (resellerUsers.length === 0) return sendWithImage(ctx, "📭 *لا يوجد وكلاء حالياً*");
        let list = "🌹 *قائمة الوكلاء:*\n\n";
        for (const userId of resellerUsers) {
            try {
                const userInfo = await ctx.telegram.getChat(userId);
                list += `• \`${userId}\` - @${userInfo.username || "بدون معرف"}\n`;
            } catch (err) {
                list += `• \`${userId}\`\n`;
            }
        }
        await sendWithImage(ctx, list);
    });

    bot.command("broadcast", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        if (!global.DEVELOPER.includes(ctx.from.id.toString())) return;
        const cmdParts = ctx.message.text.split(' ');
        if (cmdParts.length < 2) return sendWithImage(ctx, "الاستخدام: `/broadcast <الرسالة>`");
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
        await sendWithImage(ctx, `✅ *تم الإرسال بنجاح*\n\n📨 تم الإرسال إلى: \`${successCount}\`\n📭 فشل: \`${allRecipients.length - successCount}\``);
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
        
        await startBot();
        
        console.log(chalk.green("\n✅ البوت شغال بكامل قوته 🔥"));
        console.log(chalk.blue("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));
    } catch (error) {
        console.error(chalk.red("❌ خطأ:"), error.message);
        process.exit(1);
    }
})();
