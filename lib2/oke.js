const { makeWASocket } = require("@whiskeysockets/baileys");
const { useMultiFileAuthState } = require("@whiskeysockets/baileys");
const logger = require('pino')({ level: 'silent' });

function simple(connectionOptions, store) {
    const conn = makeWASocket({
        ...connectionOptions,
        logger,
        generateHighQualityLinkPreview: true,
        patchMessageBeforeSending: (message) => {
            const requiresPatch = !!(message.buttonsMessage || message.listMessage || message.templateMessage || message.interactiveMessage);
            if (requiresPatch) {
                message = {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadataVersion: 2,
                                deviceListMetadata: {},
                            },
                            ...message,
                        },
                    },
                };
            }
            return message;
        },
        getMessage: async (key) => {
            if (store && store.loadMessage) {
                const msg = await store.loadMessage(key.remoteJid, key.id);
                if (msg?.message) return msg.message;
            }
            return { conversation: "Hello" };
        },
    });
    return conn;
}

module.exports = simple;
