export interface Env {
  AI: Ai;
  TELEGRAM_BOT_TOKEN: string;
}

const TELEGRAM_API = (token: string) => `https://api.telegram.org/bot${token}`;
const TELEGRAM_FILE_API = (token: string) => `https://api.telegram.org/file/bot${token}`;

const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const SYSTEM_PROMPT = `Ты — аккуратный и честный консультант по символической интерпретации раскладов Таро.

Твоя задача — анализировать фотографию реального расклада и вопрос пользователя.

КРИТИЧЕСКИЕ ПРАВИЛА ТОЧНОСТИ:
1. Никогда не придумывай карту, которой ты не видишь.
2. Если карта видна недостаточно хорошо, укажи confidence=low и card_name=null.
3. Не заменяй неразборчивую карту похожей картой.
4. Не утверждай, что знаешь будущее наверняка. Таро трактуется как символическая интерпретация.
5. Не выдавай конкретные гарантии вроде «это точно произойдёт» или «человек точно вернётся».
6. Учитывай вопрос пользователя и трактуй карты ВМЕСТЕ, а не как независимый список значений.
7. Сначала распознай карты и их положение, затем сделай общий анализ.
8. Если на фото 5–6 карт, сохрани их фактический порядок слева направо или сверху вниз, если отдельная схема явно не определена.
9. Если схема расклада неизвестна, честно скажи об этом и трактуй позиции по порядку как последовательность расклада.
10. Не приписывай картам скрытый текст, которого нет на изображении.
11. Если фото слишком плохое для надёжного анализа, попроси пользователя прислать более чёткое фото.

Для каждой карты укажи:
- номер позиции;
- название карты на русском;
- прямое или перевёрнутое положение, если это можно определить;
- confidence: high/medium/low.

Ответ должен быть на русском языке, спокойным, понятным и без мистического обмана.`;

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
    if (request.method === "GET") {
      return new Response("Tarot bot is running", { status: 200 });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

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

  if (message.text === "/start") {
    await sendMessage(token, chatId,
      "🔮 Добро пожаловать.\n\nОтправьте одним сообщением фотографию вашего расклада Таро и напишите вопрос в подписи к фотографии.\n\nНапример:\n«Что меня ждёт в отношениях с этим человеком в ближайшие 3 месяца?»\n\nЯ определю карты, их положение и дам общий разбор расклада. Если карту нельзя уверенно распознать, я прямо об этом скажу и не буду её придумывать.");
    return;
  }

  if (!message.photo?.length) {
    await sendMessage(token, chatId,
      "Пришлите фотографию расклада Таро и напишите ваш вопрос в подписи к фотографии.\n\nНапример: «Что будет происходить в моих отношениях в ближайшие 3 месяца?»");
    return;
  }

  const question = (message.caption || "").trim();
  if (!question) {
    await sendMessage(token, chatId, "Фото получил. Теперь нужен ваш вопрос — напишите его в подписи к фотографии и отправьте фото ещё раз.");
    return;
  }

  await sendMessage(token, chatId, "Фото получил. Анализирую карты и ваш вопрос. Если какая-то карта не читается уверенно, я отмечу это, а не буду угадывать.");

  const largestPhoto = message.photo[message.photo.length - 1];
  const imageDataUrl = await downloadTelegramImageAsDataUrl(token, largestPhoto.file_id);

  const result = await analyzeTarot(env, imageDataUrl, question);
  const response = formatTarotResult(result, question);
  await sendMessage(token, chatId, response);
}

async function downloadTelegramImageAsDataUrl(token: string, fileId: string): Promise<string> {
  const fileResponse = await fetch(`${TELEGRAM_API(token)}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const fileJson = await fileResponse.json<any>();
  if (!fileJson.ok || !fileJson.result?.file_path) {
    throw new Error("Telegram getFile failed");
  }

  const imageResponse = await fetch(`${TELEGRAM_FILE_API(token)}/${fileJson.result.file_path}`);
  if (!imageResponse.ok) throw new Error("Telegram image download failed");

  const contentLength = Number(imageResponse.headers.get("content-length") || 0);
  if (contentLength > MAX_IMAGE_BYTES) throw new Error("Image is too large");

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
  const prompt = `Пользователь задал вопрос:\n${question}\n\nПроанализируй приложенную фотографию расклада Таро. Сначала визуально определи реально видимые карты и их порядок. Затем интерпретируй весь расклад в контексте вопроса.\n\nЕсли карта неразборчива, не угадывай её.\nЕсли положение карты нельзя определить, используй unknown.\nЕсли схема расклада неочевидна, не выдумывай её название.\n\nВерни строго JSON по указанной схеме.`;

  const response = await env.AI.run(VISION_MODEL, {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ],
    image,
    response_format: {
      type: "json_schema",
      json_schema: JSON_SCHEMA
    },
    max_tokens: 2200,
    temperature: 0.15,
    seed: 42
  } as any);

  const raw = typeof response === "string" ? response : (response as any).response;
  if (!raw) throw new Error("AI returned empty response");

  const parsed = parseJsonObject(raw);
  return normalizeTarotResult(parsed);
}

function parseJsonObject(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
    throw new Error("AI returned invalid JSON");
  }
}

function normalizeTarotResult(value: any): TarotResult {
  const cards: TarotCard[] = Array.isArray(value.cards)
    ? value.cards.map((card: any, index: number) => ({
        position: Number.isFinite(Number(card?.position)) ? Number(card.position) : index + 1,
        card_name: typeof card?.card_name === "string" && card.card_name.trim() ? card.card_name.trim() : null,
        orientation: ["upright", "reversed", "unknown"].includes(card?.orientation) ? card.orientation : "unknown",
        confidence: ["high", "medium", "low"].includes(card?.confidence) ? card.confidence : "low"
      }))
    : [];

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

  if (!result.readable || lowConfidence.length > 0 && result.cards.length === 0) {
    return "Не хочу угадывать карты по некачественному изображению.\n\nПожалуйста, пришлите более чёткое фото: все карты должны полностью помещаться в кадр, без сильных бликов и теней.";
  }

  const cardLines = result.cards.length
    ? result.cards.map((card) => {
        const name = card.card_name || "Карта не определена";
        const orientation = card.orientation === "reversed" ? " — перевёрнутая" : card.orientation === "upright" ? " — прямая" : " — положение не удалось определить";
        const confidence = card.confidence === "high" ? "высокая уверенность" : card.confidence === "medium" ? "средняя уверенность" : "низкая уверенность";
        return `${card.position}. ${name}${orientation} (${confidence})`;
      }).join("\n")
    : "Карты не удалось уверенно определить.";

  const warning = lowConfidence.length
    ? `\n\nВажно: ${lowConfidence.length} ${plural(lowConfidence.length, "карту", "карты", "карт")} я определил с низкой уверенностью. Я не буду выдавать их распознавание за факт.`
    : "";

  return `🔮 РАЗБОР РАСКЛАДА\n\nВопрос: ${question}\n\nКарты:\n${cardLines}\n\nСхема: ${result.spread_type}\n\nОБЩИЙ АНАЛИЗ\n${result.analysis}\n\nИТОГ\n${result.conclusion}\n\nСОВЕТ\n${result.advice}${warning}\n\nЭто символическая интерпретация Таро, а не гарантированное предсказание будущего.`;
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

async function sendMessage(token: string, chatId: number, text: string): Promise<void> {
  const response = await fetch(`${TELEGRAM_API(token)}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    })
  });

  if (!response.ok) {
    console.error("Telegram sendMessage failed", await response.text());
  }
}
