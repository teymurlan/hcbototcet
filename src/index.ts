import photo from './photo';
import type { Env } from './photo';

export type { Env } from './photo';

const API = (token: string) => `https://api.telegram.org/bot${token}`;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const origin = url.origin;

    // Temporary recovery route. Remove immediately after Telegram is re-bound.
    if (req.method === 'GET' && url.pathname === '/setup-now') {
      if (!env.TELEGRAM_BOT_TOKEN) {
        return json({ ok: false, error: 'TELEGRAM_BOT_TOKEN is not configured' }, 500);
      }

      const appUrl = origin.replace(/\/$/, '') + '/';
      const webhookUrl = origin.replace(/\/$/, '') + '/webhook';
      const webhookBody: Record<string, unknown> = {
        url: webhookUrl,
        drop_pending_updates: false,
        allowed_updates: ['message'],
      };
      if (env.TELEGRAM_WEBHOOK_SECRET) webhookBody.secret_token = env.TELEGRAM_WEBHOOK_SECRET;

      const [webhook, menu, commands] = await Promise.all([
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

      return json({ ok: true, webapp: appUrl, webhook: webhookUrl, telegram: { webhook, menu, commands } });
    }

    return photo.fetch(req, { ...env, WEBAPP_URL: origin });
  },
};

async function tg(token: string, method: string, body: Record<string, unknown>) {
  const response = await fetch(`${API(token)}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json<any>();
  return data;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
