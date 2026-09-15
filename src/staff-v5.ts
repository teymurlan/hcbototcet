import staffV4 from './staff-v4';
import type { Env } from './staff-v4';
import { STAFF_V5_APP } from './staff-v5-ui';

export { AppState } from './staff-v4';
export type { Env } from './staff-v4';

const BUILD = 'staff-v5-registration-nav-2026-09-16-a';
type TgUser = { id: number; first_name?: string; last_name?: string; username?: string };

export default {
  async fetch(req: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    const u = new URL(req.url);
    if (req.method === 'GET' && u.pathname === '/__hc_staff_version') return J({ ok: true, build: BUILD, staff: true, onboarding: true, notifications: true, forced_registration: true, modern_nav: true });
    if (req.method === 'GET' && ['/staff', '/staff/', '/admin'].includes(u.pathname)) return html(STAFF_V5_APP);
    if (req.method === 'POST' && u.pathname === '/webhook') return webhookV5(req, env, ctx);
    return staffV4.fetch(req, env, ctx as any);
  },
  async scheduled(controller: any, env: Env, ctx: ExecutionContext): Promise<void> {
    return staffV4.scheduled(controller, env, ctx);
  },
};

async function webhookV5(req: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  const secret = String((env as any).TELEGRAM_WEBHOOK_SECRET || '');
  if (secret && !safeEq(req.headers.get('X-Telegram-Bot-Api-Secret-Token') || '', secret)) return new Response('Unauthorized', { status: 401 });
  const copy = req.clone(); let up: any; try { up = await req.json(); } catch { return staffV4.fetch(copy, env, ctx as any); }
  const m = up?.message, user: TgUser | undefined = m?.from, cmd = String(m?.text || '').trim().replace(/@\w+$/, '').toLowerCase();
  if (!user?.id || !m?.chat?.id || !['/start', '/menu'].includes(cmd) || isAdmin(env, user.id)) return staffV4.fetch(copy, env, ctx as any);

  const er = await stateCall(env, `/employee?id=${user.id}`).catch(() => ({ employee: null })), employee = er.employee || null;
  if (!employee || employee.status !== 'active') return staffV4.fetch(copy, env, ctx as any);
  const pr = await stateCall(env, `/ops3/employee?id=${user.id}`).catch(() => ({ employee: null })), profile = pr.employee || null;
  if (profile?.source !== 'legacy') return staffV4.fetch(copy, env, ctx as any);

  const launch = await signLaunch(user, String((env as any).TELEGRAM_BOT_TOKEN || ''));
  const url = `${new URL(req.url).origin}/staff?launch=${encodeURIComponent(launch)}&onboarding=1`;
  await tg(env, 'sendMessage', {
    chat_id: m.chat.id,
    text: `👋 <b>Обновление HOUSE CLEANING STAFF</b>\n\n${esc(profile?.name || displayName(user))}, теперь у каждого сотрудника единый рабочий профиль. Пройдите короткую регистрацию, затем регламент и обучение. Старые данные не удаляются.`,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [[{ text: '📝 Пройти регистрацию', web_app: { url } }]] },
  }).catch(() => null);
  await tg(env, 'setChatMenuButton', { chat_id: m.chat.id, menu_button: { type: 'web_app', text: 'HOUSE CLEANING STAFF', web_app: { url } } }).catch(() => null);
  return new Response('OK');
}

async function stateCall(env: Env, path: string) { const id = (env as any).STATE.idFromName('global'), stub = (env as any).STATE.get(id), r = await stub.fetch('https://state.local' + path); return await r.json() as any; }
function adminIds(env: Env) { return String((env as any).ADMIN_IDS || '').split(',').map(x => x.trim()).filter(Boolean); }
function isAdmin(env: Env, id: number) { return adminIds(env).includes(String(id)); }
async function tg(env: Env, method: string, body: any) { const token = String((env as any).TELEGRAM_BOT_TOKEN || ''); if (!token) return null; const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); const x: any = await r.json().catch(() => ({})); if (!r.ok || !x.ok) throw new Error(x?.description || 'Telegram API error'); return x.result; }
async function signLaunch(user: TgUser, token: string) { const payload = { id: user.id, first_name: user.first_name || '', last_name: user.last_name || '', username: user.username || '', exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60 }, body = b64(new TextEncoder().encode(JSON.stringify(payload))), sig = hex(await hmac(new TextEncoder().encode(token), new TextEncoder().encode('launch:' + body))); return body + '.' + sig; }
async function hmac(key: BufferSource, data: BufferSource) { const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return new Uint8Array(await crypto.subtle.sign('HMAC', k, data)); }
function b64(a: Uint8Array) { let s = ''; a.forEach(x => s += String.fromCharCode(x)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function hex(a: Uint8Array) { return [...a].map(x => x.toString(16).padStart(2, '0')).join(''); }
function safeEq(a: string, b: string) { if (a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; }
function displayName(u: TgUser) { return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || `ID ${u.id}`; }
function esc(v: any) { return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)); }
function J(data: any, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }
function html(s: string) { return new Response(s, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store, no-cache, must-revalidate', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' } }); }
