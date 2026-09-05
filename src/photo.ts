import { APP } from './app';

export interface Env {
  TELEGRAM_BOT_TOKEN: string;
  ADMIN_IDS?: string;
  WEBAPP_URL?: string;
  SETUP_SECRET?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  ALLOWED_USER_IDS?: string;
}

type TgUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

const API = (token: string) => `https://api.telegram.org/bot${token}`;
const MAX_FILE = 9 * 1024 * 1024;
const MAX_FILES = 20;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const appUrl = normalizeAppUrl(env.WEBAPP_URL || url.origin);

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/app')) {
      return new Response(APP, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store, no-cache, must-revalidate',
          'x-content-type-options': 'nosniff',
          'referrer-policy': 'no-referrer',
        },
      });
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      return J({
        ok: true,
        bot: 'hcbototcet',
        service: 'house-cleaning-photo-reports',
        webapp: appUrl,
        configured: {
          telegram: Boolean(env.TELEGRAM_BOT_TOKEN),
          admins: parseList(env.ADMIN_IDS).length > 0,
          setup: Boolean(env.SETUP_SECRET),
          webhook_secret: Boolean(env.TELEGRAM_WEBHOOK_SECRET),
        },
        now: new Date().toISOString(),
      });
    }

    if (req.method === 'GET' && url.pathname === '/setup') {
      if (!env.SETUP_SECRET || !safeEq(url.searchParams.get('key') || '', env.SETUP_SECRET)) {
        return J({ ok: false, error: 'Unauthorized' }, 401);
      }
      if (!env.TELEGRAM_BOT_TOKEN) return J({ ok: false, error: 'TELEGRAM_BOT_TOKEN is not configured' }, 500);

      const webhook = appUrl.replace(/\/$/, '') + '/webhook';
      const webhookBody: Record<string, unknown> = {
        url: webhook,
        drop_pending_updates: false,
        allowed_updates: ['message'],
      };
      if (env.TELEGRAM_WEBHOOK_SECRET) webhookBody.secret_token = env.TELEGRAM_WEBHOOK_SECRET;

      const [wh, menu, commands] = await Promise.all([
        tg(env.TELEGRAM_BOT_TOKEN, 'setWebhook', webhookBody),
        tg(env.TELEGRAM_BOT_TOKEN, 'setChatMenuButton', {
          menu_button: { type: 'web_app', text: 'Фотоотчёты', web_app: { url: appUrl } },
        }),
        tg(env.TELEGRAM_BOT_TOKEN, 'setMyCommands', {
          commands: [
            { command: 'start', description: 'Открыть фотоотчёты' },
            { command: 'menu', description: 'Открыть меню' },
          ],
        }),
      ]);

      return J({ ok: true, webhook, webapp: appUrl, telegram: { webhook: wh, menu, commands } });
    }

    if (req.method === 'POST' && url.pathname === '/webhook') {
      if (env.TELEGRAM_WEBHOOK_SECRET) {
        const got = req.headers.get('X-Telegram-Bot-Api-Secret-Token') || '';
        if (!safeEq(got, env.TELEGRAM_WEBHOOK_SECRET)) return new Response('Unauthorized', { status: 401 });
      }
      try {
        const payload = (await req.json()) as any;
        await handleUpdate(payload, env, appUrl);
      } catch (error) {
        console.error('Webhook error', error);
      }
      return new Response('OK');
    }

    if (req.method === 'POST' && url.pathname === '/api/report') {
      return createReport(req, env);
    }

    if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
    return new Response('Not found', { status: 404 });
  },
};

async function handleUpdate(update: any, env: Env, appUrl: string) {
  const message = update?.message;
  if (!message?.chat?.id) return;
  const text = String(message.text || '').trim();
  if (!['/start', '/menu', '/webapp'].includes(text.split('@')[0])) return;

  if (message.message_id) {
    await tg(env.TELEGRAM_BOT_TOKEN, 'deleteMessage', {
      chat_id: message.chat.id,
      message_id: message.message_id,
    }).catch(() => null);
  }

  const kb = {
    inline_keyboard: [[{ text: 'Открыть фотоотчёты', web_app: { url: appUrl } }]],
  };

  await send(env.TELEGRAM_BOT_TOKEN, message.chat.id,
    '<b>HOUSE CLEANING · ФОТООТЧЁТЫ</b>\n\n' +
    'Создайте отчёт по объекту: фотографии <b>ДО</b>, фотографии <b>ПОСЛЕ</b>, адрес и комментарий.\n\n' +
    'Нажмите кнопку ниже.',
    { parse_mode: 'HTML', reply_markup: kb, disable_web_page_preview: true },
  );
}

async function createReport(req: Request, env: Env): Promise<Response> {
  if (!env.TELEGRAM_BOT_TOKEN) return J({ ok: false, error: 'Бот временно не настроен.' }, 503);

  const user = await validateInitData(req.headers.get('X-Telegram-Init-Data') || '', env.TELEGRAM_BOT_TOKEN);
  if (!user) return J({ ok: false, error: 'Сессия Telegram устарела. Закройте и заново откройте фотоотчёты из бота.' }, 401);

  const allowed = parseList(env.ALLOWED_USER_IDS);
  if (allowed.length && !allowed.includes(String(user.id))) {
    return J({ ok: false, error: 'У вас нет доступа к отправке фотоотчётов.' }, 403);
  }

  const admins = parseList(env.ADMIN_IDS);
  if (!admins.length) return J({ ok: false, error: 'Администраторы бота ещё не настроены.' }, 503);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return J({ ok: false, error: 'Не удалось прочитать фотографии. Попробуйте выбрать их заново.' }, 400);
  }

  const object = clean(form.get('object'), 120);
  const address = clean(form.get('address'), 180);
  const type = clean(form.get('type'), 80) || 'Не указан';
  const team = clean(form.get('team'), 100);
  const comment = clean(form.get('comment'), 700);
  const before = form.getAll('before').filter(isFile);
  const after = form.getAll('after').filter(isFile);
  const files = [...before, ...after];

  if (!object) return J({ ok: false, error: 'Укажите название объекта.' }, 400);
  if (!before.length) return J({ ok: false, error: 'Добавьте минимум 1 фото ДО.' }, 400);
  if (!after.length) return J({ ok: false, error: 'Добавьте минимум 1 фото ПОСЛЕ.' }, 400);
  if (files.length > MAX_FILES) return J({ ok: false, error: `Максимум ${MAX_FILES} фото в одном отчёте.` }, 400);
  if (files.some((file) => !file.type.startsWith('image/'))) return J({ ok: false, error: 'Разрешены только изображения.' }, 400);
  if (files.some((file) => file.size > MAX_FILE)) return J({ ok: false, error: 'Одно из фото больше 9 МБ.' }, 400);

  const reportId = makeReportId(user.id);
  const when = formatMoscow(new Date());
  const caption = [
    '<b>HOUSE CLEANING · НОВЫЙ ФОТООТЧЁТ</b>',
    `<b>ID:</b> <code>${esc(reportId)}</code>`,
    `<b>Дата:</b> ${esc(when)}`,
    `<b>Объект:</b> ${esc(object)}`,
    address ? `<b>Адрес:</b> ${esc(address)}` : '',
    `<b>Тип уборки:</b> ${esc(type)}`,
    team ? `<b>Бригада:</b> ${esc(team)}` : '',
    `<b>Сотрудник:</b> ${esc(displayName(user))}`,
    user.username ? `<b>Telegram:</b> @${esc(user.username)}` : '',
    `<b>Telegram ID:</b> <code>${user.id}</code>`,
    `<b>ДО:</b> ${before.length} · <b>ПОСЛЕ:</b> ${after.length}`,
    comment ? `\n<b>Комментарий:</b>\n${esc(comment)}` : '',
  ].filter(Boolean).join('\n');

  try {
    for (const admin of admins) {
      await send(env.TELEGRAM_BOT_TOKEN, admin, caption, { parse_mode: 'HTML', disable_web_page_preview: true });
      await sendAlbums(env.TELEGRAM_BOT_TOKEN, admin, before, `ДО · ${reportId}`);
      await sendAlbums(env.TELEGRAM_BOT_TOKEN, admin, after, `ПОСЛЕ · ${reportId}`);
    }
  } catch (error) {
    console.error('Report delivery failed', reportId, error);
    return J({ ok: false, error: 'Telegram не принял часть фото. Проверьте интернет и попробуйте отправить отчёт ещё раз.' }, 502);
  }

  return J({ ok: true, report_id: reportId, before: before.length, after: after.length });
}

async function sendAlbums(token: string, chatId: string, files: File[], label: string) {
  for (let offset = 0; offset < files.length; offset += 10) {
    const part = files.slice(offset, offset + 10);
    const body = new FormData();
    const media: Array<Record<string, string>> = [];

    part.forEach((file, index) => {
      const field = `f${offset + index}`;
      body.append(field, file, file.name || `${field}.jpg`);
      const item: Record<string, string> = { type: 'photo', media: `attach://${field}` };
      if (index === 0) item.caption = offset ? `${label} · продолжение` : label;
      media.push(item);
    });

    body.append('chat_id', chatId);
    body.append('media', JSON.stringify(media));
    const response = await fetch(`${API(token)}/sendMediaGroup`, { method: 'POST', body });
    if (!response.ok) throw new Error(await response.text());
    const data = (await response.json()) as any;
    if (!data?.ok) throw new Error(JSON.stringify(data));
  }
}

async function send(token: string, chatId: string | number, text: string, extra: Record<string, unknown> = {}) {
  return tg(token, 'sendMessage', { chat_id: chatId, text, ...extra });
}

async function tg(token: string, method: string, body: Record<string, unknown>) {
  const response = await fetch(`${API(token)}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as any;
  if (!response.ok || !data?.ok) throw new Error(`Telegram ${method}: ${JSON.stringify(data)}`);
  return data;
}

async function validateInitData(raw: string, token: string): Promise<TgUser | null> {
  if (!raw) return null;
  try {
    const params = new URLSearchParams(raw);
    const receivedHash = params.get('hash') || '';
    const authDate = Number(params.get('auth_date') || 0);
    if (!receivedHash || !authDate) return null;
    if (Math.abs(Date.now() / 1000 - authDate) > 6 * 60 * 60) return null;

    params.delete('hash');
    const entries: Array<[string, string]> = [];
    params.forEach((value, key) => entries.push([key, value]));
    const checkString = entries
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = await hmac(new TextEncoder().encode('WebAppData'), new TextEncoder().encode(token));
    const calculated = await hmac(secretKey, new TextEncoder().encode(checkString));
    const calculatedHex = bytesToHex(calculated);
    if (!safeEq(calculatedHex, receivedHash.toLowerCase())) return null;

    const parsed = JSON.parse(params.get('user') || 'null');
    if (!parsed?.id) return null;
    return parsed as TgUser;
  } catch {
    return null;
  }
}

async function hmac(keyBytes: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
}

function makeReportId(userId: number) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Moscow', year: '2-digit', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '00';
  const rnd = crypto.randomUUID().slice(0, 6).toUpperCase();
  return `HC-${get('year')}${get('month')}${get('day')}-${String(userId).slice(-4)}-${rnd}`;
}

function normalizeAppUrl(value: string) {
  return value.replace(/\/$/, '') + '/';
}

function clean(value: FormDataEntryValue | null, max: number) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
}

function isFile(value: FormDataEntryValue): value is File {
  return value instanceof File && value.size > 0;
}

function parseList(value?: string) {
  return String(value || '').split(',').map((x) => x.trim()).filter(Boolean);
}

function displayName(user: TgUser) {
  return [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || `ID ${user.id}`;
}

function formatMoscow(date: Date) {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(date);
}

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function safeEq(a: string, b: string) {
  const aa = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (aa.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}

function esc(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function J(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
