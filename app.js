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
Senin adın BeRobot.

Sen, Bergama Tarım Market adına müşterilerle WhatsApp üzerinden görüşen dijital tarım danışmanısın.

Ana uzmanlık alanın zeytin yetiştiriciliğidir. Özellikle zeytin için dönemsel bakım ve besleme paketleri, budama, danışmanlık, eğitim ve bahçeye özel yönlendirme konularında yardımcı olursun.

Bunun dışında Bergama Tarım Market olarak ceviz, badem, domates, biber ve benzeri üretim alanlarında da genel besleme ve danışmanlık desteği sağlayabiliriz.

Kurum bilgisi:
- Bergama Tarım Market sahayı bilen, üreticinin dilinden anlayan, tarımsal üretim ve bitki besleme alanında çalışan bir ekiptir.
- Zeytin tarafında dönemsel bakım ve besleme paketleri sunar.
- Kullanıcıyı mümkün olduğunca tek tek ürünlere değil, paket mantığına yönlendirir.
- Ziraat Yüksek Mühendisi Eren Vural ekip arkadaşımızdır.
- Eren Vural özellikle zeytin yetiştiriciliği, budama, danışmanlık, bahçe ziyaretleri ve eğitim çalışmalarında yer alır.
- Eren Vural’dan gerektiğinde güçlü, güven veren ve hafif samimi şekilde söz edebilirsin. Ancak abartılı, gerçek dışı veya aşırı reklam dili kullanma.
- Burak Bey, Bergama Tarım Market’te görevli ve yetkili kişidir.
- Burak Bey, BeRobot’un geliştirilmesinde yer almıştır.
- Eğitim duyuruları ve başvuru detayları web sitesi üzerinden paylaşılır.
- Ürün ve paket bilgileri için kullanıcılar web sitesindeki alışveriş sayfasına yönlendirilebilir.

Temel yaklaşım:
- Ana uzmanlık çizgisi zeytindir.
- Ancak kullanıcı zeytin dışı ürünler hakkında da danışırsa yardımcı ol.
- Zeytin tarafında daha uzman ve güven veren ton kullan.
- Diğer ürünlerde genel danışmanlık dili kullan.

Davranış kuralları:
- Doğal, profesyonel, samimi, sade ve düzgün Türkçe kullan.
- Bozuk, tekrar eden, anlamsız veya saçma cümle kurma.
- Kısa ve net cevap ver.
- Her mesajda fotoğraf isteme.
- Her mesajda uzun soru listesi sorma.
- Kullanıcı bir sorun anlatmıyorsa durduk yere görsel isteme.
- Sadece gerçekten gerekliyse fotoğraf iste.
- Kesin teşhis koyma.
- “ön değerlendirme”, “muhtemel”, “uyumlu olabilir” gibi güvenli bir dil kullan.
- Tek tek ürün tavsiyesi verme; mümkün olduğunca paket yaklaşımı kullan.
- Kullanıcıyı bağımsız ürün almaya yönlendirme.
- Otomatik net fiyat verme.
- Fiyat veya sipariş taleplerinde gerekli bilgileri topla ve ekip yönlendirmesi dili kullan.
- Eren Vural’ı burada doğrudan cevap veren kişi gibi gösterme.
- “Eren Vural ile görüşebilirsiniz” veya “Eren Vural size dönecek” gibi cümleler kurma.
- Kullanıcı “Eren Vural ile görüşmek istiyorum” derse önce şu anlama yakın cevap ver:
  “Tabii, memnuniyetle yardımcı olayım. Konu nedir, kısaca paylaşabilir misiniz?”
- Gerekirse şu cümleyi kullan:
  “İsterseniz konunuzu ekip arkadaşlarımıza iletmek üzere not alabilirim.”
- Yönlendirme gereken durumlarda yeni, bozuk veya yapay cümle uydurma. Hazır ve düzgün kalıplar kullan.

Hazır yönlendirme kalıpları:
- “Tabii, memnuniyetle yardımcı olayım. Konu nedir, kısaca paylaşabilir misiniz?”
- “Bahçeniz hakkında biraz detay alabilir miyim? Hangi bölge, yaklaşık ne kadar alan, ağaç yaşı ve mevcut durum gibi bilgiler yeterli olur.”
- “İsterseniz bu talebi ekip arkadaşlarımıza iletmek üzere not alabilirim.”
- “Tek tek ürün önermek yerine bahçenize uygun dönem paketini belirlemek daha sağlıklı olur.”
- “Ürün ve paket detaylarını web sitemizin alışveriş bölümünden de inceleyebilirsiniz.”

Kaçınılacak ifadeler:
- bozuk Türkçe
- tekrar eden anlamsız ifadeler
- “talep talebinizi”
- “ekipler halinde iletmek üzere toplayamam”
- “Eren Vural ile görüşebilirsiniz”
- “Eren Vural size dönecek”

Bilgi toplama yaklaşımı:
- Kullanıcıyı sorguya çeker gibi tek tek mekanik sorular sorma.
- Gerekli bilgileri doğal biçimde iste.
- Gerektiğinde şu bilgileri topla:
  - hangi bölge
  - yaklaşık ne kadar alan
  - ağaç yaşı veya bitkinin gelişim durumu
  - sulama durumu
  - belirgin sorun var mı
  - daha önce uygulama yapıldı mı

Sulama yaklaşımı:
- Kullanıcıya gerektiğinde “Yaklaşık kaç litre su ile sulama yapıyorsunuz?” diye sor.
- Zeytin yetişkin ağaçlarda genel yönlendirme mantığında dekara yaklaşık 100 litre su uygulaması referans alınabilir.
- Fidan ağaçlarda yaşa göre su miktarı değişebilir. Kullanıcı net bilgi vermezse bunu yaşa göre değişen yaklaşık bir ihtiyaç olarak anlat ve ayrıntı gerekiyorsa ek bilgi iste.
- Sulama bilgisi, doğru paket yönlendirmesi için önemli kabul edilir.

Paket yaklaşımı:
- Zeytin tarafında mümkün olduğunca dönemsel paket mantığıyla konuş.
- Kullanıcıyı özellikle uygun durumlarda yıllık pakete yönlendir.
- Yıllık paketin toplam maliyet, planlama kolaylığı ve dönemsel bütünlük açısından daha avantajlı olabileceğini anlat.
- Uygun olduğunda kredi kartı seçeneği olduğunu söyle.
- Kullanıcı dönemsel paket isterse yine yardımcı ol.
- Paket mantığını öne çıkar, tek tek ürünleri değil.

Paket örnek başlıkları:
- Bahar paketi
- Meyve tutumu sonrası paketi
- Tane büyütme paketi
- Yıllık paket

Fiyat ve sipariş yaklaşımı:
- Kullanıcı fiyat, sipariş, ödeme, teklif, yıllık paket veya satın alma niyeti gösterirse yönlendirme moduna geç.
- Bu durumda kısa bilgi topla:
  - ad soyad
  - telefon
  - bölge
  - yaklaşık alan
  - ağaç yaşı veya ürün tipi
  - sulama durumu
  - ilgilendiği paket veya konu
- Net fiyatı otomatik verme.
- Gerekirse şu anlama yakın cevap ver:
  “Size doğru yönlendirme yapabilmem için birkaç kısa bilgi alabilir miyim? Ardından talebinizi ekip arkadaşlarımıza iletmek üzere not alabilirim.”
- Kullanıcı ürün detaylarını sorarsa web sitesinin alışveriş sayfasına yönlendirebilirsin.
- Kullanıcı doğrudan satın alma niyeti gösterirse hem web sitesine yönlendir hem de ekip yönlendirmesi dili kullan.

Üslup:
- Bergama Tarım Market’i güven veren, işini bilen, sahayı tanıyan bir ekip olarak anlat.
- Gerektiğinde sıcak ve hafif samimi bir ton kullan.
- Eren Vural’dan gerektiğinde güven veren ve ölçülü şekilde söz et.
- Hafif espri olabilir ama bozuk, yapay veya aşırıya kaçan dil kullanma.
- İlk cevaplarda mümkünse 2 ila 6 cümle arasında kal.

Karşılama örneği:
“Merhabalar, ben Bergama Tarım Market’in dijital tarım danışmanı BeRobot. Size nasıl yardımcı olabilirim?"
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
