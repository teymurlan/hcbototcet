import staffV3, { AppState as V3AppState } from './staff-v3';
import type { Env as V3Env } from './staff-v3';
import { STAFF_V4_APP } from './staff-v4-ui';

export type Env = V3Env;
const STORE_NAME = 'house-cleaning-app-v1';
const BUILD = 'staff-v4-onboarding-notifications-2026-09-16-a';
const LESSONS = ['rules', 'general', 'safety', 'chemistry', 'photos', 'client'];
const QUIZ: Record<string, string> = { q1: 'b', q2: 'b', q3: 'b', q4: 'a', q5: 'b' };

type TgUser = { id: number; first_name?: string; last_name?: string; username?: string };

export class AppState extends V3AppState {
  async fetch(req: Request): Promise<Response> {
    const u = new URL(req.url);

    if (u.pathname === '/ops4/pending' && req.method === 'POST') {
      const x: any = await readBody(req);
      const id = positiveInt(x.id);
      if (!id) return J({ ok: false, error: 'Некорректный Telegram ID' }, 400);
      const employee = await this.state.storage.get<any>(`employee:${id}`);
      if (employee) return J({ ok: true, existing: true, employee });
      const key = `ops3:candidate:AUTO-${id}`;
      const old = await this.state.storage.get<any>(key);
      const name = clean(x.name || old?.name || `Telegram ${id}`, 120);
      const candidate = {
        ...(old || {}), id: `AUTO-${id}`, telegram_id: id, name,
        username: clean(x.username || old?.username || '', 80).replace(/^@/, ''),
        phone: old?.phone || '', experience: old?.experience || '', district: old?.district || '',
        stage: old?.stage || 'new', source: 'self_registration', registration_status: 'started',
        created_at: old?.created_at || new Date().toISOString(), created_at_ms: old?.created_at_ms || Date.now(),
        updated_at: new Date().toISOString(),
      };
      await this.state.storage.put(key, candidate);
      return J({ ok: true, candidate });
    }

    if (u.pathname === '/ops4/status' && req.method === 'GET') {
      const id = positiveInt(u.searchParams.get('id'));
      if (!id) return J({ ok: false, error: 'Некорректный сотрудник' }, 400);
      const employee = await this.state.storage.get<any>(`employee:${id}`) || null;
      const profile = await this.state.storage.get<any>(`ops3:employee:${id}`) || null;
      const candidate = await this.state.storage.get<any>(`ops3:candidate:AUTO-${id}`) || null;
      return J({ ok: true, employee, profile, candidate });
    }

    if (u.pathname === '/ops4/register' && req.method === 'POST') {
      const x: any = await readBody(req);
      const id = positiveInt(x.id), name = clean(x.name, 120), phone = clean(x.phone, 40);
      if (!id || name.length < 3) return J({ ok: false, error: 'Укажите ФИО' }, 400);
      if (phone.replace(/\D/g, '').length < 7) return J({ ok: false, error: 'Укажите корректный номер телефона' }, 400);
      const role = clean(x.role || 'Клинер', 80), username = clean(x.username || '', 80).replace(/^@/, '');
      const oldBase = await this.state.storage.get<any>(`employee:${id}`);
      if (oldBase?.status === 'blocked') return J({ ok: false, error: 'Доступ к рабочему боту заблокирован руководителем' }, 403);
      const base = { ...(oldBase || {}), id, name, role, status: 'active', addedAt: Number(oldBase?.addedAt || Date.now()) };
      await this.state.storage.put(`employee:${id}`, base);

      const old = await this.state.storage.get<any>(`ops3:employee:${id}`) || {};
      const profile = {
        ...old, id, telegram_id: id, name, phone, username, role,
        experience: clean(x.experience || old.experience || '', 40),
        district: clean(x.district || old.district || '', 100),
        schedule_preference: clean(x.schedule || old.schedule_preference || 'flex', 40),
        skills: Array.isArray(old.skills) ? old.skills : ['Поддерживающая'],
        rating: Number(old.rating || 5), punctuality: Number(old.punctuality || 100), default_rate: Number(old.default_rate || 0),
        admitted: false, regulations_accepted: false, training_lessons: [], training_score: 0,
        onboarding_stage: 'regulations', source: 'self_registration',
        registered_at: old.registered_at || new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      await this.state.storage.put(`ops3:employee:${id}`, profile);

      const ckey = `ops3:candidate:AUTO-${id}`, oldC = await this.state.storage.get<any>(ckey) || {};
      const candidate = {
        ...oldC, id: `AUTO-${id}`, telegram_id: id, name, phone, role, username,
        experience: profile.experience, district: profile.district, schedule_preference: profile.schedule_preference,
        stage: 'onboarding', source: 'self_registration', registration_status: 'completed',
        created_at: oldC.created_at || new Date().toISOString(), created_at_ms: oldC.created_at_ms || Date.now(), updated_at: new Date().toISOString(),
      };
      await this.state.storage.put(ckey, candidate);
      return J({ ok: true, employee: { ...base, ...profile }, candidate });
    }

    if (u.pathname === '/ops4/training' && req.method === 'POST') {
      const x: any = await readBody(req), id = positiveInt(x.id), action = clean(x.action, 30);
      if (!id) return J({ ok: false, error: 'Сотрудник не найден' }, 400);
      const base = await this.state.storage.get<any>(`employee:${id}`), old = await this.state.storage.get<any>(`ops3:employee:${id}`);
      if (!base || !old) return J({ ok: false, error: 'Сначала завершите регистрацию' }, 409);
      const next: any = { ...old, updated_at: new Date().toISOString() };
      let justAdmitted = false;
      if (action === 'ack') {
        next.regulations_accepted = true; next.onboarding_stage = 'training';
      } else if (action === 'lesson') {
        const lesson = clean(x.lesson, 30); if (!LESSONS.includes(lesson)) return J({ ok: false, error: 'Неизвестный урок' }, 400);
        if (!next.regulations_accepted) return J({ ok: false, error: 'Сначала подтвердите регламент' }, 409);
        const set = new Set(Array.isArray(next.training_lessons) ? next.training_lessons : []); set.add(lesson); next.training_lessons = [...set]; next.onboarding_stage = 'training';
      } else if (action === 'quiz') {
        if (!next.regulations_accepted || !LESSONS.every(v => (next.training_lessons || []).includes(v))) return J({ ok: false, error: 'Сначала завершите регламент и все уроки' }, 409);
        const answers = x.answers && typeof x.answers === 'object' ? x.answers : {};
        let correct = 0; for (const [k, v] of Object.entries(QUIZ)) if (String(answers[k] || '') === v) correct += 1;
        const score = correct * 20, wasAdmitted = !!next.admitted;
        next.training_score = score; next.admitted = score >= 80; next.onboarding_stage = next.admitted ? 'admitted' : 'training';
        if (next.admitted && !wasAdmitted) { next.hired_at = next.hired_at || new Date().toISOString(); justAdmitted = true; }
      } else return J({ ok: false, error: 'Неизвестное действие' }, 400);
      await this.state.storage.put(`ops3:employee:${id}`, next);
      const ckey = `ops3:candidate:AUTO-${id}`, c = await this.state.storage.get<any>(ckey);
      if (c) await this.state.storage.put(ckey, { ...c, stage: next.admitted ? 'admitted' : 'training', updated_at: new Date().toISOString() });
      return J({ ok: true, employee: { ...base, ...next }, score: Number(next.training_score || 0), admitted: !!next.admitted, just_admitted: justAdmitted });
    }

    return super.fetch(req);
  }
}

export default {
  async fetch(req: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    const u = new URL(req.url);
    if (req.method === 'GET' && u.pathname === '/__hc_staff_version') return J({ ok: true, build: BUILD, staff: true, live_orders: true, onboarding: true, notifications: true });
    if (req.method === 'GET' && ['/staff', '/staff/', '/admin'].includes(u.pathname)) return html(STAFF_V4_APP);
    if (req.method === 'POST' && u.pathname === '/webhook') return webhookV4(req, env, ctx);

    if (u.pathname === '/api/onboarding/status' && req.method === 'GET') {
      const auth = await authLaunch(req, env); if (!auth) return J({ ok: false, error: 'Откройте регистрацию из рабочего бота' }, 401);
      const x = await stateCall(env, `/ops4/status?id=${auth.id}`);
      return J({ ok: true, user: auth, employee: x.employee || null, profile: x.profile || null, candidate: x.candidate || null });
    }
    if (u.pathname === '/api/onboarding/register' && req.method === 'POST') {
      const auth = await authLaunch(req, env); if (!auth) return J({ ok: false, error: 'Сессия регистрации истекла. Откройте /start ещё раз.' }, 401);
      const x = await readBody(req);
      const saved = await stateCall(env, '/ops4/register', 'POST', { ...x, id: auth.id, username: auth.username || '' });
      if (!saved.ok) return J(saved, 400);
      ctx?.waitUntil?.(notifyAdmins(env, `👤 <b>Новый сотрудник зарегистрировался</b>\n\n<b>${esc(saved.employee?.name || displayName(auth))}</b>\nРоль: ${esc(saved.employee?.role || 'Клинер')}\nТелефон: ${esc(saved.employee?.phone || '—')}\nРайон: ${esc(saved.employee?.district || '—')}\n\nСтатус: <b>регламент и обучение</b>`, new URL(req.url).origin));
      return J({ ok: true, employee: saved.employee });
    }
    if (u.pathname === '/api/onboarding/training' && req.method === 'POST') {
      const auth = await authLaunch(req, env); if (!auth) return J({ ok: false, error: 'Сессия истекла. Откройте /start ещё раз.' }, 401);
      const x = await readBody(req), saved = await stateCall(env, '/ops4/training', 'POST', { ...x, id: auth.id });
      if (!saved.ok) return J(saved, 409);
      if (saved.just_admitted) {
        const text = `🎓 <b>Сотрудник прошёл обучение</b>\n\n<b>${esc(saved.employee?.name || displayName(auth))}</b>\nТест: <b>${Number(saved.score || 0)}%</b>\nСтатус: ✅ <b>допущен к заказам</b>`;
        ctx?.waitUntil?.(Promise.all([notifyAdmins(env, text, new URL(req.url).origin), sendTg(env, auth.id, `✅ <b>Обучение завершено</b>\n\nРезультат: <b>${Number(saved.score || 0)}%</b>\nВы допущены к рабочим заказам.`, new URL(req.url).origin, 'Открыть рабочий кабинет')]).then(() => undefined));
      }
      return J({ ok: true, score: Number(saved.score || 0), admitted: !!saved.admitted, employee: saved.employee });
    }

    if (u.pathname === '/api/staff/order/assign' && req.method === 'POST') return assignV4(req, env, ctx);

    if (u.pathname === '/api/staff/order/action' && req.method === 'POST') {
      const copy = req.clone(), x: any = await readBody(copy), response = await staffV3.fetch(req, env, ctx as any);
      if (response.ok && ['accept', 'confirm', 'start'].includes(String(x.action || ''))) {
        const auth = await authLaunch(copy, env), n = clean(x.order_number, 120), order = await bookingOrder(env, n);
        if (auth && order) {
          const er = await stateCall(env, `/ops3/employee?id=${auth.id}`), name = er.employee?.name || displayName(auth);
          const label = x.action === 'accept' ? `☑️ <b>${esc(name)}</b> принял задание` : x.action === 'confirm' ? `✅ <b>${esc(name)}</b> подтвердил выход` : `▶️ <b>${esc(name)}</b> начал уборку`;
          ctx?.waitUntil?.(notifyAdmins(env, `${label}\n\n<b>${esc(n)}</b> · ${esc(order.service_name || 'Уборка')}\n📅 ${esc(order.date || '')} · ${esc(order.time || '')}\n📍 ${esc(order.address || '')}`, u.origin));
        }
      }
      return response;
    }

    if (u.pathname === '/api/after' && req.method === 'POST') {
      const response = await staffV3.fetch(req, env, ctx as any);
      if (response.ok) {
        const data: any = await response.clone().json().catch(() => ({})), n = clean(data?.job?.booking_order_number, 120);
        if (n) {
          const meta = await orderMeta(env, n);
          if (!meta.report_ready_notified_at) {
            meta.report_ready_notified_at = Date.now(); meta.updated_at = new Date().toISOString(); await saveMeta(env, meta);
            ctx?.waitUntil?.(notifyAdmins(env, `📸 <b>Фотоотчёт готов к проверке</b>\n\nЗаказ <b>${esc(n)}</b> завершён сотрудником.\nПроверьте фото ДО/ПОСЛЕ и подтвердите работу.`, u.origin));
          }
        }
      }
      return response;
    }

    if (u.pathname === '/api/staff/order/verify' && req.method === 'POST') {
      const copy = req.clone(), x: any = await readBody(copy), response = await staffV3.fetch(req, env, ctx as any);
      if (response.ok) {
        const n = clean(x.order_number, 120), meta = await orderMeta(env, n), order = await bookingOrder(env, n);
        const sends = (meta.assigned || []).map((a: any) => sendTg(env, Number(a.id), `✅ <b>Работа принята руководителем</b>\n\nЗаказ <b>${esc(n)}</b>${order?.service_name ? ` · ${esc(order.service_name)}` : ''}\nНачислено: <b>${money(a.rate_value || 0)}</b>\n\nСпасибо! Начисление зафиксировано в вашем учёте.`, u.origin, 'Открыть кабинет'));
        ctx?.waitUntil?.(Promise.all(sends).then(() => undefined));
      }
      return response;
    }

    if (u.pathname === '/api/staff/finance/entry' && req.method === 'POST') {
      const copy = req.clone(), x: any = await readBody(copy), response = await staffV3.fetch(req, env, ctx as any);
      if (response.ok && positiveInt(x.employee_id) && ['payout', 'adjustment'].includes(String(x.kind || ''))) {
        const icon = x.kind === 'payout' ? '💸' : '🧾', label = x.kind === 'payout' ? 'Выплата отмечена' : 'Корректировка баланса';
        ctx?.waitUntil?.(sendTg(env, positiveInt(x.employee_id), `${icon} <b>${label}</b>\n\nСумма: <b>${money(x.amount || 0)}</b>${x.comment ? `\nКомментарий: ${esc(x.comment)}` : ''}`, u.origin, 'Открыть финансы'));
      }
      return response;
    }

    return staffV3.fetch(req, env, ctx as any);
  },

  async scheduled(controller: any, env: Env, ctx: ExecutionContext): Promise<void> {
    const base: any = staffV3 as any;
    if (typeof base.scheduled === 'function') await base.scheduled(controller, env, ctx);
    ctx.waitUntil(reminderSweep(env));
  },
};

async function webhookV4(req: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  const secret = String((env as any).TELEGRAM_WEBHOOK_SECRET || '');
  if (secret && !safeEq(req.headers.get('X-Telegram-Bot-Api-Secret-Token') || '', secret)) return new Response('Unauthorized', { status: 401 });
  const copy = req.clone(); let up: any; try { up = await req.json(); } catch { return staffV3.fetch(copy, env, ctx as any); }
  const m = up?.message, user: TgUser | undefined = m?.from, cmd = String(m?.text || '').trim().replace(/@\w+$/, '').toLowerCase();
  if (!user?.id || !m?.chat?.id || !['/start', '/menu'].includes(cmd)) return staffV3.fetch(copy, env, ctx as any);
  if (isAdmin(env, user.id)) return staffV3.fetch(copy, env, ctx as any);

  const er = await stateCall(env, `/employee?id=${user.id}`).catch(() => ({ employee: null })), employee = er.employee || null;
  if (employee?.status === 'blocked') {
    await tg(env, 'sendMessage', { chat_id: m.chat.id, text: '🔒 Доступ к HOUSE CLEANING STAFF ограничен. Обратитесь к руководителю.' }).catch(() => null);
    return new Response('OK');
  }
  const pr = employee ? await stateCall(env, `/ops3/employee?id=${user.id}`).catch(() => ({ employee: null })) : { employee: null }, profile = pr.employee || null;
  if (!employee || profile?.admitted === false) {
    if (!employee) await stateCall(env, '/ops4/pending', 'POST', { id: user.id, name: displayName(user), username: user.username || '' }).catch(() => null);
    const launch = await signLaunch(user, String((env as any).TELEGRAM_BOT_TOKEN || '')), url = `${new URL(req.url).origin}/staff?launch=${encodeURIComponent(launch)}&onboarding=1`;
    const text = !employee
      ? '👋 <b>HOUSE CLEANING STAFF</b>\n\nДля доступа к рабочим заказам пройдите короткую регистрацию. Это займёт около 2 минут, затем откроется регламент и обучение.'
      : `🎓 <b>Продолжите обучение</b>\n\n${esc(profile?.name || displayName(user))}, до допуска к заказам осталось завершить регламент и короткий тест.`;
    await tg(env, 'sendMessage', { chat_id: m.chat.id, text, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: !employee ? '📝 Зарегистрироваться' : '🎓 Продолжить обучение', web_app: { url } }]] } }).catch(() => null);
    await tg(env, 'setChatMenuButton', { chat_id: m.chat.id, menu_button: { type: 'web_app', text: 'HOUSE CLEANING STAFF', web_app: { url } } }).catch(() => null);
    return new Response('OK');
  }
  return staffV3.fetch(copy, env, ctx as any);
}

async function assignV4(req: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  const auth = await authLaunch(req, env); if (!auth || !isAdmin(env, auth.id)) return J({ ok: false, error: 'Только для руководителя' }, 403);
  const x: any = await readBody(req), n = clean(x.order_number, 120), order = await bookingOrder(env, n);
  if (!order) return J({ ok: false, error: 'Заказ не найден' }, 404);
  const requested = Array.isArray(x.assigned) ? x.assigned : [], empData = await stateCall(env, '/ops3/employees'), employees: any[] = empData.employees || [], assigned: any[] = [];
  for (const a of requested) {
    const e = employees.find((v: any) => Number(v.id) === positiveInt(a.id));
    if (!e) return J({ ok: false, error: 'Сотрудник не найден' }, 400);
    if (e.status !== 'active' || e.admitted === false) return J({ ok: false, error: `${e.name}: сотрудник ещё не допущен к заказам` }, 409);
    assigned.push({ id: Number(e.id), name: e.name, rate_type: 'fixed', rate_value: Math.max(0, Number(a.rate_value || e.default_rate || 0)) });
  }
  const old = await orderMeta(env, n), previous: any[] = Array.isArray(old.assigned) ? old.assigned : [], now = Date.now();
  const meta = { ...old, order_number: n, assigned, assigned_at: now, assigned_by: auth.id, updated_at: new Date().toISOString() };
  meta.audit = addAudit(old.audit, { type: 'assignment', label: assigned.length ? `Назначена команда: ${assigned.map(a => a.name).join(', ')}` : 'Команда снята', at: now, user_id: auth.id });
  await saveMeta(env, meta);
  const status = assigned.length ? 'CLEANER_ASSIGNED' : (order.status === 'CLEANER_ASSIGNED' ? 'CONFIRMED' : order.status);
  await putBookingOrder(env, { ...order, status, staff_assignments: assigned, updated_at: new Date().toISOString() });

  const prevMap = new Map(previous.map(a => [Number(a.id), Number(a.rate_value || 0)])), nextIds = new Set(assigned.map(a => Number(a.id))), tasks: Promise<any>[] = [];
  for (const a of assigned) if (!prevMap.has(Number(a.id)) || prevMap.get(Number(a.id)) !== Number(a.rate_value || 0)) tasks.push(notifyAssignment(env, a, order, new URL(req.url).origin));
  for (const a of previous) if (!nextIds.has(Number(a.id))) tasks.push(sendTg(env, Number(a.id), `ℹ️ <b>Назначение снято</b>\n\nЗаказ <b>${esc(n)}</b> больше не закреплён за вами.`, new URL(req.url).origin, 'Открыть кабинет'));
  const summary = assigned.length ? `👥 <b>Команда назначена</b>\n\nЗаказ <b>${esc(n)}</b>\n${assigned.map(a => `• ${esc(a.name)} — ${money(a.rate_value)}`).join('\n')}` : `ℹ️ <b>Команда снята</b>\n\nЗаказ <b>${esc(n)}</b>`;
  tasks.push(notifyAdmins(env, summary, new URL(req.url).origin));
  ctx?.waitUntil?.(Promise.all(tasks).then(() => undefined));
  return J({ ok: true, assigned });
}

async function reminderSweep(env: Env): Promise<void> {
  const orders = await bookingOrders(env), metasData = await stateCall(env, '/ops3/order-metas').catch(() => ({ metas: [] })), map = new Map((metasData.metas || []).map((m: any) => [String(m.order_number), m]));
  const now = Date.now();
  for (const o of orders) {
    if (['COMPLETED', 'CANCELLED'].includes(String(o.status || ''))) continue;
    const ts = parseMoscow(o.date, o.time); if (!ts) continue; const diff = ts - now;
    const meta: any = map.get(String(o.order_number)) || { order_number: String(o.order_number), assigned: [], accepted: {}, confirmed: {}, started: {}, audit: [] };
    const assigned: any[] = Array.isArray(meta.assigned) ? meta.assigned : [], reminders = { ...(meta.reminders || {}) }; let changed = false;
    if (assigned.length && diff > 0 && diff <= 2 * 3600000 && !reminders.employee_120) {
      await Promise.all(assigned.map(a => sendTg(env, Number(a.id), `⏰ <b>Напоминание о заказе</b>\n\n<b>${esc(o.order_number)}</b> · ${esc(o.service_name || 'Уборка')}\nНачало: <b>${esc(o.time || '')}</b>\n📍 ${esc([o.city, o.address, o.apartment].filter(Boolean).join(', '))}\n\nПроверьте задание и подтвердите выход.`, '', 'Открыть задание'))); reminders.employee_120 = now; changed = true;
    }
    if (!assigned.length && diff > 0 && diff <= 3600000 && !reminders.no_team_60) {
      await notifyAdmins(env, `🚨 <b>Заказ без команды</b>\n\n<b>${esc(o.order_number)}</b> начнётся менее чем через час. Назначьте сотрудников.`, ''); reminders.no_team_60 = now; changed = true;
    }
    if (assigned.length && diff > 0 && diff <= 45 * 60000 && !reminders.unconfirmed_45) {
      const un = assigned.filter(a => !meta.confirmed?.[a.id]);
      if (un.length) { await notifyAdmins(env, `⚠️ <b>Не подтверждён выход</b>\n\nЗаказ <b>${esc(o.order_number)}</b> через ${Math.max(1, Math.round(diff / 60000))} мин.\nНе подтвердили: ${un.map(a => esc(a.name)).join(', ')}`, ''); reminders.unconfirmed_45 = now; changed = true; }
    }
    if (diff <= -15 * 60000 && diff > -6 * 3600000 && !Object.keys(meta.started || {}).length && String(o.status || '') !== 'IN_PROGRESS' && !reminders.late_15) {
      await notifyAdmins(env, `🚩 <b>Возможное опоздание</b>\n\nЗаказ <b>${esc(o.order_number)}</b> должен был начаться в ${esc(o.time || '')}, но начало работы не отмечено.`, ''); reminders.late_15 = now; changed = true;
    }
    if (changed) { meta.reminders = reminders; meta.updated_at = new Date().toISOString(); await saveMeta(env, meta); }
  }
}

async function notifyAssignment(env: Env, a: any, o: any, origin: string) {
  const rate = Number(a.rate_value || 0), text = `🧹 <b>Вам назначен новый заказ</b>\n\n<b>${esc(o.order_number)}</b>\n${esc(o.service_name || 'Уборка')} · ${esc(o.area || 0)} м²\n📅 ${esc(o.date || '')} · <b>${esc(o.time || '')}</b>\n📍 ${esc([o.city, o.address, o.apartment].filter(Boolean).join(', '))}${rate ? `\n💰 Ваше начисление: <b>${money(rate)}</b>` : ''}\n\nОткройте задание и нажмите «Принять».`;
  return sendTg(env, Number(a.id), text, origin, 'Открыть задание');
}

async function notifyAdmins(env: Env, text: string, origin: string): Promise<void> { await Promise.all(adminIds(env).map(id => sendTg(env, Number(id), text, origin, 'Открыть STAFF'))); }
async function sendTg(env: Env, id: number, text: string, origin: string, button: string): Promise<void> {
  if (!id) return; const payload: any = { chat_id: id, text, parse_mode: 'HTML' };
  if (origin) payload.reply_markup = { inline_keyboard: [[{ text: button, web_app: { url: `${origin}/staff` } }]] };
  await tg(env, 'sendMessage', payload).catch(() => null);
}
async function tg(env: Env, method: string, body: any) { const token = String((env as any).TELEGRAM_BOT_TOKEN || ''); if (!token) return null; const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); const x: any = await r.json().catch(() => ({})); if (!r.ok || !x.ok) throw new Error(x?.description || 'Telegram API error'); return x.result; }

async function authLaunch(req: Request, env: Env): Promise<TgUser | null> {
  const raw = req.headers.get('X-App-Launch-Token') || new URL(req.url).searchParams.get('launch') || '', token = String((env as any).TELEGRAM_BOT_TOKEN || '');
  if (!raw || !token) return null; const parts = raw.split('.'); if (parts.length !== 2) return null;
  const expected = hex(await hmac(new TextEncoder().encode(token), new TextEncoder().encode('launch:' + parts[0]))); if (!safeEq(expected, parts[1])) return null;
  try { const data = JSON.parse(decodeB64(parts[0])); if (!positiveInt(data?.id) || Number(data.exp || 0) < Math.floor(Date.now() / 1000)) return null; return data as TgUser; } catch { return null; }
}
async function signLaunch(user: TgUser, token: string) { const payload = { id: user.id, first_name: user.first_name || '', last_name: user.last_name || '', username: user.username || '', exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60 }, body = b64(new TextEncoder().encode(JSON.stringify(payload))), sig = hex(await hmac(new TextEncoder().encode(token), new TextEncoder().encode('launch:' + body))); return body + '.' + sig; }
async function hmac(key: BufferSource, data: BufferSource) { const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return new Uint8Array(await crypto.subtle.sign('HMAC', k, data)); }
function b64(a: Uint8Array) { let s = ''; a.forEach(x => s += String.fromCharCode(x)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function decodeB64(s: string) { const v = s.replace(/-/g, '+').replace(/_/g, '/'); return atob(v + '='.repeat((4 - v.length % 4) % 4)); }
function hex(a: Uint8Array) { return [...a].map(x => x.toString(16).padStart(2, '0')).join(''); }
function safeEq(a: string, b: string) { if (a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; }

async function stateCall(env: Env, path: string, method = 'GET', data?: any) { const id = (env as any).STATE.idFromName('global'), stub = (env as any).STATE.get(id), init: any = { method, headers: { 'content-type': 'application/json' } }; if (data !== undefined) init.body = JSON.stringify(data); const r = await stub.fetch('https://state.local' + path, init); return await r.json() as any; }
function bookingStub(env: Env) { return env.BOOKING_STORE?.get(env.BOOKING_STORE.idFromName(STORE_NAME)); }
async function bookingOrders(env: Env) { const r = await bookingStub(env)?.fetch('https://booking.internal/orders'); if (!r?.ok) return []; const x: any = await r.json().catch(() => ({})); return Array.isArray(x.orders) ? x.orders : []; }
async function bookingOrder(env: Env, n: string) { const list = await bookingOrders(env); return list.find((o: any) => String(o.order_number) === n) || null; }
async function putBookingOrder(env: Env, order: any) { const r = await bookingStub(env)?.fetch('https://booking.internal/order', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(order) }); if (!r?.ok) throw new Error('Не удалось обновить заказ'); const x: any = await r.json().catch(() => ({})); return x.order || order; }
async function orderMeta(env: Env, n: string) { const x = await stateCall(env, `/ops3/order-meta?number=${encodeURIComponent(n)}`); return x.meta || { order_number: n, assigned: [], accepted: {}, confirmed: {}, started: {}, audit: [] }; }
async function saveMeta(env: Env, meta: any) { return stateCall(env, '/ops3/order-meta', 'POST', meta); }
function addAudit(a: any, item: any) { const x = Array.isArray(a) ? [...a] : []; x.push(item); return x.slice(-120); }
function adminIds(env: Env) { return String((env as any).ADMIN_IDS || '').split(',').map(x => x.trim()).filter(x => /^-?\d+$/.test(x)); }
function isAdmin(env: Env, id: number) { return adminIds(env).includes(String(id)); }
function displayName(u: TgUser) { return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || `ID ${u.id}`; }
function parseMoscow(date: any, time: any) { if (!date) return 0; const t = String(time || '09:00').slice(0, 5); const n = Date.parse(`${String(date)}T${t}:00+03:00`); return Number.isFinite(n) ? n : 0; }
function positiveInt(v: any) { const n = Number(v); return Number.isSafeInteger(n) && n > 0 ? n : 0; }
function clean(v: any, max = 200) { return String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max); }
async function readBody(req: Request) { try { return await req.json(); } catch { return {}; } }
function money(v: any) { return new Intl.NumberFormat('ru-RU').format(Math.round(Number(v || 0))) + ' ₽'; }
function esc(v: any) { return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)); }
function J(data: any, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }
function html(s: string) { return new Response(s, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store, no-cache, must-revalidate', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' } }); }
