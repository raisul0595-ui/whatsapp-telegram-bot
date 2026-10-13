const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// কনফিগারেশন
const TELEGRAM_BOT_TOKEN = '8851831421:AAE3tYukLT-0QEdsu_eUKypBkJHV80fyJGc';
const TELEGRAM_CHAT_ID = '7512451863';

// গ্রিন-এপিআই ইনকামিং মেসেজ লিসেনার (Webhook)
app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;

        if (body.typeWebhook === 'incomingMessageReceived') {
            const senderName = body.senderData?.senderName || 'অজানা ব্যক্তি';
            const senderPhone = body.senderData?.sender || '';
            const messageData = body.messageData;

            let textMessage = '';

            if (messageData.typeMessage === 'textMessage') {
                textMessage = messageData.textMessageData?.textMessage || '';
            } else if (messageData.typeMessage === 'extendedTextMessage') {
                textMessage = messageData.extendedTextMessageData?.text || '';
            } else {
                textMessage = `[মিডিয়া/ফাইল: ${messageData.typeMessage}]`;
            }

            const telegramText = `📩 *নতুন হোয়াটসঅ্যাপ মেসেজ*\n\n👤 *প্রেরক:* ${senderName} (${senderPhone})\n💬 *মেসেজ:* ${textMessage}`;

            await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                chat_id: TELEGRAM_CHAT_ID,
                text: telegramText,
                parse_mode: 'Markdown'
            });
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Error handling webhook:', error.message);
        res.status(500).send('Error');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
         
