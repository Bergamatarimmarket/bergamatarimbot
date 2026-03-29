const express = require("express");
const axios = require("axios");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const PORT = process.env.PORT || 3000;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const TRAINING_FORM_URL = "https://www.bergamatarimmarket.com/contact/";

const SYSTEM_PROMPT = `
Senin adın AsistanDiji.

Sen, Bergama Tarım Market adına WhatsApp üzerinden müşterilerle görüşen dijital tarım danışmanısın.
Ana uzmanlık alanın zeytin yetiştiriciliği, dönemsel zeytin besleme paketleri, budama hizmetleri, bahçeye özel ön değerlendirme ve eğitim yönlendirmeleridir.

KURUM BİLGİSİ
- Bergama Tarım Market, zeytin yetiştiriciliği ve zeytin bakım süreçleri üzerine çalışır.
- Zeytin bahçeleri için dönemsel bakım ve besleme paketleri sunar.
- Bahçeye özel besleme programları hazırlanır.
- Gübre ve ilaç başlıkları konuşulabilir ama kullanıcı mümkün olduğunca tek tek bağımsız ürünlere değil, paketlere yönlendirilmelidir.
- Zeytin hasat makineleri hakkında da temel yönlendirme yapılabilir.
- Ziraat Mühendisi Eren Vural ekip arkadaşımızdır.
- Eren Vural ile birlikte zeytinlik budama hizmetleri, danışmanlık, bahçe ziyaretleri ve eğitim çalışmaları yürütülür.
- Türkiye'nin farklı bölgelerinde eğitimler düzenlenebilir.
- Eğitim duyuruları ve başvuru detayları web sitesi üzerinden yayınlanır.
- Eğitim başvurusu veya eğitim detayları isteyen kullanıcılar web sitesindeki eğitim başvuru formuna yönlendirilmelidir: ${TRAINING_FORM_URL}
- Genel eğitim programları dönemsel olarak değişebilir. Kesin tarih verme, güncel duyurular için web sitesine yönlendir.
- Özel eğitimler, bahçe ziyaretleri ve danışmanlık talepleri için kullanıcıdan temel bilgiler alınmalı ve konu işletme yetkilisine yönlendirilmelidir.

KESİN KURALLAR
- Menü gibi konuşturma, doğal sohbet et.
- Kesin teşhis koyma.
- Tek tek ürün yerine mümkün olduğunca paket yaklaşımı kullan.
- Eren Vural'ın kişisel telefon numarasını paylaşma.
- Kullanıcıyı gerektiğinde şu bilgileri vermeye yönlendir: il, ilçe/bölge, dekar, ağaç yaşı, sulama durumu, sorun ne zaman başladı, önceki uygulamalar, toprak analizi, güncel fotoğraf.
- Eğitim sorularında başvuru formuna yönlendir.
- Cevaplar kısa, sıcak, profesyonel ve WhatsApp'a uygun olsun.

PAKET MANTIĞI
- Kışlık bakım paketi
- Tomurcuk / çiçeklenme öncesi paket
- Meyve tutumu sonrası paket
- Tane büyütme paketi

KARŞILAMA
"Merhabalar, ben Bergama Tarım Market’in dijital tarım danışmanı AsistanDiji. Zeytin yetiştiriciliği, dönemsel bakım paketleri, budama, eğitimler ve bahçenize özel ön değerlendirme konusunda yardımcı olabilirim. Sorununuzu detaylı yazabilir veya fotoğraf gönderebilirsiniz."
`;

async function generateReply(userMessage) {
  try {
    console.log("OpenAI'ye gönderilen mesaj:", userMessage);
    console.log("Model:", OPENAI_MODEL);
    console.log("API key var mı:", !!OPENAI_API_KEY);

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ],
      temperature: 0.7
    });

    const text =
      response.choices?.[0]?.message?.content?.trim() ||
      "Merhabalar, size daha doğru yardımcı olabilmem için konuyu biraz daha detaylı yazabilir misiniz?";

    console.log("OpenAI cevabı:", text);
    return text;
  } catch (error) {
    console.error(
      "OpenAI hata detayı:",
      error?.response?.data || error?.message || error
    );
    return "Merhabalar, şu anda sistem yoğunluğu nedeniyle yanıt oluştururken kısa süreli bir sorun yaşandı. Sorununuzu biraz daha detaylı yazarsanız tekrar yardımcı olayım.";
  }
}

async function sendWhatsAppMessage(to, body) {
  console.log("WhatsApp'a gönderiliyor:", { to, body });

  const result = await axios.post(
    `https://graph.facebook.com/v23.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    },
    {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );

  console.log("WhatsApp gönderim sonucu:", result.data);
}

function verifyWebhook(req, res) {
  console.log("Webhook doğrulama isteği geldi");

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook doğrulaması başarılı");
    return res.status(200).send(challenge);
  }

  console.log("Webhook doğrulaması başarısız");
  return res.sendStatus(403);
}

async function handleIncomingMessage(req, res) {
  try {
    console.log("POST webhook geldi");
    console.log("Gelen body:", JSON.stringify(req.body, null, 2));

    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) {
      console.log("Mesaj objesi bulunamadı");
      return res.sendStatus(200);
    }

    const from = message.from;
    const messageType = message.type;
    let userText = "";

    console.log("Mesaj tipi:", messageType);
    console.log("Gönderen:", from);

    if (messageType === "text") {
      userText = message.text?.body || "";
    } else if (messageType === "image") {
      userText =
        "Kullanıcı bir görsel gönderdi. Nazikçe görselin neyle ilgili olduğunu sor. Eğer zeytin bahçesi, yaprak, dal, meyve, kuruma, sararma, budama veya hastalık belirtisiyle ilgiliyse yakın plan ve genel görünüm iste. Ön değerlendirme yap ama kesin teşhis koyma.";
    } else {
      userText =
        "Kullanıcı metin dışında bir içerik gönderdi. Nazikçe metin veya fotoğraf ile detay istemen gerekiyor.";
    }

    const reply = await generateReply(userText);
    await sendWhatsAppMessage(from, reply);

    console.log("İşlem tamamlandı");
    return res.sendStatus(200);
  } catch (error) {
    console.error(
      "Webhook error detay:",
      error.response?.data || error.message || error
    );
    return res.sendStatus(500);
  }
}

// Hem eski hem yeni webhook yolu destekleniyor
app.get("/", verifyWebhook);
app.get("/webhook", verifyWebhook);

app.post("/", handleIncomingMessage);
app.post("/webhook", handleIncomingMessage);

app.get("/health", (req, res) => {
  res.send("AsistanDiji çalışıyor.");
});

app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} numaralı bağlantı noktasında dinleme yapıyor.`);
});
