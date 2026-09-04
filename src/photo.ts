import { APP } from './app';

export interface Env {
  TELEGRAM_BOT_TOKEN: string;
  ADMIN_IDS?: string;
  WEBAPP_URL?: string;
  SETUP_SECRET?: string;
}

const API = (token: string) => `https://api.telegram.org/bot${token}`;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const appUrl = (env.WEBAPP_URL || url.origin).replace(/\/$/, '') + '/';

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/app')) {
      return new Response(APP, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
        },
      });
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      return J({ ok: true, bot: 'hcbototcet', service: 'photo-reports', webapp: appUrl });
    }

    // One-time setup: registers Telegram webhook + menu button.
    // Open /setup?key=SETUP_SECRET after the Worker is deployed.
    if (req.method === 'GET' && url.pathname === '/setup') {
      if (!env.SETUP_SECRET || url.searchParams.get('key') !== env.SETUP_SECRET) {
        return J({ ok: false, error: 'Unauthorized' }, 401);
      }
      const webhook = appUrl.replace(/\/$/, '') + '/webhook';
      const [wh, menu, commands] = await Promise.all([
        tg(env.TELEGRAM_BOT_TOKEN, 'setWebhook', { url: webhook, drop_pending_updates: true }),
        tg(env.TELEGRAM_BOT_TOKEN, 'setChatMenuButton', {
          menu_button: { type: 'web_app', text: 'Фотоотчёт', web_app: { url: appUrl } },
        }),
        tg(env.TELEGRAM_BOT_TOKEN, 'setMyCommands', {
          commands: [
            { command: 'start', description: 'Открыть фотоотчёты' },
            { command: 'menu', description: 'Открыть меню фотоотчётов' },
          ],
        }),
      ]);
      return J({ ok: true, webhook, webapp: appUrl, telegram: { webhook: wh, menu, commands } });
    }

    if (req.method === 'POST' && url.pathname === '/webhook') {
      try {
        await update(await req.json<any>(), env, appUrl);
      } catch (e) {
        console.error(e);
      }
      return new Response('OK');
    }

    if (req.method === 'POST' && url.pathname === '/api/report') {
      return report(req, env);
    }

    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;

async function update(x: any, e: Env, appUrl: string) {
  const m = x?.message;
  if (!m?.chat?.id) return;

  const text = String(m.text || '').trim();
  const kb = {
    inline_keyboard: [[{ text: 'Создать фотоотчёт', web_app: { url: appUrl } }]],
  };

  if (text === '/start' || text === '/menu' || text === '/webapp') {
    return send(
      e.TELEGRAM_BOT_TOKEN,
      m.chat.id,
      '<b>HOUSE CLEANING</b>\n\nФотоотчёты после уборки.\n\nНажмите кнопку ниже, чтобы выбрать объект и добавить фотографии ДО и ПОСЛЕ.',
      { parse_mode: 'HTML', reply_markup: kb },
    );
  }

  return send(e.TELEGRAM_BOT_TOKEN, m.chat.id, 'Откройте фотоотчёт кнопкой ниже.', {
    reply_markup: kb,
  });
}

async function report(req: Request, e: Env) {
  const u = await auth(req.headers.get('X-Telegram-Init-Data') || '', e.TELEGRAM_BOT_TOKEN);
  if (!u) return J({ ok: false, error: 'Откройте приложение из Telegram заново.' }, 401);

  const f = await req.formData();
  const object = String(f.get('object') || '').trim();
  const comment = String(f.get('comment') || '').trim();
  const before = f.getAll('before').filter((x): x is File => x instanceof File);
  const after = f.getAll('after').filter((x): x is File => x instanceof File);
  const files = [...before, ...after];

  if (!object) return J({ ok: false, error: 'Укажите объект.' }, 400);
  if (!files.length) return J({ ok: false, error: 'Добавьте фото.' }, 400);
  if (files.length > 20) return J({ ok: false, error: 'Максимум 20 фото.' }, 400);
  if (files.some(x => !x.type.startsWith('image/') || x.size > 10 * 1024 * 1024)) {
    return J({ ok: false, error: 'Фото должны быть изображениями до 10 МБ.' }, 400);
  }

  const admins = (e.ADMIN_IDS || '').split(',').map(x => x.trim()).filter(Boolean);
  if (!admins.length) return J({ ok: false, error: 'В Cloudflare не задан ADMIN_IDS.' }, 500);

  const cap = [
    '<b>НОВЫЙ ФОТООТЧЁТ</b>',
    `Объект: <b>${esc(object)}</b>`,
    `Сотрудник: ${esc(name(u))}`,
    `Telegram ID: <code>${u.id}</code>`,
    `Фото: ${files.length}`,
    comment ? `Комментарий: ${esc(comment)}` : '',
  ].filter(Boolean).join('\n');

  for (const a of admins) {
    await send(e.TELEGRAM_BOT_TOKEN, a, cap, { parse_mode: 'HTML' });
    for (let i = 0; i < files.length; i += 10) {
      await media(e.TELEGRAM_BOT_TOKEN, a, files.slice(i, i + 10), i, before.length);
    }
  }

  return J({ ok: true, photos: files.length });
}

async function media(token: string, chat: string, files: File[], off: number, before: number) {
  const f = new FormData();
  const m: any[] = [];
  files.forEach((x, i) => {
    const n = `f${off + i}`;
    const label = off + i < before ? `ДО #${off + i + 1}` : `ПОСЛЕ #${off + i - before + 1}`;
    f.append(n, x, x.name || n);
    m.push({ type: 'photo', media: `attach://${n}`, caption: label });
  });
  f.append('chat_id', chat);
  f.append('media', JSON.stringify(m));
  const r = await fetch(`${API(token)}/sendMediaGroup`, { method: 'POST', body: f });
  if (!r.ok) throw Error(await r.text());
}

async function send(token: string, id: string | number, text: string, extra: any = {}) {
  return tg(token, 'sendMessage', { chat_id: id, text, ...extra });
}

async function tg(token: string, method: string, body: any) {
  const r = await fetch(`${API(token)}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json<any>();
  if (!data.ok) console.error(`Telegram ${method} failed`, data);
  return data;
}

async function auth(raw: string, token: string) {
  if (!raw) return null;
  try {
    const p = new URLSearchParams(raw);
    const h = p.get('hash');
    const d = Number(p.get('auth_date') || 0);
    if (!h || !d || Date.now() / 1000 - d > 86400) return null;

    p.delete('hash');
    const s = [...p.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([a, b]) => `${a}=${b}`)
      .join('\n');

    const k = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const secret = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(token));
    const k2 = await crypto.subtle.importKey(
      'raw',
      secret,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', k2, new TextEncoder().encode(s));
    const got = [...new Uint8Array(sig)].map(x => x.toString(16).padStart(2, '0')).join('');

    return got === h ? JSON.parse(p.get('user') || 'null') : null;
  } catch {
    return null;
  }
}

const name = (u: any) => [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || 'Сотрудник';
const esc = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const J = (x: any, s = 200) => new Response(JSON.stringify(x), {
  status: s,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});
