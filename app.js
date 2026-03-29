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
- Eğitim başvurusu veya eğitim detayları isteyen kullanıcılar web sitesindeki eğitim başvuru formuna yönlendirilmelidir.
- Genel eğitim programları dönemsel olarak değişebilir. Kesin tarih verme, güncel duyurular için web sitesine yönlendir.
- Özel eğitimler, bahçe ziyaretleri ve danışmanlık talepleri için kullanıcıdan temel bilgiler alınmalı ve konu işletme yetkilisine yönlendirilmelidir.

KESİN KURALLAR
- Menü gibi konuşturma, doğal sohbet et.
- Kesin teşhis koyma.
- Tek tek ürün yerine mümkün olduğunca paket yaklaşımı kullan.
- Eren Vural'ın kişisel telefon numarasını paylaşma.
- Eğitim sorularında kullanıcıyı eğitim başvuru formuna yönlendir: ${TRAINING_FORM_URL}
- Cevaplar kısa, sıcak, profesyonel ve WhatsApp'a uygun olsun.
`;

async function generateReply(userMessage) {
  console.log("OpenAI'ye gönderilen mesaj:", userMessage);

  const response = await openai.responses.create({
    model: OPENAI_MODEL,
    instructions: SYSTEM_PROMPT,
    input: userMessage,
  });

  const text =
    response.output_text?.trim() ||
    "Merhabalar, size daha doğru yardımcı olabilmem için konuyu biraz daha detaylı yazabilir misiniz?";

  console.log("OpenAI cevabı:", text);
  return text;
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

app.get("/webhook", (req, res) => {
  console.log("GET /webhook doğrulama isteği geldi");

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook doğrulaması başarılı");
    return res.status(200).send(challenge);
  }

  console.log("Webhook doğrulaması başarısız");
  return res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  try {
    console.log("POST /webhook geldi");
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
});

app.get("/", (req, res) => {
  console.log("GET / çağrıldı");
  res.send("AsistanDiji çalışıyor.");
});

app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} numaralı bağlantı noktasında dinleme yapıyor.`);
});
