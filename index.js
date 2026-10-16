const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Configuration
const TELEGRAM_BOT_TOKEN = '8851831421:AAE3tYukLT-0QEdsu_eUKypBkJHV80fyJGc';
const TELEGRAM_CHAT_ID = '7512451863';
const GREEN_API_INSTANCE = '710722717180';
const GREEN_API_TOKEN = '19e72b9645c84018832f389d59c977241f149e7528404831b8';

// Target WhatsApp Chat ID
const TARGET_CHAT_ID = '8801818877602@c.us';

// Helper function to send media/text to Telegram
async function sendToTelegram(endpoint, payload) {
    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${endpoint}`, payload);
    } catch (err) {
        console.error('Telegram Send Error:', err.message);
    }
}

// 1. WhatsApp Webhook (Incoming Messages/Media)
app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;

        if (body.typeWebhook === 'incomingMessageReceived') {
            const chatId = body.senderData?.chatId || '';

            if (chatId === TARGET_CHAT_ID) {
                const messageData = body.messageData;
                const typeMessage = messageData?.typeMessage;

                if (typeMessage === 'textMessage' || typeMessage === 'extendedTextMessage') {
                    const text = messageData.textMessageData?.textMessage || messageData.extendedTextMessageData?.text || '';
                    await sendToTelegram('sendMessage', {
                        chat_id: TELEGRAM_CHAT_ID,
                        text: text
                    });
                } else if (typeMessage === 'imageMessage') {
                    const caption = messageData.fileMessageData?.caption || '';
                    const url = messageData.fileMessageData?.downloadUrl || '';
                    await sendToTelegram('sendPhoto', {
                        chat_id: TELEGRAM_CHAT_ID,
                        photo: url,
                        caption: caption
                    });
                } else if (typeMessage === 'videoMessage') {
                    const caption = messageData.fileMessageData?.caption || '';
                    const url = messageData.fileMessageData?.downloadUrl || '';
                    await sendToTelegram('sendVideo', {
                        chat_id: TELEGRAM_CHAT_ID,
                        video: url,
                        caption: caption
                    });
                } else if (typeMessage === 'audioMessage' || typeMessage === 'voiceMessage') {
                    const url = messageData.fileMessageData?.downloadUrl || '';
                    await sendToTelegram('sendVoice', {
                        chat_id: TELEGRAM_CHAT_ID,
                        voice: url
                    });
                } else if (typeMessage === 'documentMessage') {
                    const url = messageData.fileMessageData?.downloadUrl || '';
                    const fileName = messageData.fileMessageData?.fileName || 'document';
                    await sendToTelegram('sendDocument', {
                        chat_id: TELEGRAM_CHAT_ID,
                        document: url,
                        caption: fileName
                    });
                }
            }
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('WhatsApp Webhook Error:', error.message);
        res.status(500).send('Error');
    }
});

// 2. Telegram Webhook (Direct Chatting from Bot to WhatsApp)
app.post('/telegram-webhook', async (req, res) => {
    try {
        const body = req.body;

        if (body.message && body.message.chat.id.toString() === TELEGRAM_CHAT_ID) {
            const msg = body.message;

            // Direct Text Message
            if (msg.text) {
                await axios.post(
                    `https://7107.api.greenapi.com/waInstance${GREEN_API_INSTANCE}/sendMessage/${GREEN_API_TOKEN}`,
                    {
                        chatId: TARGET_CHAT_ID,
                        message: msg.text
                    }
                );
            } 
            // Photo Message
            else if (msg.photo) {
                const photoArray = msg.photo;
                const fileId = photoArray[photoArray.length - 1].file_id;
                
                const fileRes = await axios.get(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
                const filePath = fileRes.data.result.file_path;
                const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

                await axios.post(
                    `https://7107.api.greenapi.com/waInstance${GREEN_API_INSTANCE}/sendFileByUrl/${GREEN_API_TOKEN}`,
                    {
                        chatId: TARGET_CHAT_ID,
                        urlFile: fileUrl,
                        fileName: 'image.jpg',
                        caption: msg.caption || ''
                    }
                );
            }
            // Voice/Audio Message
            else if (msg.voice || msg.audio) {
                const fileId = (msg.voice || msg.audio).file_id;
                
                const fileRes = await axios.get(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
                const filePath = fileRes.data.result.file_path;
                const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

                await axios.post(
                    `https://7107.api.greenapi.com/waInstance${GREEN_API_INSTANCE}/sendFileByUrl/${GREEN_API_TOKEN}`,
                    {
                        chatId: TARGET_CHAT_ID,
                        urlFile: fileUrl,
                        fileName: 'voice.ogg'
                    }
                );
            }
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Telegram Webhook Error:', error.message);
        res.status(500).send('Error');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
