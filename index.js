require("./settings");
const { Telegraf } = require('telegraf');
const fs = require('fs');
const chalk = require('chalk');
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

// متغير لمنع إعادة طلب الكود أكثر من مرة
let pairingRequested = {};

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

async function sendWithImage(ctx, text, extraOptions = {}) {
    return ctx.replyWithPhoto(global.pp, {
        caption: text,
        parse_mode: 'Markdown',
        ...extraOptions
    });
}

function isAdmin(userId) {
    const isDev = global.DEVELOPER.includes(userId.toString());
    const isReseller = resellerUsers.includes(userId.toString());
    const isPremium = premiumUsers.includes(userId.toString());
    return isDev || isReseller || isPremium;
}

// =============== إنشاء بوت واتساب (كود مرة واحدة فقط) ===============
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

    // منع طلب كود جديد إذا كان قد طلب سابقاً
    if (pairingRequested[phoneNumber]) {
        console.log(chalk.yellow(`⚠️ Pairing already requested for ${phoneNumber}, skipping...`));
        return sock;
    }

    // انتظار ثانيتين ثم طلب الكود مرة واحدة فقط
    setTimeout(async () => {
        if (!sock.authState.creds.registered && !pairingRequested[phoneNumber]) {
            pairingRequested[phoneNumber] = true;
            try {
                let code = await sock.requestPairingCode(phoneNumber, 'HXBYFLIX');
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                
                // حفظ الكود في ملف
                fs.writeFileSync('./lib2/pairing/pairing.json', JSON.stringify({ code: code, phone: phoneNumber, time: Date.now() }, null, 2));
                
                // إرسال الكود للمستخدم
                await bot.telegram.sendMessage(userId, 
`🔐 *كود ربط واتساب*

📱 *الرقم:* \`${phoneNumber}\`
🔑 *الكود:* \`${code}\`

━━━━━━━━━━━━━━━━━━
📌 *طريقة الاستخدام:*
1️⃣ افتح واتساب على هاتفك
2️⃣ اذهب إلى *الإعدادات* (Settings)
3️⃣ اختر *الأجهزة المرتبطة* (Linked Devices)
4️⃣ اضغط على *ربط جهاز* (Link a Device)
5️⃣ أدخل هذا الكود: \`${code}\`

⚠️ *تنبيه:* هذا الكود صالح لمرة واحدة فقط ولمدة دقيقتين
━━━━━━━━━━━━━━━━━━`, { parse_mode: 'Markdown' });
                
                console.log(chalk.green(`✅ Pairing code sent for ${phoneNumber}: ${code}`));
            } catch (err) {
                pairingRequested[phoneNumber] = false;
                console.error(chalk.red(`Error: ${err.message}`));
                await bot.telegram.sendMessage(userId, `❌ *خطأ في إنشاء البوت*\n\nالرقم: ${phoneNumber}\nالسبب: ${err.message}\n\n⚠️ تأكد من أن الرقم صحيح ومستخدم على واتساب`, { parse_mode: 'Markdown' });
            }
        }
    }, 2000);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
                delete pairingRequested[phoneNumber];
                await bot.telegram.sendMessage(userId, `❌ *تم تسجيل الخروج*\n\nالرقم: ${phoneNumber}\nالسبب: تم تسجيل الخروج من الجهاز`, { parse_mode: 'Markdown' });
            }
        } else if (connection === 'open') {
            console.log(chalk.green(`✅ WhatsApp Bot Connected: ${phoneNumber}`));
            await bot.telegram.sendMessage(userId, `✅ *تم ربط البوت بنجاح!*\n\n📱 الرقم: ${phoneNumber}\n🤖 الحالة: متصل وجاهز للعمل`, { parse_mode: 'Markdown' });
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
            await ctx.answerCbQuery(isMember ? "✅ تم التحقق!" : "❌ لم تشترك بعد", { show_alert: true });
            return;
        }
        await ctx.answerCbQuery();
    });

    bot.command("start", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        
        const welcomeMessage = `🔥 *CRASH IDLEB X* 🔥

✨ أهلاً بك يا *${ctx.from.first_name}* ✨

🤖 *أنا بوت إنشاء بوتات واتساب*
⚡ أقوى بوت لإنشاء بوتات واتساب حقيقية

━━━━━━━━━━━━━━━━━━
💎 *المميزات:*
🔹 إنشاء بوتات واتساب بضغطة زر
🔹 كود ربط صحيح يعمل مرة واحدة
🔹 نظام حماية متكامل
━━━━━━━━━━━━━━━━━━

📌 *لإنشاء بوت جديد:*
\`/create 201234567890\`

━━━━━━━━━━━━━━━━━━
💬 *طور بواسطة:* @IDLEBX
📢 *قناتنا:* [اضغط هنا](${global.CHANNEL_INVITE_LINK})`;

        await sendWithImage(ctx, welcomeMessage);
        await saveUser(ctx.from.id);
    });

    bot.command("menu", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        
        let menu = `📱 *قائمة الأوامر*

🔹 /start - بدء البوت
🔹 /menu - عرض القائمة
🔹 /create <رقم> - إنشاء بوت واتساب
🔹 /checkid - معرف حسابك
🔹 /owner - المطور
🔹 /ping - سرعة البوت`;

        if (isAdmin(ctx.from.id)) {
            menu += `

━━━━━━━━━━━━━━━━━━
👑 *أوامر الأدمن*

🔸 /addprem <id> - إضافة مميز
🔸 /delprem <id> - حذف مميز
🔸 /listprem - قائمة المميزين
🔸 /broadcast <رسالة> - إرسال للجميع`;
        }

        menu += `\n\n━━━━━━━━━━━━━━━━━━\n💬 @IDLEBX`;
        await sendWithImage(ctx, menu);
    });

    // أمر إنشاء بوت واتساب
    bot.command("create", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;

        const text = ctx.message.text.split(' ');
        if (text.length < 2) {
            return sendWithImage(ctx, `❌ *الرجاء إدخال رقم الهاتف*

مثال:
\`/create 201234567890\`

📱 *ملاحظة:* الرقم مع رمز البلد بدون + أو صفر`);
        }

        let phoneNumber = text[1].replace(/[^0-9]/g, '');
        if (phoneNumber.startsWith('0')) phoneNumber = phoneNumber.substring(1);
        
        if (phoneNumber.length < 10) {
            return sendWithImage(ctx, `❌ *رقم غير صالح*

الرجاء إدخال رقم صحيح مع رمز البلد
مثال: 201014508636`);
        }

        if (phoneNumber === "963969061988") {
            return sendWithImage(ctx, `⚠️ *لا يمكن إنشاء بوت بهذا الرقم*

هذا الرقم محمي من قبل المطور.`);
        }

        await sendWithImage(ctx, `⏳ *جاري تجهيز بوت واتساب*

📱 الرقم: \`${phoneNumber}\`
🔄 سيتم إرسال كود التفعيل خلال ثوانٍ...

⚠️ *تنبيه:* الكود يصدر مرة واحدة فقط، استخدمه فور وصوله`);
        
        try {
            await createWhatsAppBot(phoneNumber, ctx.from.id);
        } catch (error) {
            await sendWithImage(ctx, `❌ *خطأ*

الرقم: \`${phoneNumber}\`
السبب: ${error.message}`);
        }
    });

    bot.command("checkid", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        await sendWithImage(ctx, `📱 *معرف حسابك:*\n\n\`${ctx.from.id}\``);
        await saveUser(ctx.from.id);
    });

    bot.command("owner", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        await sendWithImage(ctx, `👨‍💻 *المطور*\n\n📛 IDLEBX\n📱 [واتساب](${global.WHATSAPP_LINK})\n📢 [القناة](${global.CHANNEL_INVITE_LINK})`);
    });

    bot.command("ping", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        const start = Date.now();
        await ctx.reply("🏓");
        const end = Date.now();
        await sendWithImage(ctx, `⚡ *السرعة:* \`${end - start}ms\``);
    });

    // أوامر الأدمن
    bot.command("addprem", verifyUser, async (ctx) => {
        if (!isAdmin(ctx.from.id)) return;
        const text = ctx.message.text.split(' ');
        if (text.length < 2) return sendWithImage(ctx, "الاستخدام: `/addprem <user_id>`");
        const newAdmin = text[1];
        if (premiumUsers.includes(newAdmin)) return sendWithImage(ctx, "المستخدم موجود بالفعل.");
        premiumUsers.push(newAdmin);
        fs.writeFileSync(premium_file, JSON.stringify(premiumUsers, null, 2));
        await sendWithImage(ctx, `✅ تمت إضافة \`${newAdmin}\` كمستخدم مميز`);
    });

    bot.command("delprem", verifyUser, async (ctx) => {
        if (!isAdmin(ctx.from.id)) return;
        const text = ctx.message.text.split(' ');
        if (text.length < 2) return sendWithImage(ctx, "الاستخدام: `/delprem <user_id>`");
        const adminToRemove = text[1];
        if (!premiumUsers.includes(adminToRemove)) return sendWithImage(ctx, "المستخدم ليس مميزاً.");
        premiumUsers = premiumUsers.filter(id => id !== adminToRemove);
        fs.writeFileSync(premium_file, JSON.stringify(premiumUsers, null, 2));
        await sendWithImage(ctx, `✅ تمت إزالة \`${adminToRemove}\` من المميزين`);
    });

    bot.command("listprem", verifyUser, async (ctx) => {
        if (!isAdmin(ctx.from.id)) return;
        if (premiumUsers.length === 0) return sendWithImage(ctx, "📭 لا يوجد مستخدمين مميزين");
        await sendWithImage(ctx, `🌹 *المميزين:*\n\n${premiumUsers.join('\n')}`);
    });

    bot.command("broadcast", verifyUser, async (ctx) => {
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
        await sendWithImage(ctx, `✅ تم الإرسال\n📨 نجح: ${successCount}\n📭 فشل: ${allRecipients.length - successCount}`);
    });

    bot.on('message', async (ctx) => {
        await saveUser(ctx.from.id);
    });

    bot.launch();
    bot.telegram.getMe().then((getme) => {
        console.log(chalk.green(`✅ بوت التليجرام: @${getme.username}`));
    });
}

// =============== التشغيل ===============
(async () => {
    try {
        console.log(chalk.blue("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
        console.log(chalk.green("     🤖 STARTING BOT 🤖"));
        console.log(chalk.blue("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));
        
        await startBot();
        
        console.log(chalk.green("\n✅ البوت شغال 🔥"));
        console.log(chalk.blue("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));
    } catch (error) {
        console.error(chalk.red("❌ خطأ:"), error.message);
        process.exit(1);
    }
})();
