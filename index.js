const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// কনফিগারেশন
const TELEGRAM_BOT_TOKEN = '8851831421:AAE3tYukLT-0QEdsu_eUKypBkJHV80fyJGc';
const TELEGRAM_CHAT_ID = '7512451863';
const GREEN_API_INSTANCE = '710722717180';
const GREEN_API_TOKEN = '19e72b9645c84018832f389d59c977241f149e7528404831b8';

// নির্দিষ্ট টার্গেট হোয়াটসঅ্যাপ নম্বর (Chat ID)
const TARGET_CHAT_ID = '8801818877602@c.us';

// ১. হোয়াটসঅ্যাপ থেকে ইনকামিং মেসেজ, ছবি, ভিডিও গ্রহণ (Green-API Webhook)
app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;

        if (body.typeWebhook === 'incomingMessageReceived') {
            const chatId = body.senderData?.chatId || '';

            // শুধু নির্দিষ্ট নম্বরের মেসেজ ফিল্টার করা
            if (chatId === TARGET_CHAT_ID) {
                const senderName = body.senderData?.senderName || 'টার্গেট চ্যাট';
                const messageData = body.messageData;
                const typeMessage = messageData?.typeMessage;

                let textMessage = '';
                let fileUrl = '';

                // মেসেজের ধরন চেক করা (টেক্সট, ছবি, ভিডিও, ফাইল)
                if (typeMessage === 'textMessage') {
                    textMessage = messageData.textMessageData?.textMessage || '';
                } else if (typeMessage === 'extendedTextMessage') {
                    textMessage = messageData.extendedTextMessageData?.text || '';
                } else if (typeMessage === 'imageMessage') {
                    textMessage = messageData.fileMessageData?.caption || '🖼️ [ফটো এসেছে]';
                    fileUrl = messageData.fileMessageData?.downloadUrl || '';
                } else if (typeMessage === 'videoMessage') {
                    textMessage = messageData.fileMessageData?.caption || '🎥 [ভিডিও এসেছে]';
                    fileUrl = messageData.fileMessageData?.downloadUrl || '';
                } else if (typeMessage === 'documentMessage') {
                    textMessage = '📁 [ফাইল/ডকুমেন্ট এসেছে]';
                    fileUrl = messageData.fileMessageData?.downloadUrl || '';
                } else {
                    textMessage = `[অন্যান্য মিডিয়া: ${typeMessage}]`;
                }

                // টেলিগ্রামের জন্য মেসেজ ফরম্যাট করা
                let telegramText = `📩 *হোয়াটসঅ্যাপ থেকে মেসেজ*\n\n👤 *প্রেরক:* ${senderName}\n💬 *মেসেজ:* ${textMessage}`;
                
                if (fileUrl) {
                    telegramText += `\n\n🔗 *মিডিয়া ফাইল লিঙ্ক:* ${fileUrl}`;
                }

                telegramText += `\n\n---\n*রিপ্লাই দিতে এই মেসেজের ওপর Reply করুন।*`;

                // ছবি বা ভিডিও থাকলে মিডিয়াসহ পাঠানো, অন্যথায় নরমাল টেক্সট
                if (typeMessage === 'imageMessage' && fileUrl) {
                    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
                        chat_id: TELEGRAM_CHAT_ID,
                        photo: fileUrl,
                        caption: telegramText,
                        parse_mode: 'Markdown'
                    });
                } else if (typeMessage === 'videoMessage' && fileUrl) {
                    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVideo`, {
                        chat_id: TELEGRAM_CHAT_ID,
                        video: fileUrl,
                        caption: telegramText,
                        parse_mode: 'Markdown'
                    });
                } else {
                    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                        chat_id: TELEGRAM_CHAT_ID,
                        text: telegramText,
                        parse_mode: 'Markdown'
                    });
                }
            }
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Error handling WhatsApp webhook:', error.message);
        res.status(500).send('Error');
    }
});

// ২. টেলিগ্রাম থেকে উত্তর (Reply) গ্রহণ এবং হোয়াটসঅ্যাপে টেক্সট/মিডিয়া পাঠানো (Telegram Webhook)
app.post('/telegram-webhook', async (req, res) => {
    try {
        const body = req.body;

        if (body.message && body.message.reply_to_message) {
            const replyMsg = body.message;

            // ১. উত্তর যদি টেক্সট হয়
            if (replyMsg.text) {
                await axios.post(
                    `https://7107.api.greenapi.com/waInstance${GREEN_API_INSTANCE}/sendMessage/${GREEN_API_TOKEN}`,
                    {
                        chatId: TARGET_CHAT_ID,
                        message: replyMsg.text
                    }
                );
            }
            // ২. উত্তর যদি ফটো/ছবি হয়
            else if (replyMsg.photo) {
                const photoArray = replyMsg.photo;
                const fileId = photoArray[photoArray.length - 1].file_id; // সর্বোচ্চ রেজোলিউশনের ছবি
                
                // টেলিগ্রাম ফাইল ইউআরএল বের করা
                const fileRes = await axios.get(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
                const filePath = fileRes.data.result.file_path;
                const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

                // Green-API দিয়ে ছবি পাঠানো
                await axios.post(
                    `https://7107.api.greenapi.com/waInstance${GREEN_API_INSTANCE}/sendFileByUrl/${GREEN_API_TOKEN}`,
                    {
                        chatId: TARGET_CHAT_ID,
                        urlFile: fileUrl,
                        fileName: 'photo.jpg',
                        caption: replyMsg.caption || ''
                    }
                );
            }

            // টেলিগ্রামে কনফার্মেশন পাঠানো
            await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                chat_id: TELEGRAM_CHAT_ID,
                text: `✅ *হোয়াটসঅ্যাপে (${TARGET_CHAT_ID}) মেসেজ/মিডিয়া পাঠানো হয়েছে!*`,
                parse_mode: 'Markdown'
            });
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Error handling Telegram webhook:', error.message);
        res.status(500).send('Error');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
