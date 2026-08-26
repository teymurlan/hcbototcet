export interface Env {
  AI: Ai;
  TELEGRAM_BOT_TOKEN: string;
}

const TELEGRAM_API = (token: string) => `https://api.telegram.org/bot${token}`;
const TELEGRAM_FILE_API = (token: string) => `https://api.telegram.org/file/bot${token}`;
const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const SYSTEM_PROMPT = `Ты — аккуратный консультант по символической интерпретации Таро.
Никогда не придумывай карты. Если карта неразборчива, укажи card_name=null и confidence=low.
Не утверждай, что знаешь будущее наверняка и не давай гарантированных предсказаний.
Сначала распознай только реально видимые карты, их порядок и положение. Затем интерпретируй весь расклад в контексте вопроса.
Если схема расклада неизвестна, честно укажи это.
Ответ на русском языке.`;

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
    if (request.method === "GET") return new Response("Tarot bot is running", { status: 200 });
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    let update: TelegramUpdate;
    try {
      update = await request.json<TelegramUpdate>();
      await handleUpdate(update, env);
    } catch (error) {
      console.error("[TAROT BOT] Update processing error:", error);
      console.error("[TAROT BOT] Error stack:", error instanceof Error ? error.stack : String(error));
      const chatId = update?.message?.chat.id;
      if (chatId) {
        const message = error instanceof Error && /size|large|8.?mb|bytes/i.test(error.message)
          ? "Фото слишком большое. Пришлите фото меньшего размера или сожмите изображение и попробуйте ещё раз."
          : "Не удалось обработать расклад. Попробуйте ещё раз с более чётким фото. Если ошибка повторится, я уже вижу её в логах Cloudflare и смогу исправить.";
        await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, message);
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
    await sendMessage(token, chatId, "🔮 Добро пожаловать.\n\nОтправьте одним сообщением фотографию расклада Таро и напишите вопрос в подписи к фотографии.\n\nНапример:\n«Что меня ждёт в отношениях с этим человеком в ближайшие 3 месяца?»\n\nЯ сначала определю видимые карты, их положение и порядок, а затем дам общий разбор именно по вашему вопросу. Если карта не читается уверенно, я не буду её придумывать.");
    return;
  }

  if (!message.photo?.length) {
    await sendMessage(token, chatId, "Пришлите фотографию расклада Таро и напишите вопрос в подписи к фотографии.");
    return;
  }

  const question = (message.caption || "").trim();
  if (!question) {
    await sendMessage(token, chatId, "Фото получил. Добавьте ваш вопрос в подпись к фотографии и отправьте фото ещё раз.");
    return;
  }

  await sendMessage(token, chatId, "Фото получил. Анализирую карты и ваш вопрос. Если какая-то карта не читается уверенно, я отмечу это, а не буду угадывать.");

  const largestPhoto = message.photo[message.photo.length - 1];
  const imageBuffer = await downloadTelegramImage(token, largestPhoto.file_id);
  const result = await analyzeTarot(env, imageBuffer, question);
  await sendMessage(token, chatId, formatTarotResult(result, question));
}

async function downloadTelegramImage(token: string, fileId: string): Promise<ArrayBuffer> {
  const fileResponse = await fetch(`${TELEGRAM_API(token)}/getFile?file_id=${encodeURIComponent(fileId)}`);
  if (!fileResponse.ok) throw new Error(`Telegram getFile HTTP ${fileResponse.status}`);
  const fileJson = await fileResponse.json<any>();
  if (!fileJson.ok || !fileJson.result?.file_path) throw new Error(`Telegram getFile failed: ${JSON.stringify(fileJson)}`);

  const imageResponse = await fetch(`${TELEGRAM_FILE_API(token)}/${fileJson.result.file_path}`);
  if (!imageResponse.ok) throw new Error(`Telegram image download HTTP ${imageResponse.status}`);

  const contentLength = Number(imageResponse.headers.get("content-length") || 0);
  if (contentLength > MAX_IMAGE_BYTES) throw new Error(`Image too large: ${contentLength} bytes`);

  const imageBuffer = await imageResponse.arrayBuffer();
  if (imageBuffer.byteLength > MAX_IMAGE_BYTES) throw new Error(`Image too large: ${imageBuffer.byteLength} bytes`);
  if (imageBuffer.byteLength === 0) throw new Error("Downloaded image is empty");
  return imageBuffer;
}

async function analyzeTarot(env: Env, imageBuffer: ArrayBuffer, question: string): Promise<TarotResult> {
  const image = [...new Uint8Array(imageBuffer)];
  const prompt = `Пользовательский вопрос:\n${question}\n\nПроанализируй приложенную фотографию расклада Таро. Сначала определи только реально видимые карты и их порядок. Для каждой карты укажи название, положение и confidence. Если карта неразборчива — card_name=null. После распознавания дай общий анализ всех карт именно в контексте вопроса. Не выдумывай схему расклада, если она неочевидна. Верни JSON.`;

  console.log("[TAROT BOT] Sending image to Workers AI", {
    bytes: imageBuffer.byteLength,
    questionLength: question.length,
    model: VISION_MODEL
  });

  const response = await env.AI.run(VISION_MODEL, {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ],
    image
  } as any);

  console.log("[TAROT BOT] Workers AI response received");

  const raw = typeof response === "string" ? response : (response as any)?.response;
  if (!raw) throw new Error(`Workers AI returned empty response: ${JSON.stringify(response)}`);

  return normalizeTarotResult(parseJsonObject(raw));
}

function parseJsonObject(raw: string): any {
  try { return JSON.parse(raw); } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
    throw new Error(`Workers AI returned non-JSON response: ${raw.slice(0, 500)}`);
  }
}

function normalizeTarotResult(value: any): TarotResult {
  const cards: TarotCard[] = Array.isArray(value?.cards) ? value.cards.map((card: any, index: number) => ({
    position: Number.isFinite(Number(card?.position)) ? Number(card.position) : index + 1,
    card_name: typeof card?.card_name === "string" && card.card_name.trim() ? card.card_name.trim() : null,
    orientation: ["upright", "reversed", "unknown"].includes(card?.orientation) ? card.orientation : "unknown",
    confidence: ["high", "medium", "low"].includes(card?.confidence) ? card.confidence : "low"
  })) : [];

  return {
    readable: Boolean(value?.readable ?? cards.some(c => c.card_name)),
    deck: typeof value?.deck === "string" ? value.deck : "Не определена",
    cards,
    spread_type: typeof value?.spread_type === "string" ? value.spread_type : "Схема не определена",
    analysis: typeof value?.analysis === "string" ? value.analysis : "Не удалось сформировать анализ.",
    conclusion: typeof value?.conclusion === "string" ? value.conclusion : "Не удалось сформировать итог.",
    advice: typeof value?.advice === "string" ? value.advice : "Не удалось сформировать совет."
  };
}

function formatTarotResult(result: TarotResult, question: string): string {
  if (!result.cards.length || !result.cards.some(c => c.card_name)) {
    return "Я не смог уверенно распознать карты на фотографии. Не хочу угадывать.\n\nПришлите фото крупнее, чтобы все карты были хорошо видны, без бликов и сильных теней.";
  }

  const cardLines = result.cards.map(card => {
    const name = card.card_name || "Карта не определена";
    const orientation = card.orientation === "reversed" ? " — перевёрнутая" : card.orientation === "upright" ? " — прямая" : " — положение не определено";
    const confidence = card.confidence === "high" ? "высокая уверенность" : card.confidence === "medium" ? "средняя уверенность" : "низкая уверенность";
    return `${card.position}. ${name}${orientation} (${confidence})`;
  }).join("\n");

  return `🔮 РАЗБОР РАСКЛАДА\n\nВопрос: ${question}\n\nКарты:\n${cardLines}\n\nСхема: ${result.spread_type}\n\nОБЩИЙ АНАЛИЗ\n${result.analysis}\n\nИТОГ\n${result.conclusion}\n\nСОВЕТ\n${result.advice}\n\nЭто символическая интерпретация Таро, а не гарантированное предсказание будущего.`;
}

async function sendMessage(token: string, chatId: number, text: string): Promise<void> {
  const response = await fetch(`${TELEGRAM_API(token)}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true })
  });
  if (!response.ok) console.error("[TAROT BOT] Telegram sendMessage failed", await response.text());
}
