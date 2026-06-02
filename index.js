require("./settings");
const { Telegraf } = require('telegraf');
const fs = require('fs');
const chalk = require('chalk');
const speed = require('performance-now');
const axios = require('axios');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const path = require('path');

// =============== إعدادات التليجرام ===============
const bot = new Telegraf(global.BOT_TOKEN);
const usersFile = 'users.json';
const premium_file = 'lib/premium.json';
const reseller_file = 'lib/reseller.json';

// =============== إنشاء الملفات إذا لم تكن موجودة ===============
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, JSON.stringify([]));
if (!fs.existsSync(premium_file)) fs.writeFileSync(premium_file, JSON.stringify([]));
if (!fs.existsSync(reseller_file)) fs.writeFileSync(reseller_file, JSON.stringify([]));
if (!fs.existsSync('./database/database.json')) {
    if (!fs.existsSync('./database')) fs.mkdirSync('./database');
    fs.writeFileSync('./database/database.json', JSON.stringify({}));
}
if (!fs.existsSync('baileysDB.json')) fs.writeFileSync('baileysDB.json', JSON.stringify({}));

// =============== قراءة الملفات ===============
let allUsers = JSON.parse(fs.readFileSync(usersFile));
let premiumUsers = JSON.parse(fs.readFileSync(premium_file));
let resellerUsers = JSON.parse(fs.readFileSync(reseller_file));

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
            caption: "❌ *Access Denied!*\n\nYou must join to use this bot.",
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📢 Channel", url: global.CHANNEL_INVITE_LINK }],
                    [{ text: "👥 Group", url: global.GROUP_LINK }],
                    [{ text: "🔄 Check Again", callback_data: "check_membership" }]
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
            await ctx.answerCbQuery(isMember ? "✅ Verified!" : "❌ Not yet!", { show_alert: true });
            return;
        }
        await ctx.answerCbQuery();
    });

    bot.command("start", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        await ctx.replyWithPhoto(global.pp, {
            caption: `👋 *Welcome ${ctx.from.first_name}*\n\n🤖 Bot: ${global.BOT_NAME}\n\n📱 *Commands:*\n/menu - Show menu\n/checkid - Your ID\n/owner - Developer`,
            parse_mode: "Markdown"
        });
        await saveUser(ctx.from.id);
    });

    bot.command("menu", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        const menu = `
📱 *BOT MENU* 📱

🔹 /start - Start bot
🔹 /menu - Show menu
🔹 /checkid - Your Telegram ID
🔹 /owner - Developer info
🔹 /ping - Bot speed

👑 *Owner Commands*
🔹 /broadcast - Send to all
🔹 /addprem <id> - Add premium
🔹 /delprem <id> - Remove premium
🔹 /listprem - Premium list
🔹 /addresell <id> - Add reseller
🔹 /delresell <id> - Remove reseller
🔹 /listresell - Reseller list
        `;
        await ctx.reply(menu, { parse_mode: 'Markdown' });
    });

    bot.command("checkid", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        await ctx.reply(`📱 *Your ID:*\n\`${ctx.from.id}\``, { parse_mode: 'Markdown' });
        await saveUser(ctx.from.id);
    });

    bot.command("owner", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        await ctx.reply(`👨‍💻 *Developer*\n\n📛 Name: IDLEBX\n📱 WhatsApp: [Click here](https://wa.me/${global.owner})\n📢 Channel: [Click here](${global.CHANNEL_INVITE_LINK})`, { parse_mode: 'Markdown', disable_web_page_preview: true });
    });

    bot.command("ping", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        const start = Date.now();
        await ctx.reply("🏓 Pong!");
        const end = Date.now();
        await ctx.reply(`⚡ Speed: ${end - start}ms`);
    });

    bot.command("listprem", verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        const isReseller = resellerUsers.includes(ctx.from.id.toString()) || global.DEVELOPER.includes(ctx.from.id.toString());
        if (!isReseller) return ctx.reply("🚫 *Only resellers/owner can use this command.*", { parse_mode: "Markdown" });
        if (premiumUsers.length === 0) return ctx.reply("📭 No premium users.");
        await ctx.reply(`🌹 *Premium List:*\n\n${premiumUsers.join('\n')}`, { parse_mode: "Markdown" });
    });

    bot.command('addprem', verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        const isReseller = resellerUsers.includes(ctx.from.id.toString()) || global.DEVELOPER.includes(ctx.from.id.toString());
        if (!isReseller) return ctx.reply("🚫 *Only resellers/owner can use this command.*", { parse_mode: "Markdown" });
        const text = ctx.message.text.split(' ');
        if (text.length < 2) return ctx.reply("Usage: `/addprem <user_id>`", { parse_mode: "Markdown" });
        const newAdmin = text[1];
        if (premiumUsers.includes(newAdmin)) return ctx.reply("User already premium.");
        premiumUsers.push(newAdmin);
        fs.writeFileSync(premium_file, JSON.stringify(premiumUsers, null, 2));
        await ctx.reply(`✅ User ${newAdmin} added as premium.`);
    });

    bot.command('delprem', verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        const isReseller = resellerUsers.includes(ctx.from.id.toString()) || global.DEVELOPER.includes(ctx.from.id.toString());
        if (!isReseller) return ctx.reply("🚫 *Only resellers/owner can use this command.*", { parse_mode: "Markdown" });
        const text = ctx.message.text.split(' ');
        if (text.length < 2) return ctx.reply("Usage: `/delprem <user_id>`", { parse_mode: "Markdown" });
        const adminToRemove = text[1];
        if (!premiumUsers.includes(adminToRemove)) return ctx.reply("User not premium.");
        premiumUsers = premiumUsers.filter(id => id !== adminToRemove);
        fs.writeFileSync(premium_file, JSON.stringify(premiumUsers, null, 2));
        await ctx.reply(`✅ User ${adminToRemove} removed from premium.`);
    });

    bot.command('addresell', verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        if (!global.DEVELOPER.includes(ctx.from.id.toString())) return ctx.reply("🚫 *Only owner can use this command.*", { parse_mode: "Markdown" });
        const text = ctx.message.text.split(' ');
        if (text.length < 2) return ctx.reply("Usage: `/addresell <user_id>`", { parse_mode: "Markdown" });
        const newReseller = text[1];
        if (resellerUsers.includes(newReseller)) return ctx.reply("User already reseller.");
        resellerUsers.push(newReseller);
        fs.writeFileSync(reseller_file, JSON.stringify(resellerUsers, null, 2));
        await ctx.reply(`✅ User ${newReseller} added as reseller.`);
    });

    bot.command('delresell', verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        if (!global.DEVELOPER.includes(ctx.from.id.toString())) return ctx.reply("🚫 *Only owner can use this command.*", { parse_mode: "Markdown" });
        const text = ctx.message.text.split(' ');
        if (text.length < 2) return ctx.reply("Usage: `/delresell <user_id>`", { parse_mode: "Markdown" });
        const resellerToRemove = text[1];
        if (!resellerUsers.includes(resellerToRemove)) return ctx.reply("User not reseller.");
        resellerUsers = resellerUsers.filter(id => id !== resellerToRemove);
        fs.writeFileSync(reseller_file, JSON.stringify(resellerUsers, null, 2));
        await ctx.reply(`✅ User ${resellerToRemove} removed from reseller.`);
    });

    bot.command('listresell', verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        if (!global.DEVELOPER.includes(ctx.from.id.toString())) return ctx.reply("🚫 *Only owner can use this command.*", { parse_mode: "Markdown" });
        if (resellerUsers.length === 0) return ctx.reply("📭 No reseller found.");
        let list = "🌹 *Reseller List:*\n\n";
        for (const userId of resellerUsers) {
            try {
                const userInfo = await ctx.telegram.getChat(userId);
                list += `• ${userId} - @${userInfo.username || "no username"}\n`;
            } catch (err) {
                list += `• ${userId}\n`;
            }
        }
        await ctx.reply(list, { parse_mode: "Markdown" });
    });

    bot.command('broadcast', verifyUser, async (ctx) => {
        if (ctx.chat.type !== "private") return;
        if (!global.DEVELOPER.includes(ctx.from.id.toString())) return ctx.reply("🚫 *Only owner can use this command.*", { parse_mode: "Markdown" });
        const cmdParts = ctx.message.text.split(' ');
        if (cmdParts.length < 2) return ctx.reply("Usage: `/broadcast <message>`", { parse_mode: 'Markdown' });
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
        await ctx.reply(`✅ Broadcast done.\n📨 Success: ${successCount}\n📭 Failed: ${allRecipients.length - successCount}`);
    });

    bot.on('message', async (ctx) => {
        await saveUser(ctx.from.id);
    });

    bot.launch();
    bot.telegram.getMe().then((getme) => {
        console.log(chalk.green(`✅ Telegram Bot: @${getme.username}`));
    });
}

// =============== إعدادات الواتساب ===============
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");

async function XeonBotIncStart() {
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState("session");

    const XeonBotInc = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        version: [2, 3000, 1026924051],
        printQRInTerminal: true,
    });

    // 🟢 رقم الهاتف معين مسبقاً - غير هذا الرقم إلى رقم هاتفك 🟢
    if (!XeonBotInc.authState.creds.registered) {
        const phoneNumber = "963969061988"; // 🔴 غير هذا الرقم إلى رقم هاتفك (مع رمز البلد بدون + أو صفر)
        console.log(chalk.yellow(`📱 Using phone number: ${phoneNumber}`));
        let code = await XeonBotInc.requestPairingCode(phoneNumber, 'HXBYFLIX');
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log(chalk.green(`🔑 Pairing Code: ${code}`));
        console.log(chalk.cyan(`📱 Open WhatsApp > Settings > Linked Devices > Link a Device`));
        console.log(chalk.cyan(`🔑 Enter this code: ${code}`));
    }

    XeonBotInc.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log(chalk.yellow('📱 QR Code (if pairing fails):'));
            console.log(qr);
        }
        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
                console.log(chalk.red('❌ Logged out. Delete session folder and restart.'));
            } else {
                console.log(chalk.yellow('🔄 Reconnecting in 5 seconds...'));
                setTimeout(() => XeonBotIncStart(), 5000);
            }
        } else if (connection === 'open') {
            console.log(chalk.green(`✅ WhatsApp Connected: ${XeonBotInc.user.id.split(":")[0]}`));
        }
    });

    XeonBotInc.ev.on('creds.update', saveCreds);
    return XeonBotInc;
}

// =============== التشغيل الرئيسي ===============
(async () => {
    try {
        console.log(chalk.blue("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
        console.log(chalk.green("     🤖 STARTING BOT SYSTEM 🤖"));
        console.log(chalk.blue("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));
        
        console.log(chalk.yellow("📱 Connecting to WhatsApp..."));
        await XeonBotIncStart();
        
        console.log(chalk.green("✅ WhatsApp Connected!"));
        console.log(chalk.yellow("\n🤖 Starting Telegram Bot..."));
        await startXeony();
        
        console.log(chalk.green("✅ Telegram Bot Started!"));
        console.log(chalk.blue("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
        console.log(chalk.green("     🎉 BOTH BOTS ARE RUNNING 🎉"));
        console.log(chalk.blue("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));
    } catch (error) {
        console.error(chalk.red("❌ Error:"), error.message);
        process.exit(1);
    }
})();
