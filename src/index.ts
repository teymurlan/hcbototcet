export interface Env {
  AI: Ai;
  TELEGRAM_BOT_TOKEN: string;
}

const TELEGRAM_API = (token: string) => `https://api.telegram.org/bot${token}`;
const TELEGRAM_FILE_API = (token: string) => `https://api.telegram.org/file/bot${token}`;
const VISION_MODEL = "@cf/google/gemma-4-26b-a4b-it";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const SYSTEM_PROMPT = `Ты — таролог-ассистент, который анализирует расклады Таро по фотографии.

ПРАВИЛА РАБОТЫ С ИЗОБРАЖЕНИЕМ (строго обязательны):
1. Сначала ВНИМАТЕЛЬНО изучи фото и перечисли КАЖДУЮ карту, которую видишь, по её реальному положению на столе (ряд/позиция), НАЗВАНИЮ и НОМЕРУ, написанным на самой карте.
2. Определи ориентацию каждой карты — прямая или перевёрнутая — по направлению текста/номера на карте.
3. Если текст на карте на русском — используй это название напрямую, не переводи и не подменяй его английским аналогом из памяти.
4. НЕ ДОПОЛНЯЙ и НЕ ПРИДУМЫВАЙ карты, которых нет на фото. Сколько карт видно на фото — ровно столько и анализировать.
5. Перед разбором выведи промежуточный список: "Карты на фото: 1) ..., 2) ..., 3) ..." — и только потом переходи к интерпретации.
6. Если карта не видна/нечитаема — прямо укажи это, не выдумывай замену.
7. Схему расклада определяй по количеству и расположению карт; если не уверен — спроси у пользователя, какая схема использовалась, а не пиши "unknown".`;

interface TelegramPhoto { file_id: string; width: number; height: number; file_size?: number; }
interface TelegramMessage { message_id: number; chat: { id: number }; photo?: TelegramPhoto[]; caption?: string; text?: string; }
interface TelegramUpdate { update_id: number; message?: TelegramMessage; }

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "GET") return new Response("Tarot bot is running");
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    let update: TelegramUpdate | undefined;
    try { update = await request.json<TelegramUpdate>(); } catch { return new Response("OK"); }

    ctx.waitUntil(handleUpdate(update, env));
    return new Response("OK");
  },
} satisfies ExportedHandler<Env>;

async function handleUpdate(update: TelegramUpdate, env: Env) {
  const m = update.message;
  if (!m) return;
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = m.chat.id;

  try {
    if (m.text === "/start") {
      await sendMessage(token, chatId, "🔮 Добро пожаловать.\n\nОтправьте фото расклада Таро и вопрос в подписи к фотографии.");
      return;
    }
    if (!m.photo?.length) {
      await sendMessage(token, chatId, "Пришлите фотографию расклада Таро и напишите вопрос в подписи.");
      return;
    }

    const question = (m.caption || "").trim();
    if (!question) {
      await sendMessage(token, chatId, "Напишите вопрос в подписи к фотографии и отправьте фото ещё раз.");
      return;
    }

    const waiting = await sendMessage(token, chatId, "⏳ Анализирую расклад, внимательно проверяю все карты на фото...");
    const waitingMessageId = waiting?.message_id;
    await sendChatAction(token, chatId, "typing");

    const photo = m.photo.reduce((best, current) =>
      current.width * current.height > best.width * best.height ? current : best, m.photo[0]);

    const file = await downloadTelegramImage(token, photo.file_id);
    const result = await analyzeTarot(env, file.buffer, file.mime, question);
    const answer = formatTarotResult(result, question);

    if (waitingMessageId) {
      const edited = await editMessageText(token, chatId, waitingMessageId, answer);
      if (!edited) await sendMessage(token, chatId, answer);
    } else {
      await sendMessage(token, chatId, answer);
    }
  } catch (error) {
    console.error("[TAROT BOT]", error);
    await sendMessage(token, chatId, "Не удалось обработать расклад. Попробуйте отправить фото ещё раз.");
  }
}

async function downloadTelegramImage(token: string, fileId: string): Promise<{ buffer: ArrayBuffer; mime: string }> {
  const fileResponse = await fetch(`${TELEGRAM_API(token)}/getFile?file_id=${encodeURIComponent(fileId)}`);
  if (!fileResponse.ok) throw new Error(`Telegram getFile HTTP ${fileResponse.status}`);
  const fileJson = await fileResponse.json<any>();
  if (!fileJson.ok || !fileJson.result?.file_path) throw new Error("Telegram getFile failed");

  const imageResponse = await fetch(`${TELEGRAM_FILE_API(token)}/${fileJson.result.file_path}`);
  if (!imageResponse.ok) throw new Error(`Telegram image HTTP ${imageResponse.status}`);
  const buffer = await imageResponse.arrayBuffer();
  if (!buffer.byteLength || buffer.byteLength > MAX_IMAGE_BYTES) throw new Error("Image too large or empty");

  const contentType = imageResponse.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  return { buffer, mime: contentType?.startsWith("image/") ? contentType : "image/jpeg" };
}

function toDataUrl(buffer: ArrayBuffer, mime: string): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

async function runVision(env: Env, image: string, prompt: string): Promise<any> {
  // Для Workers AI используем штатный multimodal-формат: image передаётся
  // отдельным полем, как в официальном примере Cloudflare для vision-моделей.
  return await env.AI.run(VISION_MODEL, {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    image,
    temperature: 0,
    max_tokens: 1400,
    chat_template_kwargs: { enable_thinking: false, clear_thinking: true },
  } as any);
}

async function analyzeTarot(env: Env, buffer: ArrayBuffer, mime: string, question: string) {
  const image = toDataUrl(buffer, mime);
  const prompt = `Вопрос пользователя: «${question}»

Сейчас выполни полный анализ фотографии строго по правилам выше.

ОЧЕНЬ ВАЖНО:
— Сначала посмотри на ВСЮ фотографию целиком и посчитай физически видимые карты.
— Затем проверь КАЖДУЮ карту отдельно.
— Нельзя заранее предполагать, что карт 2, 3, 6 или 9. Количество определяется ТОЛЬКО фотографией.
— Если на фото 9 карт, перечисли все 9. Если 12 — все 12. Если 3 — все 3.
— Каждая физически видимая карта обязана иметь свой номер в списке.
— Не добавляй карту только потому, что она логично подходит к раскладу.
— Если название не читается уверенно, напиши «Не определена», но физическую карту всё равно сохрани в списке.
— Не заменяй нечитаемую карту другой картой.
— Не проси фото крупнее, если карта физически различима на исходном фото.
— Если на фото нет расклада Таро, ответь только: НЕ_ТАРО.

ОБЯЗАТЕЛЬНАЯ ПРОВЕРКА ПЕРЕД ОТВЕТОМ:
1. Посчитай физические карты на фотографии.
2. Посчитай пункты в разделе «КАРТЫ НА ФОТО».
3. Эти два числа ОБЯЗАНЫ совпадать.
4. Проверь, что ни одна карта не появилась в списке без физического изображения на фото.
5. Проверь, что ни одна физическая карта не пропущена.
6. Проверь названия по видимому тексту/номеру самой карты.
7. Весь ответ только на русском языке.

ФОРМАТ ОТВЕТА СТРОГО:

КАРТЫ НА ФОТО:
1. [точное название или «Не определена»] — [прямая/перевёрнутая/положение неизвестно] — [очень коротко: значение именно для вопроса]
2. ...
И так далее до ПОСЛЕДНЕЙ физически видимой карты.

ОБЩИЙ АНАЛИЗ:
Свяжи ВСЕ перечисленные карты между собой и ответь на вопрос пользователя. Не игнорируй ни одну карту.

ИТОГ:
Короткий и максимально понятный ответ именно на вопрос пользователя.

СОВЕТ:
Короткий практический совет по символическому смыслу расклада.

Запрещено: английский язык, английские названия карт, JSON, код, Markdown-блоки кода, внутренние рассуждения, самокоррекции, повторные пересчёты, выдуманные карты, выдуманные номера, фразы «unknown», «confidence», «card», «spread».`;

  const response = await runVision(env, image, prompt);
  const raw = extractModelText(response);
  if (!raw) {
    console.error("[TAROT BOT] Empty model content", JSON.stringify(response));
    throw new Error("Workers AI returned empty final content");
  }
  return normalizeTarotAnswer(raw);
}

function extractModelText(response: any): string {
  if (typeof response === "string") return response.trim();
  if (typeof response?.response === "string" && response.response.trim()) return response.response.trim();
  const message = response?.choices?.[0]?.message;
  if (typeof message?.content === "string" && message.content.trim()) return message.content.trim();
  if (Array.isArray(message?.content)) {
    return message.content.map((part: any) => typeof part === "string" ? part : part?.text || "").join("").trim();
  }
  return "";
}

function normalizeTarotAnswer(raw: string) {
  const clean = raw.replace(/```(?:text|markdown|json)?/gi, "").replace(/```/g, "").trim();
  if (/^НЕ_ТАРО\s*$/i.test(clean)) return { notTarot: true, text: "" };
  return { notTarot: false, text: clean };
}

function formatTarotResult(result: { notTarot: boolean; text: string }, question: string) {
  if (result.notTarot) return "🔮 На фото не удалось обнаружить расклад Таро. Я анализирую только фотографии с картами Таро.";
  let text = result.text.trim();
  if (!/КАРТЫ\s+НА\s+ФОТО\s*:/i.test(text)) throw new Error("Model response has no card list");
  text = text.replace(/^КАРТЫ\s+НА\s+ФОТО\s*:/i, "КАРТЫ НА ФОТО:");
  text = text.replace(/^ОБЩИЙ\s+АНАЛИЗ\s*:/im, "ОБЩИЙ АНАЛИЗ:");
  text = text.replace(/^ИТОГ\s*:/im, "ИТОГ:");
  text = text.replace(/^СОВЕТ\s*:/im, "СОВЕТ:");
  return `🔮 РАЗБОР РАСКЛАДА\n\nВопрос: ${question}\n\n${text}`;
}

async function sendChatAction(token: string, chatId: number, action: "typing") {
  try {
    await fetch(`${TELEGRAM_API(token)}/sendChatAction`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action }),
    });
  } catch (error) {
    console.error("[TAROT BOT] typing action failed", error);
  }
}

async function sendMessage(token: string, chatId: number, text: string): Promise<{ message_id?: number } | null> {
  const response = await fetch(`${TELEGRAM_API(token)}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  if (!response.ok) {
    console.error("[TAROT BOT] Telegram sendMessage failed", await response.text());
    return null;
  }
  const json = await response.json<any>();
  return json?.ok ? json.result : null;
}

async function editMessageText(token: string, chatId: number, messageId: number, text: string): Promise<boolean> {
  const response = await fetch(`${TELEGRAM_API(token)}/editMessageText`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, disable_web_page_preview: true }),
  });
  if (!response.ok) {
    console.error("[TAROT BOT] Telegram editMessageText failed", await response.text());
    return false;
  }
  const json = await response.json<any>();
  return Boolean(json?.ok);
}
