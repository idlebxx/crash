require("./settings")
const {
    Telegraf,
    Context,
    Markup
} = require('telegraf')
const {
    simple
} = require("./lib/myfunc")
const fs = require('fs') 
const os = require('os')
const speed = require('performance-now')
const axios = require('axios')
const chalk = require("chalk")
const { exec } = require('child_process');
const cooldowns = new Map();

const adminfile = 'lib/premium.json';
const adminIDs = JSON.parse(fs.readFileSync(adminfile, 'utf8'));

const { Client } = require('ssh2');
global.api = (name, path = '/', query = {}, apikeyqueryname) => (name in global.APIs ? global.APIs[name] : name) + path + (query || apikeyqueryname ? '?' + new URLSearchParams(Object.entries({
    ...query,
    ...(apikeyqueryname ? {
        [apikeyqueryname]: global.APIKeys[name in global.APIs ? global.APIs[name] : name]
    } : {})
})) : '')

function escapeMarkdownV2(text) {
    return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

const usersFile = 'users.json';
if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify([]));
}

async function saveUser(userId) {
    let users = [];
    if (fs.existsSync(usersFile)) {
        try {
            const data = fs.readFileSync(usersFile, 'utf8');
            users = JSON.parse(data);
        } catch (error) {
            console.error('Error reading users file:', error);
            users = [];
        }
    }
    if (!users.includes(userId)) {
        users.push(userId);
        try {
            fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
            console.log(`User ID ${userId} added to the users list.`);
        } catch (error) {
            console.error('Error writing to users file:', error);
        }
    }
}

let allUsers = [];
try {
    allUsers = JSON.parse(fs.readFileSync(usersFile));
} catch (error) {
    console.error('Error reading users file:', error);
}

const premium_file = 'lib/premium.json';
const reseller_file = 'lib/reseller.json';
let premiumUsers = [];
let resellerUsers = [];

try {
    premiumUsers = JSON.parse(fs.readFileSync(premium_file));
} catch (error) {
    console.error('Error reading premiumUsers file:', error);
    premiumUsers = [];
}
try {
    resellerUsers = JSON.parse(fs.readFileSync(reseller_file));
} catch (error) {
    console.error('Error reading resellerUsers file:', error);
    resellerUsers = [];
}

const bot = new Telegraf(global.BOT_TOKEN)

async function checkMembership(userId) {
    try {
        const isInGroup = await bot.telegram.getChatMember(global.GROUP_ID, userId);
        const isInChannel = await bot.telegram.getChatMember(global.CHANNEL_ID, userId);
        return isInGroup.status !== 'left' && isInChannel.status !== 'left';
    } catch (err) {
        console.error("checkMembership error:", err);
        return true;
    }
}

async function verifyUser(ctx, next) {
    const userId = ctx.from.id;
    const isMember = await checkMembership(userId);
    if (!isMember) {
        return ctx.replyWithPhoto(global.pp, {
            caption: "❌ *Access Denied!*\n\nYou must join, subscribe and follow all the *given links* to use this bot.",
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📲 WhatsApp", url: global.WHATSAPP_LINK }],
                    [{ text: "▶️ YouTube", url: global.YOUTUBE_LINK }],
                    [{ text: "📷 TIKTOK", url: global.INSTAGRAM_LINK }],
                    [{ text: "🔹 Telegram Group", url: global.GROUP_LINK }],
                    [{ text: "🔵 Telegram Channel", url: global.CHANNEL_INVITE_LINK }],
                    [{ text: "🔄 Check Again", callback_data: "check_membership" }]
                ]
            }
        });
    } else {
        return next();
    }
}

async function startXeony() {
    bot.on('callback_query', async (XeonBotInc) => {
        try {
            const userId = XeonBotInc.callbackQuery.from.id;
            const action = XeonBotInc.callbackQuery.data.split(' ');

            if (XeonBotInc.callbackQuery.data === "check_membership") {
                const isMember = await checkMembership(userId);
                await XeonBotInc.answerCbQuery( 
                    isMember ? "✅ Verified! You can now use the bot." : "❌ You haven't completed the tasks yet!",
                    { show_alert: true }
                ).catch(err => console.error("answerCbQuery error:", err));
                return;
            }

            await XeonBotInc.answerCbQuery().catch(err => console.error("answerCbQuery error:", err));

            if (action.length > 1 && Number(action[1]) !== userId) {
                await XeonBotInc.answerCbQuery('❌ This button is not for you!', { show_alert: true })
                    .catch(err => console.error("answerCbQuery error:", err));
                return;
            }

            const isMember = await checkMembership(userId);
            if (!isMember) {
                await XeonBotInc.answerCbQuery("❌ You must join our group and channel first!", { show_alert: true })
                    .catch(err => console.error("answerCbQuery error:", err));
                return;
            }

            const timestampi = speed();
            const latensii = speed() - timestampi;

            const user = XeonBotInc.callbackQuery.from;
            const pushname = user.first_name;
            const username = user.username ? user.username : "user";

            const reply = async (text) => {
                for (let x of [0]) {
                    await XeonBotInc.replyWithMarkdown(text, {
                        disable_web_page_preview: true
                    }).catch(err => console.error("Reply error:", err));
                }
            };

            switch (action[0]) {
                case 'some_action': 
                    await reply(`✅ Action executed for ${pushname}`);
                    break;
                default:
                    await reply("❌ Unknown action.");
                    break;
            }
        } catch (error) {
            console.error("Error processing callback query:", error);
        }
    });

    bot.command("start", verifyUser, async (XeonBotInc) => {
        if (XeonBotInc.chat.type !== "private") return;
        const user = XeonBotInc.message.from;
        try {
            await XeonBotInc.replyWithPhoto(global.pp, {
                caption: `👋 مرحباً ${user.first_name}\n\n🤖 أنا بوت ${global.BOT_NAME}\n📱 يمكنك استخدام الأوامر المتاحة`,
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '👨‍💻 المطور', url: "https://t.me/idlebx2" }, { text: '📢 القناة', url: global.CHANNEL_INVITE_LINK }]
                    ]
                }
            });
        } catch (err) {
            console.error("Error sending start message:", err);
            await XeonBotInc.reply(`👋 مرحباً ${user.first_name}\n\n🤖 أنا بوت ${global.BOT_NAME}`);
        }
    });

    bot.command("menu", verifyUser, async (XeonBotInc) => {
        if (XeonBotInc.chat.type !== "private") return;
        const menu = `
📱 *قائمة الأوامر* 📱

🔹 /start - بدء البوت
🔹 /menu - عرض القائمة
🔹 /checkid - معرف حسابك
🔹 /owner - معلومات المطور
🔹 /ping - قياس سرعة البوت

👑 *أوامر المالك*
🔹 /broadcast - إرسال رسالة للجميع
🔹 /addprem <id> - إضافة مستخدم مميز
🔹 /delprem <id> - حذف مستخدم مميز
🔹 /listprem - عرض المستخدمين المميزين
        `;
        await XeonBotInc.reply(menu, { parse_mode: 'Markdown' });
    });

    bot.command("owner", verifyUser, async (XeonBotInc) => {
        if (XeonBotInc.chat.type !== "private") return;
        const ownerInfo = `
👨‍💻 *معلومات المطور*

📛 *الاسم:* IDLEBX
📱 *واتساب:* [اضغط هنا](https://wa.me/963969061988)
📢 *قناة:* [اضغط هنا](${global.CHANNEL_INVITE_LINK})
💬 *مجموعة:* [اضغط هنا](${global.GROUP_LINK})
        `;
        await XeonBotInc.reply(ownerInfo, { parse_mode: 'Markdown', disable_web_page_preview: true });
    });

    bot.command("ping", verifyUser, async (XeonBotInc) => {
        if (XeonBotInc.chat.type !== "private") return;
        const start = Date.now();
        await XeonBotInc.reply("🏓 Pong!");
        const end = Date.now();
        await XeonBotInc.reply(`⚡ السرعة: ${end - start}ms`);
    });

    bot.command("listprem", verifyUser, async (XeonBotInc) => {
        if (XeonBotInc.chat.type !== "private") return;
        const isReseller = resellerUsers.includes(XeonBotInc.message.from.id.toString());
        if (!isReseller && !global.DEVELOPER.includes(XeonBotInc.message.from.id.toString())) {
            return XeonBotInc.reply(`🚫 *Only resellers can use this command.*`, { parse_mode: "Markdown" });
        }
        try {
            if (premiumUsers.length === 0) {
                return XeonBotInc.reply("📭 No premium users found.");
            }
            const adminList = premiumUsers.join('\n');
            await XeonBotInc.reply(`🌹 *Premium List:*\n\n${adminList}`, { parse_mode: "Markdown" });
        } catch (error) {
            console.error("Error listing premium users:", error);
            XeonBotInc.reply("Error listing premium users.");
        }
    });

    bot.command('addprem', verifyUser, async (XeonBotInc) => {
        if (XeonBotInc.chat.type !== "private") return;
        const isReseller = resellerUsers.includes(XeonBotInc.message.from.id.toString());
        if (!isReseller && !global.DEVELOPER.includes(XeonBotInc.message.from.id.toString())) {
            return XeonBotInc.reply(`🚫 *Only resellers can use this command.*`, { parse_mode: "Markdown" });
        }
        const text = XeonBotInc.message.text.split(' ');
        if (text.length < 2) {
            return XeonBotInc.reply("Please provide the user ID to add as premium user.\nUsage: `/addprem <user_id>`", { parse_mode: "Markdown" });
        }
        const newAdmin = text[1];
        if (premiumUsers.includes(newAdmin)) {
            return XeonBotInc.reply("This user is already a premium user.");
        }
        try {
            premiumUsers.push(newAdmin);
            fs.writeFileSync(premium_file, JSON.stringify(premiumUsers, null, 2));
            XeonBotInc.reply(`✅ User ${newAdmin} added as premium.`);
        } catch (error) {
            console.error('Error adding user as premium:', error);
            XeonBotInc.reply('Error adding user as premium.');
        }
    });

    bot.command('delprem', verifyUser, async (XeonBotInc) => {
        if (XeonBotInc.chat.type !== "private") return;
        const isReseller = resellerUsers.includes(XeonBotInc.message.from.id.toString());
        if (!isReseller && !global.DEVELOPER.includes(XeonBotInc.message.from.id.toString())) {
            return XeonBotInc.reply(`🚫 *Only resellers can use this command.*`, { parse_mode: "Markdown" });
        }
        const text = XeonBotInc.message.text.split(' ');
        if (text.length < 2) {
            return XeonBotInc.reply("Please provide the user ID to remove as premium user.\nUsage: `/delprem <user_id>`", { parse_mode: "Markdown" });
        }
        const adminToRemove = text[1];
        if (!premiumUsers.includes(adminToRemove)) {
            return XeonBotInc.reply("This user is not a premium user.");
        }
        try {
            premiumUsers = premiumUsers.filter((id) => id !== adminToRemove);
            fs.writeFileSync(premium_file, JSON.stringify(premiumUsers, null, 2));
            XeonBotInc.reply(`✅ User ${adminToRemove} removed from premium.`);
        } catch (error) {
            console.error('Error removing premium user:', error);
            XeonBotInc.reply('Error removing premium user.');
        }
    });

    bot.command('addresell', verifyUser, async (XeonBotInc) => {
        if (XeonBotInc.chat.type !== "private") return;
        const isOwner = global.DEVELOPER.includes(XeonBotInc.message.from.id.toString());
        if (!isOwner) {
            return XeonBotInc.reply(`🚫 *Only owner can use this command.*`, { parse_mode: "Markdown" });
        }
        const text = XeonBotInc.message.text.split(' ');
        if (text.length < 2) {
            return XeonBotInc.reply("Please provide the user ID to add as reseller.\nUsage: `/addresell <user_id>`", { parse_mode: "Markdown" });
        }
        const newReseller = text[1];
        if (resellerUsers.includes(newReseller)) {
            return XeonBotInc.reply("This user is already a reseller.");
        }
        try {
            resellerUsers.push(newReseller);
            fs.writeFileSync(reseller_file, JSON.stringify(resellerUsers, null, 2));
            XeonBotInc.reply(`✅ User ${newReseller} added as reseller.`);
        } catch (error) {
            console.error('Error adding user as reseller:', error);
            XeonBotInc.reply('Error adding user as reseller.');
        }
    });

    bot.command('delresell', verifyUser, async (XeonBotInc) => {
        if (XeonBotInc.chat.type !== "private") return;
        const isOwner = global.DEVELOPER.includes(XeonBotInc.message.from.id.toString());
        if (!isOwner) {
            return XeonBotInc.reply(`🚫 *Only owner can use this command.*`, { parse_mode: "Markdown" });
        }
        const text = XeonBotInc.message.text.split(' ');
        if (text.length < 2) {
            return XeonBotInc.reply("Please provide the user ID to remove as reseller.\nUsage: `/delresell <user_id>`", { parse_mode: "Markdown" });
        }
        const resellerToRemove = text[1];
        if (!resellerUsers.includes(resellerToRemove)) {
            return XeonBotInc.reply("This user is not a reseller.");
        }
        try {
            resellerUsers = resellerUsers.filter((id) => id !== resellerToRemove);
            fs.writeFileSync(reseller_file, JSON.stringify(resellerUsers, null, 2));
            XeonBotInc.reply(`✅ User ${resellerToRemove} removed from reseller.`);
        } catch (error) {
            console.error('Error removing reseller:', error);
            XeonBotInc.reply('Error removing reseller.');
        }
    });

    bot.command('listresell', verifyUser, async (XeonBotInc) => {
        if (XeonBotInc.chat.type !== "private") return;
        const isOwner = global.DEVELOPER.includes(XeonBotInc.message.from.id.toString());
        if (!isOwner) {
            return XeonBotInc.reply(`🚫 *Only owner can use this command.*`, { parse_mode: "Markdown" });
        }
        try {
            if (resellerUsers.length === 0) {
                return XeonBotInc.reply("📭 No reseller found.");
            }
            let list = "🌹 *Reseller List:*\n\n";
            for (const userId of resellerUsers) {
                try {
                    const userInfo = await XeonBotInc.telegram.getChat(userId);
                    const username = userInfo.username ? `@${userInfo.username}` : "No username";
                    list += `• ${userId} - ${username}\n`;
                } catch (err) {
                    list += `• ${userId} - No username\n`;
                }
            }
            await XeonBotInc.reply(list, { parse_mode: "Markdown" });
        } catch (error) {
            console.error("Error listing resellers:", error);
            XeonBotInc.reply("Error listing resellers.");
        }
    });

    bot.command('broadcast', verifyUser, async (XeonBotInc) => {
        if (XeonBotInc.chat.type !== "private") return;
        const isOwner = global.DEVELOPER.includes(XeonBotInc.message.from.id.toString());
        if (!isOwner) {
            return XeonBotInc.reply(`🚫 *Only owner can use this command.*`, { parse_mode: "Markdown" });
        }
        const cmdParts = XeonBotInc.message.text.split(' ');
        if (cmdParts.length < 2) {
            return XeonBotInc.reply("Please provide a message to broadcast.\nUsage: `/broadcast <message>`", { parse_mode: 'Markdown' });
        }
        const broadcastMessage = cmdParts.slice(1).join(' ');
        const allRecipients = Array.from(new Set([...allUsers, ...premiumUsers]));
        let successCount = 0;
        for (const userId of allRecipients) {
            try {
                await XeonBotInc.telegram.sendMessage(userId, broadcastMessage, { parse_mode: 'Markdown' });
                successCount++;
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (err) {}
        }
        XeonBotInc.reply(`✅ Broadcast completed.\n📨 Success: ${successCount}\n📭 Failed: ${allRecipients.length - successCount}`);
    });

    bot.command('checkid', verifyUser, (XeonBotInc) => {
        if (XeonBotInc.chat.type !== "private") return;
        const text = `👋 مرحباً @${XeonBotInc.from.username || "User"}\n\n📱 *معرف حسابك في تليجرام:*\n\`${XeonBotInc.from.id}\`\n\nيمكنك نسخ المعرف والاحتفاظ به.`;
        XeonBotInc.reply(text, { parse_mode: 'Markdown' });
    });

    bot.on('message', async (XeonBotInc) => {
        const messageText = XeonBotInc.message.text;
        if (!messageText || (!messageText.startsWith('.') && !messageText.startsWith('/') && !messageText.startsWith('!'))) return;
        if (XeonBotInc.chat.type !== 'private') return;
        const userId = XeonBotInc.from.id;
        const isMember = await checkMembership(userId);
        if (!isMember) {
            return XeonBotInc.replyWithPhoto(global.pp, {
                caption: "❌ *Access Denied!*\n\nYou must join, subscribe and follow all the *given links* to use this bot.",
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📲 WhatsApp", url: global.WHATSAPP_LINK }],
                        [{ text: "▶️ YouTube", url: global.YOUTUBE_LINK }],
                        [{ text: "📷 TIKTOK", url: global.INSTAGRAM_LINK }],
                        [{ text: "🔹 Telegram Group", url: global.GROUP_LINK }],
                        [{ text: "🔵 Telegram Channel", url: global.CHANNEL_INVITE_LINK }],
                        [{ text: "🔄 Check Again", callback_data: "check_membership" }]
                    ]
                }
            });
        }
        await saveUser(userId);
    });

    bot.launch({
        dropPendingUpdates: true
    });

    bot.telegram.getMe().then((getme) => {
        console.table({
            "Bot Name": getme.first_name,
            "Username": "@" + getme.username,
            "ID": getme.id,
            "Link": `https://t.me/${getme.username}`,
            "Author": "FLIXKILL"
        });
    });

    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

const { default: makeWASocket, generateWAMessageFromContent, DisconnectReason, jidDecode, Browsers, proto, getContentType, useMultiFileAuthState, fetchLatestBaileysVersion, downloadContentFromMessage } = require("@adiwajshing/baileys");
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const readline = require("readline");
const _ = require('lodash');
const FileType = require('file-type');
const path = require('path');
const yargs = require('yargs/yargs');
const PhoneNumber = require('awesome-phonenumber');
const simple2 = require('./lib2/oke.js');
const { smsg } = require('./lib/myfunc');

global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse());
global.db = JSON.parse(fs.readFileSync("./database/database.json") || "{}");
if (global.db) global.db.data = global.db.data || { users: {}, settings: {} };

const question = (text) => { 
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); 
    return new Promise((resolve) => { rl.question(text, resolve) }) 
};

async function XeonBotIncStart() {
    const { version, isLatest } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState("session");

    const XeonBotInc = simple2({
        auth: state,
        logger: pino({ level: 'silent' }),
        version: [2, 3000, 1026924051],
        printQRInTerminal: true,
    }, global.store);

    const readline = require("readline");

    if (!XeonBotInc.authState.creds.registered) {
        const phoneNumber = await question('📱 Enter your phone number with country code (without + or space):\n');
        let code = await XeonBotInc.requestPairingCode(phoneNumber, 'HXBYFLIX');
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log(`🔑 Pairing Code:`, code);
    }

    XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
        try {
            const mek = chatUpdate.messages[0];
            const type = mek.message ? (getContentType(mek.message) || Object.keys(mek.message)[0]) : '';
            if (!mek.message) return;
            mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
            if (!XeonBotInc.public && !mek.key.fromMe && chatUpdate.type === 'notify') return;
            if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return;
            const m = smsg(XeonBotInc, mek, global.store);
        } catch (err) {
            console.log(err);
        }
    });

    XeonBotInc.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return decode.user && decode.server && decode.user + '@' + decode.server || jid;
        } else return jid;
    }

    XeonBotInc.public = true;

    XeonBotInc.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('📱 QR Code received! Scan it with WhatsApp:');
            console.log(qr);
        }

        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            switch (reason) {
                case DisconnectReason.badSession:
                    console.error('Bad session file. Deleting session and reconnecting...');
                    fs.rmSync('./session', { recursive: true, force: true });
                    XeonBotIncStart();
                    break;
                case DisconnectReason.connectionClosed:
                case DisconnectReason.connectionLost:
                case DisconnectReason.timedOut:
                    console.warn('Connection closed. Reconnecting...');
                    XeonBotIncStart();
                    break;
                case DisconnectReason.loggedOut:
                    console.error('Logged out. Delete session and re-run the script.');
                    fs.rmSync('./session', { recursive: true, force: true });
                    break;
                default:
                    console.error(`Unknown disconnect reason: ${reason}. Reconnecting...`);
                    XeonBotIncStart();
                    break;
            }
        } else if (connection === 'open') {
            console.log(chalk.green.bold(`✅ Connected to WhatsApp: ${XeonBotInc.user.id.split(":")[0]}`));
        }
    });

    XeonBotInc.ev.on('creds.update', saveCreds);
    return XeonBotInc;
}

(async () => {
    try {
        console.log(chalk.blue.bold("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
        console.log(chalk.green.bold("     🤖 STARTING BOT SYSTEM 🤖"));
        console.log(chalk.blue.bold("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
        
        console.log(chalk.yellow("\n📱 Connecting to WhatsApp..."));
        await XeonBotIncStart();
        
        console.log(chalk.green("✅ WhatsApp Connected!"));
        console.log(chalk.yellow("\n🤖 Starting Telegram Bot..."));
        await startXeony();
        
        console.log(chalk.green("✅ Telegram Bot Started!"));
        console.log(chalk.blue.bold("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
        console.log(chalk.green.bold("     🎉 BOTH BOTS ARE RUNNING 🎉"));
        console.log(chalk.blue.bold("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));
    } catch (error) {
        console.error(chalk.red("❌ Fatal Error:"), error.message);
        process.exit(1);
    }
})();
