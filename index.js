const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// কনফিগারেশন
const TELEGRAM_BOT_TOKEN = '8851831421:AAE3tYukLT-0QEdsu_eUKypBkJHV80fyJGc';
const TELEGRAM_CHAT_ID = '7512451863';
const GREEN_API_INSTANCE = '710722717180';
const GREEN_API_TOKEN = '19e72b9645c84018832f389d59c977241f149e7528404831b8';

// ১. হোয়াটসঅ্যাপ থেকে ইনকামিং মেসেজ গ্রহণ (Green-API Webhook)
app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;

        if (body.typeWebhook === 'incomingMessageReceived') {
            const senderName = body.senderData?.senderName || 'অজানা ব্যক্তি';
            const senderPhone = body.senderData?.sender || '';
            const chatId = body.senderData?.chatId || '';
            const messageData = body.messageData;

            let textMessage = '';

            if (messageData.typeMessage === 'textMessage') {
                textMessage = messageData.textMessageData?.textMessage || '';
            } else if (messageData.typeMessage === 'extendedTextMessage') {
                textMessage = messageData.extendedTextMessageData?.text || '';
            } else {
                textMessage = `[মিডিয়া/ফাইল: ${messageData.typeMessage}]`;
            }

            const telegramText = `📩 *নতুন হোয়াটসঅ্যাপ মেসেজ*\n\n👤 *প্রেরক:* ${senderName}\n📱 *নম্বর:* ${senderPhone}\n🆔 *Chat ID:* \`${chatId}\`\n\n💬 *মেসেজ:* ${textMessage}\n\n--- \n*রিপ্লাই দিতে এই মেসেজের ওপর Reply করুন।*`;

            await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                chat_id: TELEGRAM_CHAT_ID,
                text: telegramText,
                parse_mode: 'Markdown'
            });
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Error handling WhatsApp webhook:', error.message);
        res.status(500).send('Error');
    }
});

// ২. টেলিগ্রাম থেকে উত্তর (Reply) গ্রহণ এবং হোয়াটসঅ্যাপে পাঠানো (Telegram Webhook)
app.post('/telegram-webhook', async (req, res) => {
    try {
        const body = req.body;

        if (body.message && body.message.reply_to_message) {
            const replyText = body.message.text;
            const originalText = body.message.reply_to_message.text || '';

            // অরিজিনাল মেসেজ থেকে Chat ID খুঁজে বের করা
            const match = originalText.match(/Chat ID:\s*([^\s\n]+)/);

            if (match && match[1]) {
                const waChatId = match[1];

                // Green-API ব্যবহার করে হোয়াটসঅ্যাপে উত্তর পাঠানো
                await axios.post(
                    `https://7107.api.greenapi.com/waInstance${GREEN_API_INSTANCE}/sendMessage/${GREEN_API_TOKEN}`,
                    {
                        chatId: waChatId,
                        message: replyText
                    }
                );

                // টেলিগ্রামে কনফার্মেশন পাঠানো
                await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    chat_id: TELEGRAM_CHAT_ID,
                    text: `✅ *হোয়াটসঅ্যাপে মেসেজ পাঠানো হয়েছে!*`,
                    parse_mode: 'Markdown'
                });
            }
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
