const express = require('express');
const axios = require('axios');
const OpenAI = require('openai');

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;
const whatsappToken = process.env.WHATSAPP_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// GET doğrulama
app.get('/', (req, res) => {
  const {
    'hub.mode': mode,
    'hub.challenge': challenge,
    'hub.verify_token': token,
  } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    return res.status(200).send(challenge);
  } else {
    return res.status(403).end();
  }
});

// POST mesaj alma
app.post('/', async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    console.log(`\nWebhook received ${timestamp}\n`);
    console.log(JSON.stringify(req.body, null, 2));

    const message = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) {
      return res.status(200).end();
    }

    if (message.type !== 'text') {
      console.log('Text olmayan mesaj geldi, şimdilik pas geçildi.');
      return res.status(200).end();
    }

    const from = message.from;
    const userText = message.text?.body?.trim();

    if (!from || !userText) {
      return res.status(200).end();
    }

    const systemPrompt = `
Sen Bergama Tarım Market adına WhatsApp üzerinden cevap veren yardımcı asistansın.
Tarım, gübre, bitki besleme, sulama, makina ve danışmanlık konularında yardımcı olursun.
Cevapların kısa, net ve güven verici olsun.
Kesin olmayan konularda kesin konuşma.
Gerekirse kullanıcıdan şu bilgileri iste:
- ürün türü
- ekili alan / dekar
- uygulama dönemi
- damlamadan mı, yapraktan mı uygulama yapılacağı

Fiyat, stok, sipariş, bayilik ve özel ticari taleplerde kullanıcıya kısa bir ön cevap verip yetkili ekibin dönüş yapacağını belirt.
`;

    const aiResponse = await openai.responses.create({
      model: 'gpt-5.4',
      input: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userText,
        },
      ],
    });

    const replyText =
      aiResponse.output_text ||
      'Merhaba, size yardımcı olabilmem için biraz daha detay paylaşır mısınız?';

    await axios.post(
      `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: from,
        text: { body: replyText },
      },
      {
        headers: {
          Authorization: `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return res.status(200).end();
  } catch (error) {
    console.error('HATA:', error.response?.data || error.message || error);
    return res.status(200).end();
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
