const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// কনফিগারেশন
const TELEGRAM_BOT_TOKEN = '8851831421:AAE3tYukLT-0QEdsu_eUKypBkJHV80fyJGc';
const TELEGRAM_CHAT_ID = '7512451863';

// Green-API Credentials (আপনার স্ক্রিনশট থেকে প্রাপ্ত)
const GREEN_API_ID = '710722717180';
const GREEN_API_TOKEN = '19e72b9645c84018832f389d59c977241f149e7528404831b8';

// ১. WhatsApp থেকে আসা মেসেজ Telegram-এ পাঠানোর ওয়েবহুক
app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;

        if (body.typeWebhook === 'incomingMessageReceived') {
            const senderName = body.senderData?.senderName || 'অজানা ব্যক্তি';
            const senderPhone = body.senderData?.sender || ''; // এটি হোয়াটসঅ্যাপ চ্যাট আইডি (যেমন: 88017xxxx@c.us)
            const messageData = body.messageData;

            let textMessage = '';

            if (messageData.typeMessage === 'textMessage') {
                textMessage = messageData.textMessageData?.textMessage || '';
            } else if (messageData.typeMessage === 'extendedTextMessage') {
                textMessage = messageData.extendedTextMessageData?.text || '';
            } else {
                textMessage = `[মিডিয়া/ফাইল: ${messageData.typeMessage}]`;
            }

            // টেলিগ্রামে পাঠানোর মেসেজ ফরম্যাট (প্রেরকের নম্বরটি সেভ করে রাখা হচ্ছে যাতে রিপ্লাই দিলে বোঝা যায়)
            const telegramText = `📩 *WhatsApp Message*\n👤 *From:* ${senderName}\n📞 *ChatID:* \`${senderPhone}\`\n\n💬 *Message:* ${textMessage}`;

            await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                chat_id: TELEGRAM_CHAT_ID,
                text: telegramText,
                parse_mode: 'Markdown'
            });
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook Error:', error.message);
        res.status(500).send('Error');
    }
});

// ২. Telegram থেকে মেসেজ দিয়ে WhatsApp-এ রিপ্লাই পাঠানোর লজিক (Telegram Bot Update Listener)
app.post('/telegram-webhook', async (req, res) => {
    try {
        const update = req.body;

        if (update.message && update.message.text) {
            const chatId = update.message.chat.id;
            const text = update.message.text;

            // শুধু নির্দিষ্ট আপনার টেলিগ্রাম চ্যাট আইডি থেকে মেসেজ গ্রহণ করবে
            if (chatId.toString() === TELEGRAM_CHAT_ID) {
                // ফরম্যাট চেক করার জন্য: টেলিগ্রামে মেসেজ দেওয়ার সময় প্রথমে হোয়াটসঅ্যাপ নম্বর বা চ্যাট আইডি দিতে হবে, তারপর স্পেস দিয়ে মেসেজ।
                // অথবা সহজ করার জন্য আপনি চাইলে সরাসরি কোডে নির্দিষ্ট কোনো নম্বরে পাঠাতে পারেন।
                // উদাহরণস্বরূপ ফরম্যাট: 88017XXXXXXXX@c.us আপনার_মেসেজ
                const parts = text.split(' ');
                const recipientWhatsAppChatId = parts[0]; // যেমন: 8801724220595@c.us
                const messageBody = parts.slice(1).join(' ');

                if (recipientWhatsAppChatId && messageBody) {
                    // Green-API ব্যবহার করে WhatsApp-এ মেসেজ পাঠানো
                    await axios.post(`https://7107.api.greenapi.com/waInstance${GREEN_API_ID}/sendMessage/${GREEN_API_TOKEN}`, {
                        chatId: recipientWhatsAppChatId,
                        message: messageBody
                    });

                    // সফল হলে টেলিগ্রামে কনফার্মেশন পাঠানো
                    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                        chat_id: TELEGRAM_CHAT_ID,
                        text: `✅ হোয়াটসঅ্যাপে মেসেজ পাঠানো হয়েছে!`
                    });
                }
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
