import staffV5, { AppState as V5AppState } from './staff-v5';
import type { Env as V5Env } from './staff-v5';
import { STAFF_FINAL_APP } from './staff-final-ui';

export type Env = V5Env;
const STORE_NAME = 'house-cleaning-app-v1';
const BUILD = 'staff-final-polish-2026-09-16-a';
const WORKER_ORIGIN = 'https://hcbototcet.teymurlannn.workers.dev';

type PaymentDetails = { bank: string; sbp_phone: string; recipient: string; card_last4: string; updated_at?: string };
type Availability = { status: 'available' | 'dayoff' | 'vacation' | 'unavailable'; note: string; until: string; updated_at?: string };

export class AppState extends V5AppState {
  async fetch(req: Request): Promise<Response> {
    const u = new URL(req.url);

    if (u.pathname === '/opsfinal/payment' && req.method === 'GET') {
      const id = positiveInt(u.searchParams.get('id'));
      if (!id) return J({ ok: false, error: 'Некорректный сотрудник' }, 400);
      const value = await this.state.storage.get<PaymentDetails>(`opsfinal:payment:${id}`) || emptyPayment();
      return J({ ok: true, payment: value });
    }
    if (u.pathname === '/opsfinal/payment' && req.method === 'POST') {
      const x: any = await readBody(req), id = positiveInt(x.id);
      if (!id) return J({ ok: false, error: 'Некорректный сотрудник' }, 400);
      const next: PaymentDetails = {
        bank: clean(x.bank, 80), sbp_phone: clean(x.sbp_phone, 40), recipient: clean(x.recipient, 120),
        card_last4: clean(x.card_last4, 4).replace(/\D/g, '').slice(0, 4), updated_at: new Date().toISOString(),
      };
      await this.state.storage.put(`opsfinal:payment:${id}`, next);
      return J({ ok: true, payment: next });
    }

    if (u.pathname === '/opsfinal/availability' && req.method === 'GET') {
      const id = positiveInt(u.searchParams.get('id'));
      if (!id) return J({ ok: false, error: 'Некорректный сотрудник' }, 400);
      const value = await this.state.storage.get<Availability>(`opsfinal:availability:${id}`) || emptyAvailability();
      return J({ ok: true, availability: value });
    }
    if (u.pathname === '/opsfinal/availability' && req.method === 'POST') {
      const x: any = await readBody(req), id = positiveInt(x.id), status = String(x.status || 'available');
      if (!id || !['available', 'dayoff', 'vacation', 'unavailable'].includes(status)) return J({ ok: false, error: 'Некорректный статус' }, 400);
      const next: Availability = { status: status as Availability['status'], note: clean(x.note, 300), until: clean(x.until, 30), updated_at: new Date().toISOString() };
      await this.state.storage.put(`opsfinal:availability:${id}`, next);
      return J({ ok: true, availability: next });
    }

    if (u.pathname === '/opsfinal/notices' && req.method === 'GET') {
      const rows = await this.state.storage.list<any>({ prefix: 'opsfinal:notice:' });
      const notices = [...rows.values()].sort((a, b) => Number(b.at || 0) - Number(a.at || 0)).slice(0, 200);
      return J({ ok: true, notices });
    }
    if (u.pathname === '/opsfinal/notice' && req.method === 'POST') {
      const x: any = await readBody(req), at = Number(x.at || Date.now()), id = crypto.randomUUID();
      const notice = { id, at, audience: clean(x.audience || 'admin', 30), employee_id: positiveInt(x.employee_id), title: clean(x.title, 180), body: clean(x.body, 1200), level: clean(x.level || 'info', 20), order_number: clean(x.order_number, 120), created_at: new Date(at).toISOString() };
      await this.state.storage.put(`opsfinal:notice:${String(at).padStart(13, '0')}:${id}`, notice);
      return J({ ok: true, notice });
    }

    if (u.pathname === '/opsfinal/snapshot' && req.method === 'GET') {
      return J({ ok: true, snapshot: await this.state.storage.get<any>('opsfinal:booking_snapshot') || null });
    }
    if (u.pathname === '/opsfinal/snapshot' && req.method === 'POST') {
      const x: any = await readBody(req); await this.state.storage.put('opsfinal:booking_snapshot', x); return J({ ok: true });
    }

    return super.fetch(req);
  }
}

export default {
  async fetch(req: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    const u = new URL(req.url);
    if (req.method === 'GET' && u.pathname === '/__hc_staff_version') return J({ ok: true, build: BUILD, staff: true, final_polish: true, live_orders: true, photo_viewer: true, finance_profile: true, employee_payment_details: true, live_refresh: true });
    if (req.method === 'GET' && ['/staff', '/staff/', '/admin'].includes(u.pathname)) return html(STAFF_FINAL_APP);

    if (u.pathname === '/api/staff/payment-details') return paymentApi(req, env, ctx);
    if (u.pathname === '/api/staff/availability') return availabilityApi(req, env, ctx);
    if (u.pathname === '/api/staff/my-finance' && req.method === 'GET') return myFinanceApi(req, env, ctx);
    if (u.pathname === '/api/staff/employee-finance' && req.method === 'GET') return employeeFinanceApi(req, env, ctx);
    if (u.pathname === '/api/staff/notifications' && req.method === 'GET') return noticesApi(req, env, ctx);
    if (u.pathname === '/api/staff/order/cancel' && req.method === 'POST') return cancelOrderApi(req, env, ctx);

    if (u.pathname === '/api/staff/employees' && req.method === 'GET') {
      const auth = await authState(req, env, ctx); if (!auth.ok || !auth.admin) return auth.response;
      const r = await staffV5.fetch(req, env, ctx as any), data: any = await r.clone().json().catch(() => ({}));
      if (!r.ok || !Array.isArray(data.employees)) return r;
      const employees = await Promise.all(data.employees.map(async (e: any) => {
        const [p, a] = await Promise.all([stateCall(env, `/opsfinal/payment?id=${Number(e.id)}`).catch(() => ({ payment: emptyPayment() })), stateCall(env, `/opsfinal/availability?id=${Number(e.id)}`).catch(() => ({ availability: emptyAvailability() }))]);
        return { ...e, payment: p.payment || emptyPayment(), availability: a.availability || emptyAvailability() };
      }));
      return J({ ...data, employees });
    }

    if (u.pathname === '/api/staff/order/assign' && req.method === 'POST') {
      const auth = await authState(req, env, ctx); if (!auth.ok || !auth.admin) return auth.response;
      const x: any = await readBody(req.clone()), assigned = Array.isArray(x.assigned) ? x.assigned : [];
      for (const a of assigned) {
        const av = await stateCall(env, `/opsfinal/availability?id=${positiveInt(a.id)}`).catch(() => ({ availability: emptyAvailability() }));
        const status = av.availability?.status || 'available';
        if (status !== 'available') return J({ ok: false, error: `Сотрудник сейчас недоступен: ${availabilityLabel(status)}` }, 409);
      }
      return staffV5.fetch(req, env, ctx as any);
    }

    if (isMutableWorkerPath(u.pathname, req.method)) {
      const locked = await lockedOrderForRequest(req, env, ctx);
      if (locked) return J({ ok: false, error: locked.reason }, 409);
    }

    return staffV5.fetch(req, env, ctx as any);
  },

  async scheduled(controller: any, env: Env, ctx: ExecutionContext): Promise<void> {
    await staffV5.scheduled(controller, env, ctx);
    ctx.waitUntil(syncBookingEvents(env));
  },
};

async function paymentApi(req: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  const auth = await authState(req, env, ctx); if (!auth.ok) return auth.response;
  const u = new URL(req.url), requested = positiveInt(u.searchParams.get('id'));
  const id = auth.admin && requested ? requested : auth.userId;
  if (!id) return J({ ok: false, error: 'Сотрудник не найден' }, 404);
  if (req.method === 'GET') return proxyJson(await stateCallRaw(env, `/opsfinal/payment?id=${id}`));
  if (req.method === 'POST') {
    const x = await readBody(req); if (!auth.admin && requested && requested !== auth.userId) return J({ ok: false, error: 'Нет доступа' }, 403);
    return proxyJson(await stateCallRaw(env, '/opsfinal/payment', 'POST', { ...x, id }));
  }
  return J({ ok: false, error: 'Method not allowed' }, 405);
}

async function availabilityApi(req: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  const auth = await authState(req, env, ctx); if (!auth.ok) return auth.response;
  const u = new URL(req.url), requested = positiveInt(u.searchParams.get('id'));
  const id = auth.admin && requested ? requested : auth.userId;
  if (!id) return J({ ok: false, error: 'Сотрудник не найден' }, 404);
  if (req.method === 'GET') return proxyJson(await stateCallRaw(env, `/opsfinal/availability?id=${id}`));
  if (req.method === 'POST') {
    const x = await readBody(req); if (!auth.admin && requested && requested !== auth.userId) return J({ ok: false, error: 'Нет доступа' }, 403);
    return proxyJson(await stateCallRaw(env, '/opsfinal/availability', 'POST', { ...x, id }));
  }
  return J({ ok: false, error: 'Method not allowed' }, 405);
}

async function myFinanceApi(req: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  const auth = await authState(req, env, ctx); if (!auth.ok || !auth.userId) return auth.response;
  return J({ ok: true, ...(await financeForEmployee(env, auth.userId)) });
}

async function employeeFinanceApi(req: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  const auth = await authState(req, env, ctx); if (!auth.ok || !auth.admin) return auth.response;
  const id = positiveInt(new URL(req.url).searchParams.get('id')); if (!id) return J({ ok: false, error: 'Сотрудник не найден' }, 400);
  return J({ ok: true, ...(await financeForEmployee(env, id)) });
}

async function noticesApi(req: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  const auth = await authState(req, env, ctx); if (!auth.ok) return auth.response;
  const x = await stateCall(env, '/opsfinal/notices'), all: any[] = x.notices || [];
  const notices = all.filter(n => auth.admin ? n.audience === 'admin' : Number(n.employee_id) === auth.userId).slice(0, 100);
  return J({ ok: true, notices });
}

async function cancelOrderApi(req: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  const auth = await authState(req, env, ctx); if (!auth.ok || !auth.admin) return auth.response;
  const x: any = await readBody(req), n = clean(x.order_number, 120), reason = clean(x.reason, 600);
  if (!n || reason.length < 3) return J({ ok: false, error: 'Укажите причину отмены' }, 400);
  const order = await bookingOrder(env, n); if (!order) return J({ ok: false, error: 'Заказ не найден' }, 404);
  if (String(order.status) === 'COMPLETED') return J({ ok: false, error: 'Завершённый заказ отменить нельзя' }, 409);
  if (String(order.status) === 'CANCELLED') return J({ ok: true, already_cancelled: true });
  const meta = await orderMeta(env, n), now = Date.now();
  meta.cancelled_at = now; meta.cancelled_by = auth.userId; meta.cancellation_reason = reason; meta.updated_at = new Date().toISOString();
  meta.audit = addAudit(meta.audit, { type: 'cancelled', label: `Заказ отменён руководителем: ${reason}`, at: now, user_id: auth.userId });
  await saveMeta(env, meta);
  await putBookingOrder(env, { ...order, status: 'CANCELLED', cancellation_reason: reason, cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  await saveNotice(env, { audience: 'admin', level: 'warning', title: 'Заказ отменён', body: `${n} · ${addressOf(order)} · ${reason}`, order_number: n });
  const origin = new URL(req.url).origin, sends = (meta.assigned || []).map((a: any) => sendTg(env, Number(a.id), `❌ <b>Заказ отменён</b>\n\n<b>${esc(n)}</b>\n📍 ${esc(addressOf(order))}\nПричина: ${esc(reason)}`, origin, 'Открыть STAFF'));
  ctx?.waitUntil?.(Promise.all(sends).then(() => undefined));
  return J({ ok: true });
}

function isMutableWorkerPath(path: string, method: string) {
  if (method !== 'POST') return false;
  return ['/api/staff/order/action', '/api/staff/checklist', '/api/media/draft', '/api/before', '/api/after'].includes(path);
}

async function lockedOrderForRequest(req: Request, env: Env, ctx?: ExecutionContext): Promise<{ reason: string } | null> {
  const auth = await authState(req, env, ctx); if (!auth.ok || auth.admin) return null;
  let n = '';
  const path = new URL(req.url).pathname;
  if (path === '/api/staff/order/action' || path === '/api/staff/checklist') {
    const x: any = await readBody(req.clone()); n = clean(x.order_number, 120);
  } else {
    n = clean(auth.data?.job?.booking_order_number, 120);
  }
  if (!n) return null;
  const [order, meta] = await Promise.all([bookingOrder(env, n), orderMeta(env, n)]);
  if (String(order?.status || '') === 'CANCELLED') return { reason: 'Заказ отменён. Изменения недоступны.' };
  if (String(order?.status || '') === 'COMPLETED' || Number(meta.verified_at || 0) > 0) return { reason: 'Работа уже принята руководителем. Заказ доступен только для просмотра.' };
  return null;
}

async function financeForEmployee(env: Env, employeeId: number) {
  const [orders, metasData, financeData] = await Promise.all([bookingOrders(env), stateCall(env, '/ops3/order-metas'), stateCall(env, '/ops3/finance')]);
  const orderMap = new Map(orders.map((o: any) => [String(o.order_number), o]));
  let accrued = 0, paid = 0, adjustments = 0; const history: any[] = [];
  for (const m of metasData.metas || []) {
    if (!m.verified_at) continue;
    const a = (m.assigned || []).find((v: any) => Number(v.id) === employeeId); if (!a) continue;
    const amount = Number(a.rate_value || 0); accrued += amount; const o: any = orderMap.get(String(m.order_number));
    history.push({ type: 'accrual', amount, at: Number(m.verified_at || 0), order_number: m.order_number, label: `Заказ ${m.order_number}`, address: addressOf(o || {}) });
  }
  for (const f of financeData.entries || []) {
    if (Number(f.employee_id) !== employeeId) continue;
    const amount = Number(f.amount || 0); if (f.kind === 'payout') paid += amount; else adjustments += amount;
    history.push({ type: f.kind, amount, at: Number(f.at || 0), label: f.kind === 'payout' ? 'Выплата' : 'Бонус / корректировка', comment: f.comment || '' });
  }
  history.sort((a, b) => Number(b.at || 0) - Number(a.at || 0));
  return { accrued, adjustments, earned: accrued + adjustments, paid, balance: accrued + adjustments - paid, history: history.slice(0, 100) };
}

async function syncBookingEvents(env: Env): Promise<void> {
  const orders = await bookingOrders(env), snapData = await stateCall(env, '/opsfinal/snapshot').catch(() => ({ snapshot: null })), prev = snapData.snapshot?.orders || {}, now = Date.now();
  const next: Record<string, any> = {};
  const initialized = !!snapData.snapshot?.initialized;
  for (const o of orders) {
    const n = String(o.order_number || ''); if (!n) continue;
    next[n] = snapshotOrder(o);
    const old = prev[n];
    if (!old) {
      const created = Date.parse(String(o.created_at || ''));
      if (initialized || (Number.isFinite(created) && now - created < 10 * 60000)) await emitNewOrder(env, o);
      continue;
    }
    if (String(old.status) !== 'CANCELLED' && String(o.status) === 'CANCELLED') await emitCancelledOrder(env, o);
    else if (old.date !== o.date || old.time !== o.time || old.address !== o.address || old.apartment !== o.apartment) await emitChangedOrder(env, o, old);
  }
  await stateCall(env, '/opsfinal/snapshot', 'POST', { initialized: true, at: now, orders: next });
}

async function emitNewOrder(env: Env, o: any) {
  const n = String(o.order_number || ''), address = addressOf(o), text = `🆕 <b>Новая заявка</b>\n\n<b>${esc(n)}</b> · ${esc(o.service_name || 'Уборка')}\n📅 ${esc(o.date || '')} · ${esc(o.time || '')}\n📍 ${esc(address)}${o.area ? `\n📐 ${esc(o.area)} м²` : ''}`;
  await Promise.all([notifyAdmins(env, text), saveNotice(env, { audience: 'admin', level: 'info', title: 'Новая заявка', body: `${n} · ${address}`, order_number: n })]);
}

async function emitCancelledOrder(env: Env, o: any) {
  const n = String(o.order_number || ''), address = addressOf(o), reason = clean(o.cancellation_reason || 'Заказ отменён', 500), meta = await orderMeta(env, n);
  const tasks: Promise<any>[] = [notifyAdmins(env, `❌ <b>Заказ отменён</b>\n\n<b>${esc(n)}</b>\n📍 ${esc(address)}\n${esc(reason)}`), saveNotice(env, { audience: 'admin', level: 'warning', title: 'Отмена заказа', body: `${n} · ${address}`, order_number: n })];
  for (const a of meta.assigned || []) tasks.push(sendTg(env, Number(a.id), `❌ <b>Назначенный заказ отменён</b>\n\n<b>${esc(n)}</b>\n📍 ${esc(address)}`, WORKER_ORIGIN, 'Открыть STAFF'));
  await Promise.all(tasks);
}

async function emitChangedOrder(env: Env, o: any, old: any) {
  const n = String(o.order_number || ''), address = addressOf(o), meta = await orderMeta(env, n), text = `🔄 <b>Заказ изменён</b>\n\n<b>${esc(n)}</b>\n📅 ${esc(o.date || '')} · ${esc(o.time || '')}\n📍 ${esc(address)}`;
  const tasks: Promise<any>[] = [notifyAdmins(env, text), saveNotice(env, { audience: 'admin', level: 'info', title: 'Изменение заказа', body: `${n} · ${address}`, order_number: n })];
  for (const a of meta.assigned || []) tasks.push(sendTg(env, Number(a.id), text, WORKER_ORIGIN, 'Открыть задание'));
  await Promise.all(tasks);
}

function snapshotOrder(o: any) { return { status: String(o.status || ''), date: String(o.date || ''), time: String(o.time || ''), address: String(o.address || ''), apartment: String(o.apartment || ''), updated_at: String(o.updated_at || '') }; }

async function saveNotice(env: Env, x: any) { return stateCall(env, '/opsfinal/notice', 'POST', { ...x, at: Date.now() }); }
async function notifyAdmins(env: Env, text: string) { const ids = adminIds(env), tasks = ids.map(id => sendTg(env, Number(id), text, WORKER_ORIGIN, 'Открыть STAFF')); await Promise.all(tasks); }
async function sendTg(env: Env, id: number, text: string, origin = WORKER_ORIGIN, label = 'Открыть STAFF') {
  const token = String((env as any).TELEGRAM_BOT_TOKEN || ''); if (!token || !id) return null;
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: id, text, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: label, web_app: { url: `${origin || WORKER_ORIGIN}/staff` } }]] } }) });
  const x: any = await r.json().catch(() => ({})); if (!r.ok || !x.ok) throw new Error(x?.description || 'Telegram API error'); return x.result;
}

async function authState(req: Request, env: Env, ctx?: ExecutionContext) {
  const u = new URL(req.url); u.pathname = '/api/state'; u.search = '';
  const r = await staffV5.fetch(new Request(u.toString(), { method: 'GET', headers: req.headers }), env, ctx as any);
  let data: any; try { data = await r.clone().json(); } catch { return { ok: false, admin: false, userId: 0, data: null, response: r }; }
  const userId = positiveInt(data?.employee?.id || data?.user?.id || userIdFromHeaders(req) || data?.admin_id);
  const ok = r.ok && data?.ok !== false && (!!data?.admin || !!userId);
  return { ok, admin: !!data?.admin, userId, data, response: ok ? J(data) : r };
}

function userIdFromHeaders(req: Request) {
  const launch = req.headers.get('X-App-Launch-Token') || '';
  try {
    const p = launch.split('.')[0]; if (p) { const s = p.replace(/-/g, '+').replace(/_/g, '/'), j = JSON.parse(atob(s + '='.repeat((4 - s.length % 4) % 4))); return positiveInt(j?.id); }
    const init = req.headers.get('X-Telegram-Init-Data') || ''; return positiveInt(JSON.parse(new URLSearchParams(init).get('user') || '{}')?.id);
  } catch { return 0; }
}

function bookingStub(env: Env) { return (env as any).BOOKING_STORE?.get((env as any).BOOKING_STORE.idFromName(STORE_NAME)); }
async function bookingOrders(env: Env) { const r = await bookingStub(env)?.fetch('https://booking.internal/orders'); if (!r?.ok) return []; const x: any = await r.json().catch(() => ({})); return Array.isArray(x.orders) ? x.orders : []; }
async function bookingOrder(env: Env, n: string) { const list = await bookingOrders(env); return list.find((o: any) => String(o.order_number) === String(n)) || null; }
async function putBookingOrder(env: Env, order: any) { const r = await bookingStub(env)?.fetch('https://booking.internal/order', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(order) }); if (!r?.ok) throw new Error('Не удалось обновить заказ'); return await r.json().catch(() => ({ order })); }
async function orderMeta(env: Env, n: string) { const x = await stateCall(env, `/ops3/order-meta?number=${encodeURIComponent(n)}`); return x.meta || { order_number: n, assigned: [], accepted: {}, confirmed: {}, started: {}, checklist: [], audit: [], verified_at: 0 }; }
async function saveMeta(env: Env, m: any) { return stateCall(env, '/ops3/order-meta', 'POST', m); }
function addAudit(a: any, item: any) { const x = Array.isArray(a) ? [...a] : []; x.push(item); return x.slice(-150); }
async function stateCall(env: Env, path: string, method = 'GET', body?: any) { const r = await stateCallRaw(env, path, method, body); return await r.json().catch(() => ({})); }
async function stateCallRaw(env: Env, path: string, method = 'GET', body?: any) { const id = (env as any).STATE.idFromName('global'), stub = (env as any).STATE.get(id); return stub.fetch('https://state.local' + path, { method, headers: body === undefined ? undefined : { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); }
async function proxyJson(r: Response) { const x = await r.json().catch(() => ({})); return J(x, r.status); }
async function readBody(req: Request) { try { return await req.json(); } catch { return {}; } }
function adminIds(env: Env) { return String((env as any).ADMIN_IDS || '').split(',').map(x => x.trim()).filter(Boolean); }
function emptyPayment(): PaymentDetails { return { bank: '', sbp_phone: '', recipient: '', card_last4: '' }; }
function emptyAvailability(): Availability { return { status: 'available', note: '', until: '' }; }
function availabilityLabel(v: string) { return ({ available: 'Доступен', dayoff: 'Выходной', vacation: 'Отпуск', unavailable: 'Не работает' } as any)[v] || v; }
function positiveInt(v: any) { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : 0; }
function clean(v: any, n = 500) { return String(v ?? '').trim().slice(0, n); }
function addressOf(o: any) { return [o?.city, o?.address, o?.apartment ? `кв./офис ${o.apartment}` : ''].filter(Boolean).join(', ') || 'Адрес не указан'; }
function esc(v: any) { return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)); }
function J(data: any, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }
function html(s: string) { return new Response(s, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store, no-cache, must-revalidate', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' } }); }
