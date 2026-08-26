export interface Env {
  AI: Ai;
  TELEGRAM_BOT_TOKEN: string;
}

const TELEGRAM_API = (token: string) => `https://api.telegram.org/bot${token}`;
const TELEGRAM_FILE_API = (token: string) => `https://api.telegram.org/file/bot${token}`;
const WORKER_URL = "https://hcbototcet.teymurlannn.workers.dev";
const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const SYSTEM_PROMPT = `Ты — аккуратный и честный консультант по символической интерпретации раскладов Таро.

КРИТИЧЕСКИЕ ПРАВИЛА:
1. Никогда не придумывай карту, которой ты не видишь.
2. Если карта неразборчива — card_name=null и confidence=low.
3. Не заменяй неразборчивую карту похожей картой.
4. Не утверждай, что знаешь будущее наверняка.
5. Не давай гарантии вроде «это точно произойдёт» или «человек точно вернётся».
6. Учитывай вопрос пользователя и трактуй карты ВМЕСТЕ.
7. Сначала распознай карты, затем сделай интерпретацию.
8. Если схема неизвестна, не выдумывай её название.
9. Сохраняй фактический порядок карт слева направо или сверху вниз.
10. Если фото слишком плохое, честно сообщи об этом.
11. Ответ на русском, спокойно, понятно и без мистического обмана.

Для каждой карты укажи позицию, название на русском, положение upright/reversed/unknown и confidence high/medium/low.`;

const JSON_SCHEMA = {
  type: "object",
  properties: {
    readable: { type: "boolean" },
    deck: { type: "string" },
    cards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          position: { type: "integer" },
          card_name: { type: ["string", "null"] },
          orientation: { type: "string", enum: ["upright", "reversed", "unknown"] },
          confidence: { type: "string", enum: ["high", "medium", "low"] }
        },
        required: ["position", "card_name", "orientation", "confidence"]
      }
    },
    spread_type: { type: "string" },
    analysis: { type: "string" },
    conclusion: { type: "string" },
    advice: { type: "string" }
  },
  required: ["readable", "deck", "cards", "spread_type", "analysis", "conclusion", "advice"]
};

interface TarotCard {
  position: number;
  card_name: string | null;
  orientation: "upright" | "reversed" | "unknown";
  confidence: "high" | "medium" | "low";
}

interface TarotResult {
  readable: boolean;
  deck: string;
  cards: TarotCard[];
  spread_type: string;
  analysis: string;
  conclusion: string;
  advice: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number };
    photo?: Array<{ file_id: string; width: number; height: number; file_size?: number }>;
    caption?: string;
    text?: string;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET") {
      if (url.pathname === "/setup-webhook") {
        if (!env.TELEGRAM_BOT_TOKEN) return new Response("TELEGRAM_BOT_TOKEN is missing", { status: 500 });
        const telegramResponse = await fetch(`${TELEGRAM_API(env.TELEGRAM_BOT_TOKEN)}/setWebhook`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: WORKER_URL })
        });
        const body = await telegramResponse.text();
        return new Response(body, { status: telegramResponse.ok ? 200 : 502, headers: { "content-type": "application/json" } });
      }
      return new Response("Tarot bot is running", { status: 200 });
    }

    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    let update: TelegramUpdate;
    try {
      update = await request.json<TelegramUpdate>();
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    try {
      await handleUpdate(update, env);
    } catch (error) {
      console.error("Update error", error);
      const chatId = update.message?.chat.id;
      if (chatId) {
        await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, "Не удалось обработать запрос. Попробуйте ещё раз с более чётким фото расклада.");
      }
    }

    return new Response("OK");
  }
} satisfies ExportedHandler<Env>;

async function handleUpdate(update: TelegramUpdate, env: Env): Promise<void> {
  const message = update.message;
  if (!message) return;

  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = message.chat.id;

  if (message.text?.trim() === "/start") {
    await sendMessage(token, chatId,
      "🔮 Добро пожаловать в Tarot Photo Bot.\n\nОтправьте фотографию готового расклада Таро, а вопрос напишите в подписи к фотографии.\n\nНапример: «Что меня ждёт в отношениях с этим человеком в ближайшие 3 месяца?»\n\nЯ сначала определю видимые карты и их положение, а затем разберу весь расклад именно в контексте вашего вопроса. Если карту нельзя уверенно распознать, я не буду её придумывать.");
    return;
  }

  if (!message.photo?.length) {
    await sendMessage(token, chatId, "Пришлите фото расклада Таро и напишите вопрос в подписи к фотографии.");
    return;
  }

  const question = (message.caption || "").trim();
  if (!question) {
    await sendMessage(token, chatId, "Фото получил. Добавьте ваш вопрос в подпись к фотографии и отправьте её ещё раз.");
    return;
  }

  await sendMessage(token, chatId, "Фото получил. Анализирую расклад и ваш вопрос. Я не буду угадывать карты, если они плохо видны.");

  const largestPhoto = message.photo[message.photo.length - 1];
  const imageDataUrl = await downloadTelegramImageAsDataUrl(token, largestPhoto.file_id);
  const result = await analyzeTarot(env, imageDataUrl, question);
  await sendMessage(token, chatId, formatTarotResult(result, question));
}

async function downloadTelegramImageAsDataUrl(token: string, fileId: string): Promise<string> {
  const fileResponse = await fetch(`${TELEGRAM_API(token)}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const fileJson = await fileResponse.json<any>();
  if (!fileJson.ok || !fileJson.result?.file_path) throw new Error("Telegram getFile failed");

  const imageResponse = await fetch(`${TELEGRAM_FILE_API(token)}/${fileJson.result.file_path}`);
  if (!imageResponse.ok) throw new Error("Telegram image download failed");

  const bytes = new Uint8Array(await imageResponse.arrayBuffer());
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("Image is too large");

  const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
  return `data:${contentType};base64,${uint8ToBase64(bytes)}`;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(binary);
}

async function analyzeTarot(env: Env, image: string, question: string): Promise<TarotResult> {
  const prompt = `Пользователь задал вопрос:\n${question}\n\nПроанализируй приложенную фотографию расклада Таро. Определи только реально видимые карты и их фактический порядок. После этого интерпретируй весь расклад в контексте вопроса. Если карта неразборчива — не угадывай её. Если положение нельзя определить — используй unknown. Если схема расклада неочевидна — не придумывай название схемы. Верни строго JSON по указанной схеме.`;

  const response = await env.AI.run(VISION_MODEL, {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ],
    image,
    response_format: { type: "json_schema", json_schema: JSON_SCHEMA },
    max_tokens: 2200,
    temperature: 0.1,
    seed: 42
  } as any);

  const raw = typeof response === "string" ? response : (response as any).response;
  if (!raw) throw new Error("AI returned empty response");
  return normalizeTarotResult(parseJsonObject(raw));
}

function parseJsonObject(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
    throw new Error("AI returned invalid JSON");
  }
}

function normalizeTarotResult(value: any): TarotResult {
  const cards: TarotCard[] = Array.isArray(value.cards) ? value.cards.map((card: any, index: number) => ({
    position: Number.isFinite(Number(card?.position)) ? Number(card.position) : index + 1,
    card_name: typeof card?.card_name === "string" && card.card_name.trim() ? card.card_name.trim() : null,
    orientation: ["upright", "reversed", "unknown"].includes(card?.orientation) ? card.orientation : "unknown",
    confidence: ["high", "medium", "low"].includes(card?.confidence) ? card.confidence : "low"
  })) : [];

  return {
    readable: Boolean(value.readable),
    deck: typeof value.deck === "string" ? value.deck : "Не определена",
    cards,
    spread_type: typeof value.spread_type === "string" ? value.spread_type : "Схема не определена",
    analysis: typeof value.analysis === "string" ? value.analysis : "Не удалось сформировать анализ.",
    conclusion: typeof value.conclusion === "string" ? value.conclusion : "Не удалось сформировать итог.",
    advice: typeof value.advice === "string" ? value.advice : "Не удалось сформировать совет."
  };
}

function formatTarotResult(result: TarotResult, question: string): string {
  const lowConfidence = result.cards.filter((c) => c.confidence === "low" || !c.card_name);

  if (!result.readable || result.cards.length === 0) {
    return "Не хочу угадывать карты по этому изображению. Пожалуйста, пришлите более чёткое фото: все карты должны полностью помещаться в кадр, без сильных бликов и теней.";
  }

  const cardLines = result.cards.map((card) => {
    const name = card.card_name || "Карта не определена";
    const orientation = card.orientation === "reversed" ? " — перевёрнутая" : card.orientation === "upright" ? " — прямая" : " — положение не определено";
    const confidence = card.confidence === "high" ? "высокая уверенность" : card.confidence === "medium" ? "средняя уверенность" : "низкая уверенность";
    return `${card.position}. ${name}${orientation} (${confidence})`;
  }).join("\n");

  const warning = lowConfidence.length ? `\n\nВажно: ${lowConfidence.length} карт${lowConfidence.length === 1 ? "а" : " определены с низкой уверенностью. Я не выдаю такое распознавание за факт."}` : "";

  return `🔮 РАЗБОР РАСКЛАДА\n\nВопрос: ${question}\n\nКарты:\n${cardLines}\n\nСхема: ${result.spread_type}\n\nОБЩИЙ АНАЛИЗ\n${result.analysis}\n\nИТОГ\n${result.conclusion}\n\nСОВЕТ\n${result.advice}${warning}\n\nЭто символическая интерпретация Таро, а не гарантированное предсказание будущего.`;
}

async function sendMessage(token: string, chatId: number, text: string): Promise<void> {
  const response = await fetch(`${TELEGRAM_API(token)}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true })
  });
  if (!response.ok) console.error("Telegram sendMessage failed", await response.text());
}
