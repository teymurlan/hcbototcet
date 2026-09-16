import staffFinal, { AppState as FinalAppState } from './staff-final';
import type { Env } from './staff-final';
import staffV5 from './staff-v5';
import { STAFF_PRODUCTION_APP } from './staff-production-ui';

export { FinalAppState };
export type { Env } from './staff-final';

const STORE_NAME = 'house-cleaning-app-v1';
const BUILD = 'staff-production-2026-09-16-b';
const WORKER_ORIGIN = 'https://hcbototcet.teymurlannn.workers.dev';

type PaymentDetails = {
  bank: string;
  sbp_phone: string;
  recipient: string;
  card_last4: string;
  updated_at?: string;
  updated_by?: number;
  updated_role?: 'admin' | 'employee';
};

export class AppState extends FinalAppState {
  async fetch(req: Request): Promise<Response> {
    const u = new URL(req.url);

    if (u.pathname === '/opsprod/payment-save' && req.method === 'POST') {
      const x: any = await readBody(req), id = positiveInt(x.id);
      if (!id) return J({ ok: false, error: 'Некорректный сотрудник' }, 400);
      const old = await this.state.storage.get<PaymentDetails>(`opsfinal:payment:${id}`) || emptyPayment();
      const next: PaymentDetails = {
        bank: clean(x.bank, 80),
        sbp_phone: clean(x.sbp_phone, 40),
        recipient: clean(x.recipient, 120),
        card_last4: clean(x.card_last4, 4).replace(/\D/g, '').slice(0, 4),
        updated_at: new Date().toISOString(),
        updated_by: positiveInt(x.updated_by),
        updated_role: x.updated_role === 'admin' ? 'admin' : 'employee',
      };
      await this.state.storage.put(`opsfinal:payment:${id}`, next);
      const at = Date.now(), auditId = crypto.randomUUID();
      await this.state.storage.put(`opsprod:payment-audit:${String(at).padStart(13, '0')}:${auditId}`, {
        id: auditId, employee_id: id, old, next, at, created_at: new Date(at).toISOString(),
        updated_by: next.updated_by || 0, updated_role: next.updated_role || 'employee',
      });
      return J({ ok: true, old, payment: next });
    }

    if (u.pathname === '/opsprod/finance-entry' && req.method === 'POST') {
      const x: any = await readBody(req), employeeId = positiveInt(x.employee_id), kind = clean(x.kind, 20), amount = Number(x.amount);
      if (!employeeId || !['payout', 'adjustment'].includes(kind) || !Number.isFinite(amount) || (kind === 'payout' && amount <= 0) || (kind === 'adjustment' && amount === 0)) {
        return J({ ok: false, error: 'Проверьте сумму' }, 400);
      }
      const at = Date.now(), id = crypto.randomUUID();
      const entry = {
        id, employee_id: employeeId, kind, amount,
        comment: clean(x.comment, 500), admin_id: positiveInt(x.admin_id),
        payment_bank: clean(x.payment_bank, 80), payment_sbp_phone: clean(x.payment_sbp_phone, 40),
        payment_recipient: clean(x.payment_recipient, 120), payment_card_last4: clean(x.payment_card_last4, 4).replace(/\D/g, '').slice(0, 4),
        at, created_at: new Date(at).toISOString(),
      };
      await this.state.storage.put(`ops3:finance:${String(at).padStart(13, '0')}:${id}`, entry);
      return J({ ok: true, entry });
    }

    return super.fetch(req);
  }
}

export default {
  async fetch(req: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    const u = new URL(req.url);
    if (req.method === 'GET' && u.pathname === '/__hc_staff_version') {
      return J({ ok: true, build: BUILD, staff: true, sync_v2: true, payment_audit: true, payout_bank: true, standards_colors: true });
    }
    if (req.method === 'GET' && ['/staff', '/staff/', '/admin'].includes(u.pathname)) return html(STAFF_PRODUCTION_APP);

    if (u.pathname === '/api/staff/payment-details' && req.method === 'POST') return paymentSaveApi(req, env, ctx);
    if (u.pathname === '/api/staff/finance/entry' && req.method === 'POST') return financeEntryApi(req, env, ctx);

    return staffFinal.fetch(req, env, ctx as any);
  },

  async scheduled(controller: any, env: Env, ctx: ExecutionContext): Promise<void> {
    // Important: call V5 scheduler directly so the old final sync cannot emit duplicate order-change notifications.
    await staffV5.scheduled(controller, env, ctx);
    ctx.waitUntil(syncBookingEventsV2(env));
  },
};

async function paymentSaveApi(req: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  const auth = await authState(req, env, ctx); if (!auth.ok) return auth.response;
  const u = new URL(req.url), requested = positiveInt(u.searchParams.get('id'));
  const id = auth.admin && requested ? requested : auth.userId;
  if (!id) return J({ ok: false, error: 'Сотрудник не найден' }, 404);
  if (!auth.admin && requested && requested !== auth.userId) return J({ ok: false, error: 'Нет доступа' }, 403);

  const x: any = await readBody(req), currentData = await stateCall(env, `/opsfinal/payment?id=${id}`).catch(() => ({ payment: emptyPayment() }));
  const old = normalizePayment(currentData.payment || emptyPayment());
  const next = normalizePayment(x);
  if (!next.bank && !next.sbp_phone && !next.recipient && !next.card_last4) return J({ ok: false, error: 'Заполните хотя бы банк или СБП' }, 400);
  if (samePayment(old, next)) return J({ ok: true, changed: false, payment: currentData.payment || old });

  const saved = await stateCall(env, '/opsprod/payment-save', 'POST', {
    ...next, id, updated_by: auth.userId, updated_role: auth.admin ? 'admin' : 'employee',
  });
  if (!saved.ok) return J(saved, 400);

  const er = await stateCall(env, `/ops3/employee?id=${id}`).catch(() => ({ employee: null }));
  const name = er.employee?.name || `ID ${id}`;
  const oldText = paymentText(old), newText = paymentText(next), origin = new URL(req.url).origin;

  if (auth.admin) {
    ctx?.waitUntil?.(sendTg(env, id, `🏦 <b>Реквизиты для выплат обновлены руководителем</b>\n\nНовые реквизиты:\n${esc(newText)}\n\nЕсли заметили ошибку — исправьте их в профиле STAFF.`, origin, 'Открыть профиль'));
    await saveNotice(env, { audience: 'admin', level: 'info', title: 'Реквизиты обновлены', body: `${name} · ${newText}`, employee_id: id });
  } else {
    const text = `🏦 <b>Сотрудник изменил реквизиты</b>\n\n<b>${esc(name)}</b>\n\nБыло:\n${esc(oldText)}\n\nСтало:\n${esc(newText)}\n\nВ STAFF сохранены только новые актуальные реквизиты.`;
    ctx?.waitUntil?.(notifyAdmins(env, text));
    await saveNotice(env, { audience: 'admin', level: 'warning', title: 'Изменены реквизиты сотрудника', body: `${name} · ${newText}`, employee_id: id });
  }
  return J({ ok: true, changed: true, payment: saved.payment });
}

async function financeEntryApi(req: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  const auth = await authState(req, env, ctx); if (!auth.ok || !auth.admin) return auth.response;
  const x: any = await readBody(req), employeeId = positiveInt(x.employee_id), kind = clean(x.kind, 20), amount = Number(x.amount);
  if (!employeeId || !['payout', 'adjustment'].includes(kind) || !Number.isFinite(amount) || (kind === 'payout' && amount <= 0) || (kind === 'adjustment' && amount === 0)) {
    return J({ ok: false, error: 'Проверьте сумму' }, 400);
  }

  let payment = emptyPayment();
  if (kind === 'payout') {
    const p = await stateCall(env, `/opsfinal/payment?id=${employeeId}`).catch(() => ({ payment: emptyPayment() }));
    payment = normalizePayment(p.payment || emptyPayment());
  }
  const saved = await stateCall(env, '/opsprod/finance-entry', 'POST', {
    employee_id: employeeId, kind, amount, comment: clean(x.comment, 500), admin_id: auth.userId,
    payment_bank: payment.bank, payment_sbp_phone: payment.sbp_phone, payment_recipient: payment.recipient, payment_card_last4: payment.card_last4,
  });
  if (!saved.ok) return J(saved, 400);

  const origin = new URL(req.url).origin;
  if (kind === 'payout') {
    const method = payment.bank ? `${payment.bank}${payment.sbp_phone ? ` · СБП ${payment.sbp_phone}` : ''}` : 'способ выплаты не указан';
    ctx?.waitUntil?.(sendTg(env, employeeId, `💸 <b>Выплата отмечена</b>\n\nСумма: <b>${money(amount)}</b>\nСпособ: <b>${esc(method)}</b>${x.comment ? `\nКомментарий: ${esc(x.comment)}` : ''}`, origin, 'Открыть финансы'));
  } else {
    ctx?.waitUntil?.(sendTg(env, employeeId, `🧾 <b>Корректировка баланса</b>\n\nСумма: <b>${money(amount)}</b>${x.comment ? `\nКомментарий: ${esc(x.comment)}` : ''}`, origin, 'Открыть финансы'));
  }
  return J({ ok: true, entry: saved.entry });
}

async function syncBookingEventsV2(env: Env): Promise<void> {
  const orders = await bookingOrders(env);
  const snapData = await stateCall(env, '/opsfinal/snapshot').catch(() => ({ snapshot: null }));
  const snapshot = snapData.snapshot || null, now = Date.now();
  const next: Record<string, any> = {};
  for (const o of orders) {
    const n = clean(o?.order_number, 120); if (!n) continue;
    next[n] = snapshotOrderV2(o);
  }

  // Migrate the old snapshot silently. This prevents a one-time storm of false "changed" events.
  if (!snapshot || Number(snapshot.version || 0) !== 2) {
    await stateCall(env, '/opsfinal/snapshot', 'POST', { version: 2, initialized: true, at: now, orders: next });
    return;
  }

  const prev = snapshot.orders || {}, events: any[] = [];
  for (const o of orders) {
    const n = clean(o?.order_number, 120); if (!n) continue;
    const current = next[n], old = prev[n];
    if (!old) {
      events.push({ type: 'new', order: o });
      continue;
    }
    if (String(old.status || '') !== 'CANCELLED' && current.status === 'CANCELLED') {
      events.push({ type: 'cancel', order: o });
      continue;
    }
    if (semanticKey(old) !== semanticKey(current)) events.push({ type: 'change', order: o, old });
  }

  // Save first: even if Telegram is slow, the next cron run will not repeat the same event.
  await stateCall(env, '/opsfinal/snapshot', 'POST', { version: 2, initialized: true, at: now, orders: next });
  for (const e of events) {
    if (e.type === 'new') await emitNewOrder(env, e.order);
    else if (e.type === 'cancel') await emitCancelledOrder(env, e.order);
    else await emitChangedOrder(env, e.order);
  }
}

function snapshotOrderV2(o: any) {
  return {
    status: clean(o?.status, 30), date: clean(o?.date, 30), time: clean(o?.time, 30),
    city: clean(o?.city, 120), address: clean(o?.address, 300), apartment: clean(o?.apartment, 80),
    service_name: clean(o?.service_name, 160), area: Number(o?.area || 0), estimated_price: Number(o?.estimated_price || 0),
    addons: Array.isArray(o?.addon_names) ? o.addon_names.map((v: any) => clean(v, 120)).sort() : [],
  };
}
function semanticKey(v: any) {
  return JSON.stringify({
    date: clean(v?.date, 30), time: clean(v?.time, 30), city: clean(v?.city, 120), address: clean(v?.address, 300), apartment: clean(v?.apartment, 80),
    service_name: clean(v?.service_name, 160), area: Number(v?.area || 0), estimated_price: Number(v?.estimated_price || 0),
    addons: Array.isArray(v?.addons) ? v.addons.map((x: any) => clean(x, 120)).sort() : [],
  });
}

async function emitNewOrder(env: Env, o: any) {
  const n = clean(o?.order_number, 120), address = addressOf(o), text = `🆕 <b>Новая заявка</b>\n\n<b>${esc(n)}</b>\n📅 ${esc(o?.date || '')} · ${esc(o?.time || '')}\n📍 ${esc(address)}\n🧹 ${esc(o?.service_name || 'Уборка')}${o?.area ? ` · ${esc(o.area)} м²` : ''}`;
  await Promise.all([notifyAdmins(env, text), saveNotice(env, { audience: 'admin', level: 'info', title: 'Новая заявка', body: `${n} · ${address}`, order_number: n })]);
}
async function emitCancelledOrder(env: Env, o: any) {
  const n = clean(o?.order_number, 120), address = addressOf(o), meta = await orderMeta(env, n), text = `❌ <b>Заказ отменён</b>\n\n<b>${esc(n)}</b>\n📍 ${esc(address)}`;
  const tasks: Promise<any>[] = [notifyAdmins(env, text), saveNotice(env, { audience: 'admin', level: 'warning', title: 'Заказ отменён', body: `${n} · ${address}`, order_number: n })];
  for (const a of meta.assigned || []) tasks.push(sendTg(env, Number(a.id), text, WORKER_ORIGIN, 'Открыть STAFF'));
  await Promise.all(tasks);
}
async function emitChangedOrder(env: Env, o: any) {
  const n = clean(o?.order_number, 120), address = addressOf(o), meta = await orderMeta(env, n), text = `🔄 <b>Заказ изменён</b>\n\n<b>${esc(n)}</b>\n📅 ${esc(o?.date || '')} · ${esc(o?.time || '')}\n📍 ${esc(address)}`;
  const tasks: Promise<any>[] = [notifyAdmins(env, text), saveNotice(env, { audience: 'admin', level: 'info', title: 'Изменение заказа', body: `${n} · ${address}`, order_number: n })];
  for (const a of meta.assigned || []) tasks.push(sendTg(env, Number(a.id), text, WORKER_ORIGIN, 'Открыть задание'));
  await Promise.all(tasks);
}

async function authState(req: Request, env: Env, ctx?: ExecutionContext) {
  const u = new URL(req.url); u.pathname = '/api/state'; u.search = '';
  const r = await staffV5.fetch(new Request(u.toString(), { method: 'GET', headers: req.headers }), env, ctx as any);
  let data: any; try { data = await r.clone().json(); } catch { return { ok: false, admin: false, userId: 0, data: null, response: r }; }
  const userId = positiveInt(data?.employee?.id || data?.user?.id || data?.admin_id);
  const ok = r.ok && data?.ok !== false && (!!data?.admin || !!userId);
  return { ok, admin: !!data?.admin, userId, data, response: ok ? J(data) : r };
}

function bookingStub(env: Env) { return (env as any).BOOKING_STORE?.get((env as any).BOOKING_STORE.idFromName(STORE_NAME)); }
async function bookingOrders(env: Env) { const r = await bookingStub(env)?.fetch('https://booking.internal/orders'); if (!r?.ok) return []; const x: any = await r.json().catch(() => ({})); return Array.isArray(x.orders) ? x.orders : []; }
async function orderMeta(env: Env, n: string) { const x = await stateCall(env, `/ops3/order-meta?number=${encodeURIComponent(n)}`); return x.meta || { order_number: n, assigned: [] }; }
async function stateCall(env: Env, path: string, method = 'GET', body?: any) { const r = await stateCallRaw(env, path, method, body); return await r.json().catch(() => ({})); }
async function stateCallRaw(env: Env, path: string, method = 'GET', body?: any) { const id = (env as any).STATE.idFromName('global'), stub = (env as any).STATE.get(id); return stub.fetch('https://state.local' + path, { method, headers: body === undefined ? undefined : { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); }
async function saveNotice(env: Env, x: any) { return stateCall(env, '/opsfinal/notice', 'POST', { ...x, at: Date.now() }); }
async function notifyAdmins(env: Env, text: string) { await Promise.all(adminIds(env).map(id => sendTg(env, Number(id), text, WORKER_ORIGIN, 'Открыть STAFF'))); }
async function sendTg(env: Env, id: number, text: string, origin = WORKER_ORIGIN, label = 'Открыть STAFF') { const token = String((env as any).TELEGRAM_BOT_TOKEN || ''); if (!token || !id) return null; const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: id, text, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: label, web_app: { url: `${origin || WORKER_ORIGIN}/staff` } }]] } }) }); const x: any = await r.json().catch(() => ({})); if (!r.ok || !x.ok) throw new Error(x?.description || 'Telegram API error'); return x.result; }
function adminIds(env: Env) { return String((env as any).ADMIN_IDS || '').split(',').map(x => x.trim()).filter(Boolean); }
function emptyPayment(): PaymentDetails { return { bank: '', sbp_phone: '', recipient: '', card_last4: '' }; }
function normalizePayment(v: any): PaymentDetails { return { bank: clean(v?.bank, 80), sbp_phone: clean(v?.sbp_phone, 40), recipient: clean(v?.recipient, 120), card_last4: clean(v?.card_last4, 4).replace(/\D/g, '').slice(0, 4) }; }
function samePayment(a: PaymentDetails, b: PaymentDetails) { return a.bank === b.bank && a.sbp_phone === b.sbp_phone && a.recipient === b.recipient && a.card_last4 === b.card_last4; }
function paymentText(p: PaymentDetails) { const parts = [p.bank || 'Банк не указан', p.sbp_phone ? `СБП ${p.sbp_phone}` : '', p.recipient ? `Получатель: ${p.recipient}` : '', p.card_last4 ? `Карта •••• ${p.card_last4}` : ''].filter(Boolean); return parts.join('\n'); }
function addressOf(o: any) { return [o?.city, o?.address, o?.apartment ? `кв./офис ${o.apartment}` : ''].filter(Boolean).join(', ') || 'Адрес не указан'; }
function money(v: any) { return new Intl.NumberFormat('ru-RU').format(Math.round(Number(v || 0))) + ' ₽'; }
function positiveInt(v: any) { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : 0; }
function clean(v: any, n = 500) { return String(v ?? '').trim().slice(0, n); }
function esc(v: any) { return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)); }
async function readBody(req: Request) { try { return await req.json(); } catch { return {}; } }
function J(data: any, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }
function html(s: string) { return new Response(s, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store, no-cache, must-revalidate', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' } }); }
