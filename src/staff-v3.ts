import staffV2, { AppState as BaseAppState } from './staff-v2';
import type { Env as BaseEnv } from './staff-v2';
import { STAFF_V3_APP } from './staff-v3-ui';

export type Env = BaseEnv & { BOOKING_STORE: DurableObjectNamespace };
export class AppState extends BaseAppState {
  async fetch(req: Request): Promise<Response> {
    const u = new URL(req.url);

    if (u.pathname === '/ops3/employees' && req.method === 'GET') {
      const baseResponse = await super.fetch(new Request('https://state.local/dashboard/employees'));
      const baseData: any = await baseResponse.json().catch(() => ({ employees: [] }));
      const baseEmployees: any[] = Array.isArray(baseData?.employees) ? baseData.employees : [];
      const out = [];
      for (const e of baseEmployees) out.push(await this.enrichEmployee(e));
      out.sort((a: any, b: any) => String(a.name || '').localeCompare(String(b.name || ''), 'ru'));
      return J({ ok: true, employees: out });
    }

    if (u.pathname === '/ops3/employee' && req.method === 'GET') {
      const id = positiveInt(u.searchParams.get('id'));
      if (!id) return J({ ok: false, error: 'Некорректный сотрудник' }, 400);
      const base = await this.state.storage.get<any>(`employee:${id}`);
      if (!base) return J({ ok: false, error: 'Сотрудник не найден' }, 404);
      return J({ ok: true, employee: await this.enrichEmployee(base) });
    }

    if (u.pathname === '/ops3/employee' && req.method === 'POST') {
      let x: any; try { x = await req.json(); } catch { return J({ ok: false, error: 'Некорректные данные' }, 400); }
      const id = positiveInt(x.id || x.telegram_id), name = clean(x.name, 120);
      if (!id || !name) return J({ ok: false, error: 'Нужны имя и Telegram ID' }, 400);
      const oldBase = await this.state.storage.get<any>(`employee:${id}`);
      const base = {
        ...(oldBase || {}), id, name,
        role: clean(x.role || oldBase?.role || 'Клинер', 80),
        status: ['active', 'blocked'].includes(String(x.status || oldBase?.status)) ? String(x.status || oldBase?.status) : 'active',
        addedAt: Number(oldBase?.addedAt || Date.now()),
      };
      await this.state.storage.put(`employee:${id}`, base);
      const old = await this.state.storage.get<any>(`ops3:employee:${id}`) || {};
      const profile = {
        ...old,
        id,
        telegram_id: id,
        name,
        role: clean(x.role || old.role || base.role || 'Клинер', 80),
        phone: clean(x.phone ?? old.phone ?? '', 60),
        username: clean(x.username ?? old.username ?? '', 80).replace(/^@/, ''),
        birth_date: clean(x.birth_date ?? old.birth_date ?? '', 20),
        citizenship: clean(x.citizenship ?? old.citizenship ?? '', 80),
        hired_at: old.hired_at || new Date().toISOString(),
        skills: Array.isArray(x.skills) ? x.skills.map((v: any) => clean(v, 80)).filter(Boolean).slice(0, 20) : (old.skills || ['Генеральная', 'Поддерживающая']),
        rating: finite(x.rating, old.rating, 5),
        punctuality: finite(x.punctuality, old.punctuality, 100),
        default_rate: Math.max(0, finite(x.default_rate, old.default_rate, 0)),
        admitted: typeof x.admitted === 'boolean' ? x.admitted : (typeof old.admitted === 'boolean' ? old.admitted : false),
        regulations_accepted: !!old.regulations_accepted,
        training_lessons: Array.isArray(old.training_lessons) ? old.training_lessons : [],
        training_score: Number(old.training_score || 0),
        onboarding_stage: clean(x.onboarding_stage || old.onboarding_stage || 'regulations', 40),
        source: old.source || clean(x.source || 'staff', 30),
        updated_at: new Date().toISOString(),
      };
      await this.state.storage.put(`ops3:employee:${id}`, profile);
      return J({ ok: true, employee: { ...base, ...profile } });
    }

    if (u.pathname === '/ops3/order-meta' && req.method === 'GET') {
      const n = clean(u.searchParams.get('number'), 120);
      return J({ ok: true, meta: n ? (await this.state.storage.get<any>(`ops3:order:${n}`) || emptyMeta(n)) : null });
    }
    if (u.pathname === '/ops3/order-meta' && req.method === 'POST') {
      let x: any; try { x = await req.json(); } catch { return J({ ok: false }, 400); }
      const n = clean(x.order_number, 120); if (!n) return J({ ok: false }, 400);
      const old = await this.state.storage.get<any>(`ops3:order:${n}`) || emptyMeta(n);
      const next = { ...old, ...x, order_number: n, updated_at: new Date().toISOString() };
      if (!Array.isArray(next.audit)) next.audit = [];
      await this.state.storage.put(`ops3:order:${n}`, next);
      return J({ ok: true, meta: next });
    }
    if (u.pathname === '/ops3/order-metas' && req.method === 'GET') {
      const rows = await this.state.storage.list<any>({ prefix: 'ops3:order:' });
      return J({ ok: true, metas: [...rows.values()] });
    }

    if (u.pathname === '/ops3/candidates' && req.method === 'GET') {
      const rows = await this.state.storage.list<any>({ prefix: 'ops3:candidate:' });
      const candidates = [...rows.values()].sort((a, b) => Number(b.created_at_ms || 0) - Number(a.created_at_ms || 0));
      return J({ ok: true, candidates });
    }
    if (u.pathname === '/ops3/candidate' && req.method === 'POST') {
      let x: any; try { x = await req.json(); } catch { return J({ ok: false, error: 'Некорректные данные' }, 400); }
      if (x.action === 'create') {
        const name = clean(x.name, 120); if (!name) return J({ ok: false, error: 'Укажите ФИО' }, 400);
        const id = 'CAND-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
        const c = { id, name, telegram_id: positiveInt(x.telegram_id), phone: clean(x.phone, 60), experience: clean(x.experience, 500), citizenship: clean(x.citizenship, 80), district: clean(x.district, 100), stage: 'new', created_at: new Date().toISOString(), created_at_ms: Date.now(), updated_at: new Date().toISOString() };
        await this.state.storage.put(`ops3:candidate:${id}`, c); return J({ ok: true, candidate: c });
      }
      const id = clean(x.id, 100), stage = clean(x.stage, 30), allowed = ['new', 'review', 'interview', 'accepted', 'onboarding', 'training', 'admitted'];
      const c = await this.state.storage.get<any>(`ops3:candidate:${id}`); if (!c) return J({ ok: false, error: 'Кандидат не найден' }, 404);
      if (!allowed.includes(stage)) return J({ ok: false, error: 'Неизвестный этап' }, 400);
      if (stage === 'admitted') {
        if (!c.telegram_id) return J({ ok: false, error: 'Сначала укажите Telegram ID' }, 400);
        const p = await this.state.storage.get<any>(`ops3:employee:${c.telegram_id}`);
        if (!p?.admitted || Number(p.training_score || 0) < 80) return J({ ok: false, error: 'Сначала сотрудник должен пройти регламент и тест минимум на 80%' }, 409);
      }
      const next = { ...c, stage, updated_at: new Date().toISOString() }; await this.state.storage.put(`ops3:candidate:${id}`, next);
      if (['onboarding', 'training'].includes(stage) && c.telegram_id) {
        const oldBase = await this.state.storage.get<any>(`employee:${c.telegram_id}`);
        await this.state.storage.put(`employee:${c.telegram_id}`, { ...(oldBase || {}), id: c.telegram_id, name: c.name, role: oldBase?.role || 'Клинер', status: 'active', addedAt: oldBase?.addedAt || Date.now() });
        const oldP = await this.state.storage.get<any>(`ops3:employee:${c.telegram_id}`) || {};
        await this.state.storage.put(`ops3:employee:${c.telegram_id}`, { ...oldP, id: c.telegram_id, telegram_id: c.telegram_id, name: c.name, role: oldP.role || 'Клинер', phone: c.phone || oldP.phone || '', admitted: false, regulations_accepted: !!oldP.regulations_accepted, training_lessons: oldP.training_lessons || [], training_score: Number(oldP.training_score || 0), onboarding_stage: oldP.regulations_accepted ? 'training' : 'regulations', source: 'candidate', hired_at: oldP.hired_at || new Date().toISOString(), skills: oldP.skills || ['Поддерживающая'], rating: oldP.rating || 5, punctuality: oldP.punctuality || 100, updated_at: new Date().toISOString() });
      }
      return J({ ok: true, candidate: next });
    }

    if (u.pathname === '/ops3/training' && req.method === 'POST') {
      let x: any; try { x = await req.json(); } catch { return J({ ok: false }, 400); }
      const id = positiveInt(x.id), action = clean(x.action, 30); if (!id) return J({ ok: false }, 400);
      const base = await this.state.storage.get<any>(`employee:${id}`); if (!base) return J({ ok: false, error: 'Сотрудник не найден' }, 404);
      const old = await this.state.storage.get<any>(`ops3:employee:${id}`) || await this.legacyProfile(base);
      const next: any = { ...old, id, telegram_id: id, name: old.name || base.name, updated_at: new Date().toISOString() };
      if (action === 'ack') { next.regulations_accepted = true; next.onboarding_stage = 'training'; }
      else if (action === 'lesson') {
        const lesson = clean(x.lesson, 30), allowed = ['rules', 'general', 'safety', 'chemistry', 'photos', 'client'];
        if (!allowed.includes(lesson)) return J({ ok: false, error: 'Неизвестный урок' }, 400);
        const set = new Set(Array.isArray(next.training_lessons) ? next.training_lessons : []); set.add(lesson); next.training_lessons = [...set];
      } else if (action === 'quiz') {
        const lessons = Array.isArray(next.training_lessons) ? next.training_lessons : [];
        if (!next.regulations_accepted || lessons.length < 6) return J({ ok: false, error: 'Сначала завершите регламент и все уроки' }, 409);
        const score = Math.max(0, Math.min(100, Number(x.score || 0))); next.training_score = score; next.admitted = score >= 80; next.onboarding_stage = score >= 80 ? 'admitted' : 'training';
      } else return J({ ok: false, error: 'Неизвестное действие' }, 400);
      await this.state.storage.put(`ops3:employee:${id}`, next);
      if (next.admitted) {
        const candidates = await this.state.storage.list<any>({ prefix: 'ops3:candidate:' });
        for (const [k, c] of candidates.entries()) if (Number(c.telegram_id) === id) await this.state.storage.put(k, { ...c, stage: 'admitted', updated_at: new Date().toISOString() });
      }
      return J({ ok: true, employee: { ...base, ...next } });
    }

    if (u.pathname === '/ops3/finance' && req.method === 'GET') {
      const rows = await this.state.storage.list<any>({ prefix: 'ops3:finance:' });
      return J({ ok: true, entries: [...rows.values()].sort((a, b) => Number(b.at || 0) - Number(a.at || 0)) });
    }
    if (u.pathname === '/ops3/finance' && req.method === 'POST') {
      let x: any; try { x = await req.json(); } catch { return J({ ok: false }, 400); }
      const employeeId = positiveInt(x.employee_id), kind = clean(x.kind, 20), amount = Number(x.amount);
      if (!employeeId || !['payout', 'adjustment'].includes(kind) || !Number.isFinite(amount) || (kind === 'payout' && amount <= 0)) return J({ ok: false, error: 'Проверьте сумму' }, 400);
      const entry = { id: crypto.randomUUID(), employee_id: employeeId, kind, amount, comment: clean(x.comment, 500), admin_id: positiveInt(x.admin_id), at: Date.now(), created_at: new Date().toISOString() };
      await this.state.storage.put(`ops3:finance:${String(entry.at).padStart(13, '0')}:${entry.id}`, entry);
      return J({ ok: true, entry });
    }

    return super.fetch(req);
  }

  private async enrichEmployee(base: any) {
    const id = positiveInt(base?.id || base?.telegram_id), stored = id ? await this.state.storage.get<any>(`ops3:employee:${id}`) : null;
    const profile = stored || await this.legacyProfile(base);
    return { ...base, ...profile, id, telegram_id: id, status: base?.status || profile?.status || 'active' };
  }
  private async legacyProfile(base: any) {
    const id = positiveInt(base?.id || base?.telegram_id);
    return { id, telegram_id: id, name: clean(base?.name || '', 120), role: clean(base?.role || 'Клинер', 80), phone: '', username: '', skills: ['Генеральная', 'Поддерживающая'], rating: 5, punctuality: 100, default_rate: 0, admitted: String(base?.status || 'active') === 'active', regulations_accepted: true, training_lessons: ['rules', 'general', 'safety', 'chemistry', 'photos', 'client'], training_score: 100, onboarding_stage: 'legacy_admitted', source: 'legacy', hired_at: new Date(Number(base?.addedAt || Date.now())).toISOString() };
  }
}

const BUILD = 'staff-v3-operations-2026-09-16-a';
const STORE_NAME = 'house-cleaning-app-v1';
const LESSONS = ['rules', 'general', 'safety', 'chemistry', 'photos', 'client'];

export default {
  async fetch(req: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    const u = new URL(req.url);

    if (req.method === 'GET' && u.pathname === '/__hc_staff_version') return J({ ok: true, build: BUILD, staff: true, live_orders: true, source: 'bugalter3/APP_STORE' });
    if (req.method === 'GET' && ['/staff', '/staff/', '/admin'].includes(u.pathname)) return html(STAFF_V3_APP);

    if (req.method === 'POST' && u.pathname === '/api/after') {
      const auth = await session(req, env, ctx); if (!auth.ok) return auth.response;
      const n = clean(auth.data?.job?.booking_order_number, 120);
      if (n) {
        const meta = await orderMeta(env, n), checklist = Array.isArray(meta.checklist) ? meta.checklist : [];
        if (checklist.length && checklist.some((v: any) => !v.done)) return J({ ok: false, error: 'Сначала завершите весь чек-лист уборки.' }, 409);
      }
      const response = await staffV2.fetch(req, env, ctx as any);
      if (response.ok && n) ctx?.waitUntil?.(appendAudit(env, n, 'photos_done', 'Фото ПОСЛЕ отправлены, уборка завершена', auth.userId));
      return response;
    }

    if (req.method === 'GET' && u.pathname === '/api/admin/jobs') {
      const response = await staffV2.fetch(req, env, ctx as any); if (!response.ok) return response;
      const data: any = await response.json().catch(() => ({}));
      const jobs = await Promise.all((data.jobs || []).map(async (j: any) => {
        const n = clean(j.booking_order_number, 120); if (!n) return j;
        const meta = await orderMeta(env, n); return { ...j, staff_verified: !!meta.verified_at };
      }));
      return J({ ...data, jobs });
    }
    if (req.method === 'GET' && u.pathname === '/api/admin/job') {
      const response = await staffV2.fetch(req, env, ctx as any); if (!response.ok) return response;
      const data: any = await response.json().catch(() => ({})), n = clean(data?.job?.booking_order_number, 120);
      if (n) { const meta = await orderMeta(env, n); data.job.staff_verified = !!meta.verified_at; }
      return J(data);
    }

    if (u.pathname.startsWith('/api/staff/')) return staffApi(req, env, ctx);
    return staffV2.fetch(req, env, ctx as any);
  },
};

async function staffApi(req: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  const u = new URL(req.url), auth = await session(req, env, ctx); if (!auth.ok) return auth.response;
  const admin = !!auth.data?.admin, userId = auth.userId;

  if (u.pathname === '/api/staff/me' && req.method === 'GET') {
    if (admin && !auth.data?.employee) return J({ ok: true, admin: true, profile: { id: userId, name: 'Руководитель', admitted: true, role: 'Руководитель' } });
    const r = await stateCall(env, `/ops3/employee?id=${userId}`); return J({ ok: true, admin, profile: r.employee || null });
  }

  if (u.pathname === '/api/staff/orders' && req.method === 'GET') {
    const [orders, metas] = await Promise.all([bookingOrders(env), allMetas(env)]), map = new Map(metas.map((m: any) => [String(m.order_number), m]));
    let out = orders.filter((o: any) => !o?.is_test).map((o: any) => ({ ...o, staff: map.get(String(o.order_number)) || emptyMeta(String(o.order_number)) }));
    if (!admin) out = out.filter((o: any) => (o.staff.assigned || []).some((a: any) => Number(a.id) === userId));
    out.sort((a: any, b: any) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    return J({ ok: true, orders: out });
  }

  if (u.pathname === '/api/staff/order' && req.method === 'GET') {
    const n = clean(u.searchParams.get('number'), 120), o = await bookingOrder(env, n); if (!o) return J({ ok: false, error: 'Заказ не найден' }, 404);
    const meta = await orderMeta(env, n);
    if (!admin && !(meta.assigned || []).some((a: any) => Number(a.id) === userId)) return J({ ok: false, error: 'Нет доступа к этому заказу' }, 403);
    return J({ ok: true, order: { ...o, staff: meta } });
  }

  if (u.pathname === '/api/staff/employees' && req.method === 'GET') {
    if (!admin) return J({ ok: false, error: 'Только для руководителя' }, 403);
    return proxyJson(await stateCallRaw(env, '/ops3/employees'));
  }

  if (u.pathname === '/api/staff/order/assign' && req.method === 'POST') {
    if (!admin) return J({ ok: false, error: 'Только для руководителя' }, 403);
    const x = await body(req), n = clean(x.order_number, 120), order = await bookingOrder(env, n); if (!order) return J({ ok: false, error: 'Заказ не найден' }, 404);
    const requested = Array.isArray(x.assigned) ? x.assigned : [], empData = await stateCall(env, '/ops3/employees'), employees: any[] = empData.employees || [], assigned = [];
    for (const a of requested) {
      const e = employees.find((v: any) => Number(v.id) === positiveInt(a.id));
      if (!e) return J({ ok: false, error: 'Сотрудник не найден' }, 400);
      if (e.status !== 'active' || e.admitted === false) return J({ ok: false, error: `${e.name}: сотрудник ещё не допущен к заказам` }, 409);
      assigned.push({ id: Number(e.id), name: e.name, rate_type: 'fixed', rate_value: Math.max(0, Number(a.rate_value || e.default_rate || 0)) });
    }
    const old = await orderMeta(env, n), now = Date.now(), next = { ...old, order_number: n, assigned, assigned_at: now, assigned_by: userId, updated_at: new Date().toISOString() };
    next.audit = addAudit(old.audit, { type: 'assignment', label: assigned.length ? `Назначена команда: ${assigned.map((a: any) => a.name).join(', ')}` : 'Команда снята', at: now, user_id: userId });
    await saveMeta(env, next);
    const newStatus = assigned.length ? 'CLEANER_ASSIGNED' : (order.status === 'CLEANER_ASSIGNED' ? 'CONFIRMED' : order.status);
    await putBookingOrder(env, { ...order, status: newStatus, staff_assignments: assigned, updated_at: new Date().toISOString() });
    for (const a of assigned) void notifyEmployee(env, a.id, order, new URL(req.url).origin).catch(() => null);
    return J({ ok: true, assigned });
  }

  if (u.pathname === '/api/staff/order/note' && req.method === 'POST') {
    if (!admin) return J({ ok: false, error: 'Только для руководителя' }, 403);
    const x = await body(req), n = clean(x.order_number, 120), old = await orderMeta(env, n), now = Date.now();
    const next = { ...old, internal_note: clean(x.note, 3000), updated_at: new Date().toISOString(), audit: addAudit(old.audit, { type: 'note', label: 'Обновлена внутренняя заметка', at: now, user_id: userId }) };
    await saveMeta(env, next); return J({ ok: true, meta: next });
  }

  if (u.pathname === '/api/staff/order/action' && req.method === 'POST') {
    if (admin) return J({ ok: false, error: 'Действие предназначено для сотрудника' }, 403);
    const x = await body(req), n = clean(x.order_number, 120), action = clean(x.action, 30), order = await bookingOrder(env, n); if (!order) return J({ ok: false, error: 'Заказ не найден' }, 404);
    const meta = await orderMeta(env, n); if (!(meta.assigned || []).some((a: any) => Number(a.id) === userId)) return J({ ok: false, error: 'Вы не назначены на этот заказ' }, 403);
    const er = await stateCall(env, `/ops3/employee?id=${userId}`), employee = er.employee; if (!employee || employee.admitted === false) return J({ ok: false, error: 'Нет допуска к заказам' }, 403);
    const now = Date.now();
    if (action === 'accept') { meta.accepted = { ...(meta.accepted || {}), [userId]: now }; meta.audit = addAudit(meta.audit, { type: 'accepted', label: `${employee.name} принял задание`, at: now, user_id: userId }); }
    else if (action === 'confirm') { if (!meta.accepted?.[userId]) return J({ ok: false, error: 'Сначала примите задание' }, 409); meta.confirmed = { ...(meta.confirmed || {}), [userId]: now }; meta.audit = addAudit(meta.audit, { type: 'confirmed', label: `${employee.name} подтвердил выход`, at: now, user_id: userId }); }
    else if (action === 'start') {
      if (!meta.confirmed?.[userId]) return J({ ok: false, error: 'Сначала подтвердите выход' }, 409);
      const active = auth.data?.job; if (active && active.stage !== 'done' && String(active.booking_order_number || '') !== n) return J({ ok: false, error: 'Сначала завершите текущую уборку' }, 409);
      meta.started = { ...(meta.started || {}), [userId]: now }; if (!Array.isArray(meta.checklist) || !meta.checklist.length) meta.checklist = checklistFor(order);
      meta.audit = addAudit(meta.audit, { type: 'started', label: `${employee.name} начал уборку`, at: now, user_id: userId });
      const address = [order.city, order.address, order.apartment ? `кв./офис ${order.apartment}` : ''].filter(Boolean).join(', ');
      const job = { id: `ORDER-${n}-${userId}`, booking_order_number: n, userId, employeeName: employee.name, employeeUsername: employee.username || '', customer: order.customer_name || 'Клиент', address, type: order.service_name || 'Уборка', stage: 'started', startedAt: now, start_location: { lat: 0, lon: 0, accuracy: 0 }, startPlace: address, appUrl: `${new URL(req.url).origin}/staff` };
      await stateCall(env, '/job', 'POST', { job }); await putBookingOrder(env, { ...order, status: 'IN_PROGRESS', updated_at: new Date().toISOString() });
    } else return J({ ok: false, error: 'Неизвестное действие' }, 400);
    meta.updated_at = new Date().toISOString(); await saveMeta(env, meta); return J({ ok: true, meta });
  }

  if (u.pathname === '/api/staff/checklist' && req.method === 'POST') {
    if (admin) return J({ ok: false, error: 'Только для сотрудника' }, 403);
    const x = await body(req), n = clean(x.order_number, 120), meta = await orderMeta(env, n); if (!(meta.assigned || []).some((a: any) => Number(a.id) === userId)) return J({ ok: false, error: 'Нет доступа' }, 403);
    const i = Number(x.index); if (!Number.isInteger(i) || i < 0 || i >= (meta.checklist || []).length) return J({ ok: false, error: 'Некорректный пункт' }, 400);
    meta.checklist[i] = { ...meta.checklist[i], done: !!x.done, at: Date.now(), employee_id: userId }; meta.updated_at = new Date().toISOString(); await saveMeta(env, meta); return J({ ok: true, checklist: meta.checklist });
  }

  if (u.pathname === '/api/staff/order/verify' && req.method === 'POST') {
    if (!admin) return J({ ok: false, error: 'Только для руководителя' }, 403);
    const x = await body(req), n = clean(x.order_number, 120), order = await bookingOrder(env, n); if (!order) return J({ ok: false, error: 'Заказ не найден' }, 404);
    const meta = await orderMeta(env, n), now = Date.now(); meta.verified_at = now; meta.verified_by = userId; meta.audit = addAudit(meta.audit, { type: 'verified', label: 'Руководитель принял работу. Начисления зафиксированы', at: now, user_id: userId }); meta.updated_at = new Date().toISOString(); await saveMeta(env, meta);
    await putBookingOrder(env, { ...order, status: 'COMPLETED', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    return J({ ok: true });
  }

  if (u.pathname === '/api/staff/candidates') {
    if (!admin) return J({ ok: false, error: 'Только для руководителя' }, 403);
    if (req.method === 'GET') return proxyJson(await stateCallRaw(env, '/ops3/candidates'));
    if (req.method === 'POST') { const x = await body(req); return proxyJson(await stateCallRaw(env, '/ops3/candidate', 'POST', x)); }
  }

  if (u.pathname === '/api/staff/training' && req.method === 'POST') {
    if (admin && !auth.data?.employee) return J({ ok: false, error: 'Нет профиля сотрудника' }, 403);
    const x = await body(req); return proxyJson(await stateCallRaw(env, '/ops3/training', 'POST', { ...x, id: userId }));
  }

  if (u.pathname === '/api/staff/finance' && req.method === 'GET') {
    if (!admin) return J({ ok: false, error: 'Только для руководителя' }, 403);
    const [orders, metas, employeesData, financeData] = await Promise.all([bookingOrders(env), allMetas(env), stateCall(env, '/ops3/employees'), stateCall(env, '/ops3/finance')]);
    const orderMap = new Map(orders.map((o: any) => [String(o.order_number), o])), acc = new Map<number, any>();
    for (const e of employeesData.employees || []) acc.set(Number(e.id), { id: Number(e.id), name: e.name, accrued: 0, paid: 0, adjustments: 0, balance: 0 });
    for (const m of metas) {
      const o: any = orderMap.get(String(m.order_number)); if (!o || !(m.verified_at || o.status === 'COMPLETED')) continue;
      for (const a of m.assigned || []) { if (!acc.has(Number(a.id))) acc.set(Number(a.id), { id: Number(a.id), name: a.name || `ID ${a.id}`, accrued: 0, paid: 0, adjustments: 0, balance: 0 }); acc.get(Number(a.id)).accrued += Math.max(0, Number(a.rate_value || 0)); }
    }
    for (const f of financeData.entries || []) { const r = acc.get(Number(f.employee_id)); if (!r) continue; if (f.kind === 'payout') r.paid += Number(f.amount || 0); else r.adjustments += Number(f.amount || 0); }
    const list = [...acc.values()].map(r => ({ ...r, balance: r.accrued + r.adjustments - r.paid }));
    return J({ ok: true, employees: list, total_accrued: list.reduce((s, r) => s + r.accrued + r.adjustments, 0), total_paid: list.reduce((s, r) => s + r.paid, 0), total_balance: list.reduce((s, r) => s + r.balance, 0), entries: financeData.entries || [] });
  }

  if (u.pathname === '/api/staff/finance/entry' && req.method === 'POST') {
    if (!admin) return J({ ok: false, error: 'Только для руководителя' }, 403);
    const x = await body(req); return proxyJson(await stateCallRaw(env, '/ops3/finance', 'POST', { ...x, admin_id: userId }));
  }

  return J({ ok: false, error: 'Not found' }, 404);
}

async function session(req: Request, env: Env, ctx?: ExecutionContext) {
  const u = new URL(req.url); u.pathname = '/api/state'; u.search = '';
  const r = await staffV2.fetch(new Request(u.toString(), { method: 'GET', headers: req.headers }), env, ctx as any);
  let data: any; try { data = await r.clone().json(); } catch { return { ok: false, response: r, data: null, userId: 0 }; }
  const id = positiveInt(data?.employee?.id || data?.user?.id || userIdFromHeaders(req));
  return { ok: r.ok && data?.ok !== false && (data?.admin || id), response: r.ok ? J(data) : r, data, userId: id || positiveInt(data?.admin_id) || userIdFromHeaders(req) };
}
function userIdFromHeaders(req: Request) { const launch = req.headers.get('X-App-Launch-Token') || ''; try { const p = launch.split('.')[0]; if (p) { const s = p.replace(/-/g, '+').replace(/_/g, '/'), json = JSON.parse(atob(s + '='.repeat((4 - s.length % 4) % 4))); return positiveInt(json?.id); } const init = req.headers.get('X-Telegram-Init-Data') || ''; return positiveInt(JSON.parse(new URLSearchParams(init).get('user') || '{}')?.id); } catch { return 0; } }

function bookingStub(env: Env) { if (!env.BOOKING_STORE) return null; return env.BOOKING_STORE.get(env.BOOKING_STORE.idFromName(STORE_NAME)); }
async function bookingOrders(env: Env) { const r = await bookingStub(env)?.fetch('https://booking.internal/orders'); if (!r?.ok) return []; const x: any = await r.json().catch(() => ({})); return Array.isArray(x.orders) ? x.orders : []; }
async function bookingOrder(env: Env, n: string) { if (!n) return null; const list = await bookingOrders(env); return list.find((o: any) => String(o.order_number) === n) || null; }
async function putBookingOrder(env: Env, order: any) { const r = await bookingStub(env)?.fetch('https://booking.internal/order', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(order) }); if (!r?.ok) throw new Error('Не удалось обновить заказ в клиентской системе'); const x: any = await r.json().catch(() => ({})); return x.order || order; }

async function orderMeta(env: Env, n: string) { const x = await stateCall(env, `/ops3/order-meta?number=${encodeURIComponent(n)}`); return x.meta || emptyMeta(n); }
async function allMetas(env: Env) { const x = await stateCall(env, '/ops3/order-metas'); return x.metas || []; }
async function saveMeta(env: Env, meta: any) { return stateCall(env, '/ops3/order-meta', 'POST', meta); }
async function appendAudit(env: Env, n: string, type: string, label: string, userId: number) { const m = await orderMeta(env, n); m.audit = addAudit(m.audit, { type, label, at: Date.now(), user_id: userId }); m.updated_at = new Date().toISOString(); await saveMeta(env, m); }
function addAudit(a: any, item: any) { const x = Array.isArray(a) ? [...a] : []; x.push(item); return x.slice(-120); }
function emptyMeta(n: string) { return { order_number: n, assigned: [], accepted: {}, confirmed: {}, started: {}, checklist: [], internal_note: '', audit: [], verified_at: 0, updated_at: '' }; }
function checklistFor(o: any) { const base = ['Прихожая', 'Кухня', 'Санузел', 'Комнаты']; const text = `${o?.service_name || ''} ${(o?.addon_names || []).join(' ')}`.toLowerCase(); if (text.includes('окн')) base.push('Окна'); if (text.includes('холод')) base.push('Холодильник'); if (text.includes('балкон')) base.push('Балкон'); base.push('Финальная проверка'); return base.map(label => ({ label, done: false })); }

async function notifyEmployee(env: Env, id: number, o: any, origin: string) { const token = String((env as any).TELEGRAM_BOT_TOKEN || ''); if (!token) return; const text = `🧹 <b>Новое задание HOUSE CLEANING</b>\n\n<b>${esc(o.order_number)}</b>\n${esc(o.service_name || 'Уборка')} · ${esc(o.area || 0)} м²\n📅 ${esc(o.date || '')} · ${esc(o.time || '')}\n📍 ${esc([o.city, o.address, o.apartment].filter(Boolean).join(', '))}`; await tg(token, 'sendMessage', { chat_id: id, text, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: 'Открыть задание', web_app: { url: `${origin}/staff` } }]] } }); }
async function tg(token: string, method: string, payload: any) { const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }); const x: any = await r.json().catch(() => ({})); if (!r.ok || !x.ok) throw new Error(x?.description || 'Telegram API error'); return x.result; }

async function stateCall(env: Env, path: string, method = 'GET', body?: unknown) { const r = await stateCallRaw(env, path, method, body); return await r.json() as any; }
async function stateCallRaw(env: Env, path: string, method = 'GET', body?: unknown) { const id = env.STATE.idFromName('global'), stub = env.STATE.get(id), init: RequestInit = { method, headers: { 'content-type': 'application/json' } }; if (body !== undefined) init.body = JSON.stringify(body); return stub.fetch('https://state.local' + path, init); }
async function body(req: Request) { try { return await req.json() as any; } catch { return {}; } }
function proxyJson(r: Response) { return new Response(r.body, { status: r.status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }
function positiveInt(v: any) { const n = Number(v); return Number.isSafeInteger(n) && n > 0 ? n : 0; }
function clean(v: any, max = 200) { return String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max); }
function finite(v: any, old: any, fallback: number) { const n = Number(v); if (Number.isFinite(n)) return n; const o = Number(old); return Number.isFinite(o) ? o : fallback; }
function esc(v: any) { return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)); }
function html(s: string) { return new Response(s, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store, no-cache, must-revalidate', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'permissions-policy': 'camera=(self), geolocation=(self)' } }); }
function J(data: any, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } }); }
