import { APP } from './app-v5';

export interface Env {
  TELEGRAM_BOT_TOKEN: string;
  ADMIN_IDS?: string;
  WEBAPP_URL?: string;
  SETUP_SECRET?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  STATE: DurableObjectNamespace;
}

type TgUser = { id: number; first_name?: string; last_name?: string; username?: string };
type Location = { lat: number; lon: number; accuracy: number };
type Employee = { id: number; name: string; role: string; status: 'active' | 'blocked'; addedAt: number };
type Job = {
  id: string; userId: number; employeeName: string; customer: string; address: string; type: string; team: string;
  stage: 'started' | 'before_sent' | 'done'; startedAt: number; started_at_short: string; start_location: Location;
  beforeSentAt?: number; defects?: string; defectTypes?: string; beforeCount?: number; defectPhotoCount?: number;
  finishedAt?: number; end_location?: Location; afterCount?: number; reportId?: string; reminded?: boolean; appUrl: string;
};

const API = (token: string) => `https://api.telegram.org/bot${token}`;
const MAX_FILE = 9 * 1024 * 1024;
const MAX_FILES = 20;
const MIN_PHOTOS = 2;
const GPS_MAX_ACCURACY = 150;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const appUrl = normalizeAppUrl(env.WEBAPP_URL || url.origin);

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/app')) {
      return new Response(APP, { headers: securityHeaders('text/html; charset=utf-8') });
    }
    if (req.method === 'GET' && url.pathname === '/health') {
      return J({ ok: true, bot: 'hcbototcet', service: 'house-cleaning-control-v5', storage: 'durable-object', webapp: appUrl, configured: { telegram: !!env.TELEGRAM_BOT_TOKEN, admins: adminIds(env).length > 0, state: !!env.STATE }, now: new Date().toISOString() });
    }
    if (req.method === 'GET' && url.pathname === '/setup') return setup(url, env, appUrl);

    if (req.method === 'POST' && url.pathname === '/webhook') {
      if (env.TELEGRAM_WEBHOOK_SECRET) {
        const got = req.headers.get('X-Telegram-Bot-Api-Secret-Token') || '';
        if (!safeEq(got, env.TELEGRAM_WEBHOOK_SECRET)) return new Response('Unauthorized', { status: 401 });
      }
      try { await handleUpdate(await req.json(), env, appUrl); } catch (e) { console.error('webhook', e); }
      return new Response('OK');
    }

    if (url.pathname.startsWith('/api/')) {
      const user = await requireUser(req, env);
      if (!user) return J({ ok: false, error: 'Сессия Telegram устарела. Откройте приложение заново из бота.' }, 401);
      const access = await getAccess(env, user.id);
      if (!access.allowed) return J({ ok: false, error: 'Доступ разрешён только сотрудникам House Cleaning.' }, 403);

      if (req.method === 'GET' && url.pathname === '/api/state') {
        const job = await getJob(env, user.id);
        return J({ ok: true, employee: access.employee || { id: user.id, name: displayName(user), role: access.admin ? 'admin' : 'employee' }, admin: access.admin, job });
      }
      if (req.method === 'POST' && url.pathname === '/api/session/start') return startJob(req, env, user, access.employee, appUrl);
      if (req.method === 'POST' && url.pathname === '/api/before') return sendBeforeStage(req, env, user, appUrl);
      if (req.method === 'POST' && url.pathname === '/api/after') return sendAfterStage(req, env, user, appUrl);
      if (req.method === 'POST' && url.pathname === '/api/problem') return reportProblem(req, env, user);
    }

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: securityHeaders() });
    return new Response('Not found', { status: 404 });
  },
};

async function setup(url: URL, env: Env, appUrl: string) {
  if (!env.SETUP_SECRET || !safeEq(url.searchParams.get('key') || '', env.SETUP_SECRET)) return J({ ok: false, error: 'Unauthorized' }, 401);
  if (!env.TELEGRAM_BOT_TOKEN) return J({ ok: false, error: 'TELEGRAM_BOT_TOKEN is not configured' }, 500);
  const webhook = appUrl.replace(/\/$/, '') + '/webhook';
  const webhookBody: Record<string, unknown> = { url: webhook, drop_pending_updates: false, allowed_updates: ['message', 'callback_query'] };
  if (env.TELEGRAM_WEBHOOK_SECRET) webhookBody.secret_token = env.TELEGRAM_WEBHOOK_SECRET;
  const [wh, menu, commands] = await Promise.all([
    tg(env.TELEGRAM_BOT_TOKEN, 'setWebhook', webhookBody),
    tg(env.TELEGRAM_BOT_TOKEN, 'setChatMenuButton', { menu_button: { type: 'web_app', text: 'Фотоотчёт', web_app: { url: appUrl } } }),
    tg(env.TELEGRAM_BOT_TOKEN, 'setMyCommands', { commands: [
      { command: 'start', description: 'Открыть рабочий бот' }, { command: 'rules', description: 'Правила фотоотчётов' }, { command: 'myid', description: 'Мой Telegram ID' }, { command: 'admin', description: 'Панель администратора' },
    ] }),
  ]);
  return J({ ok: true, webhook, webapp: appUrl, telegram: { webhook: wh, menu, commands } });
}

async function handleUpdate(update: any, env: Env, appUrl: string) {
  const q = update?.callback_query;
  if (q?.id && q?.message?.chat?.id) {
    await tg(env.TELEGRAM_BOT_TOKEN, 'answerCallbackQuery', { callback_query_id: q.id }).catch(() => null);
    const qUser: TgUser = q.from;
    if (q.data === 'rules') return sendRules(env, q.message.chat.id, (await getAccess(env, qUser.id)).allowed || isAdmin(env, qUser.id), appUrl);
    if (q.data === 'admin' && isAdmin(env, qUser.id)) return sendAdminHelp(env, q.message.chat.id);
    return;
  }
  const m = update?.message;
  if (!m?.chat?.id) return;
  const user: TgUser = m.from || { id: Number(m.chat.id) };
  const text = String(m.text || '').trim();
  const cmd = text.split(/\s+/)[0].split('@')[0].toLowerCase();
  const admin = isAdmin(env, user.id);
  const access = await getAccess(env, user.id);

  if (cmd === '/myid') return send(env.TELEGRAM_BOT_TOKEN, m.chat.id, `Ваш Telegram ID: <code>${user.id}</code>`, { parse_mode: 'HTML' });
  if (cmd === '/rules') return sendRules(env, m.chat.id, access.allowed || admin, appUrl);

  if (admin && cmd === '/admin') return sendAdminHelp(env, m.chat.id);
  if (admin && cmd === '/employees') return sendEmployees(env, m.chat.id);
  if (admin && cmd === '/add') return adminAdd(text, env, m.chat.id);
  if (admin && cmd === '/remove') return adminAction(text, env, m.chat.id, 'remove');
  if (admin && cmd === '/block') return adminAction(text, env, m.chat.id, 'block');
  if (admin && cmd === '/unblock') return adminAction(text, env, m.chat.id, 'unblock');

  if (cmd !== '/start' && cmd !== '/menu' && cmd !== '/webapp') return;

  if (!access.allowed && !admin) {
    return send(env.TELEGRAM_BOT_TOKEN, m.chat.id,
      `🔒 <b>Доступ закрыт</b>\n\nЭтот бот предназначен только для сотрудников House Cleaning.\n\nВаш Telegram ID: <code>${user.id}</code>\nПередайте его администратору для добавления в список сотрудников.`,
      { parse_mode: 'HTML' });
  }

  const job = await getJob(env, user.id);
  const status = !job ? 'Нет активной уборки' : job.stage === 'started' ? 'Нужно отправить фото ДО' : job.stage === 'before_sent' ? 'Фото ДО принято — обязательно отправьте ПОСЛЕ' : 'Последний отчёт завершён';
  const rules = rulesText();
  const kb: any = { inline_keyboard: [[{ text: job?.stage === 'before_sent' ? '📷 Отправить фото ПОСЛЕ' : '🧹 Открыть фотоотчёт', web_app: { url: appUrl } }], [{ text: '📋 Правила', callback_data: 'rules' }]] };
  if (admin) kb.inline_keyboard.push([{ text: '👥 Управление сотрудниками', callback_data: 'admin' }]);
  await send(env.TELEGRAM_BOT_TOKEN, m.chat.id,
    `🏠 <b>HOUSE CLEANING · РАБОЧИЙ БОТ</b>\n\n👤 ${esc(access.employee?.name || displayName(user))}\n📌 <b>Статус:</b> ${esc(status)}\n\n${rules}\n\nНажмите кнопку ниже и выполняйте этапы по порядку.`,
    { parse_mode: 'HTML', reply_markup: kb, disable_web_page_preview: true });
}

function rulesText() {
  return `📋 <b>ПРАВИЛА ФОТООТЧЁТА</b>\n1️⃣ На объекте нажмите «Начать уборку».\n2️⃣ До уборки отправьте минимум 2 фото и зафиксируйте дефекты.\n3️⃣ После уборки обязательно отправьте минимум 2 фото результата.\n4️⃣ Фото должны быть сделаны на реальном объекте и соответствовать этапу.\n5️⃣ GPS и время фиксируются автоматически.\n\n⚠️ <b>Ответственность по внутренним правилам компании:</b>\nПервый пропуск обязательного фотоотчёта — штраф.\nПовторный пропуск — расторжение договора.`;
}

async function sendRules(env: Env, chatId: string | number, allowed: boolean, appUrl: string) {
  const tail = allowed ? '\n\n✅ Выполняйте отчёт через кнопку ниже.' : '\n\n🔒 Для работы требуется доступ сотрудника.';
  return send(env.TELEGRAM_BOT_TOKEN, chatId, rulesText() + tail, { parse_mode: 'HTML', reply_markup: allowed ? { inline_keyboard: [[{ text: '🧹 Открыть фотоотчёт', web_app: { url: appUrl } }]] } : undefined });
}

async function sendAdminHelp(env: Env, chatId: string | number) {
  return send(env.TELEGRAM_BOT_TOKEN, chatId,
    `👑 <b>АДМИНИСТРАТОР · СОТРУДНИКИ</b>\n\nДобавить:\n<code>/add TELEGRAM_ID Имя Фамилия</code>\n\nЗаблокировать:\n<code>/block TELEGRAM_ID</code>\n\nРазблокировать:\n<code>/unblock TELEGRAM_ID</code>\n\nУдалить:\n<code>/remove TELEGRAM_ID</code>\n\nСписок:\n<code>/employees</code>\n\nСотрудник может узнать свой ID командой /myid.`,
    { parse_mode: 'HTML' });
}

async function adminAdd(text: string, env: Env, chatId: string | number) {
  const parts = text.split(/\s+/);
  const id = Number(parts[1]);
  const name = parts.slice(2).join(' ').trim();
  if (!Number.isSafeInteger(id) || !name) return send(env.TELEGRAM_BOT_TOKEN, chatId, 'Формат: <code>/add TELEGRAM_ID Имя Фамилия</code>', { parse_mode: 'HTML' });
  const employee: Employee = { id, name: name.slice(0, 100), role: 'cleaner', status: 'active', addedAt: Date.now() };
  await stateCall(env, '/employee', 'POST', { action: 'upsert', employee });
  await send(env.TELEGRAM_BOT_TOKEN, chatId, `✅ Сотрудник добавлен:\n<b>${esc(employee.name)}</b> · <code>${id}</code>`, { parse_mode: 'HTML' });
  await send(env.TELEGRAM_BOT_TOKEN, id, `✅ <b>Доступ к House Cleaning открыт</b>\n\nВы добавлены как сотрудник. Отправьте /start и ознакомьтесь с правилами.`, { parse_mode: 'HTML' }).catch(() => null);
}

async function adminAction(text: string, env: Env, chatId: string | number, action: 'remove' | 'block' | 'unblock') {
  const id = Number(text.split(/\s+/)[1]);
  if (!Number.isSafeInteger(id)) return send(env.TELEGRAM_BOT_TOKEN, chatId, `Формат: <code>/${action} TELEGRAM_ID</code>`, { parse_mode: 'HTML' });
  const data = await stateCall(env, '/employee', 'POST', { action, id });
  if (!data.ok) return send(env.TELEGRAM_BOT_TOKEN, chatId, 'Сотрудник не найден.');
  const label = action === 'remove' ? 'удалён' : action === 'block' ? 'заблокирован' : 'разблокирован';
  await send(env.TELEGRAM_BOT_TOKEN, chatId, `✅ Сотрудник ${label}: <code>${id}</code>`, { parse_mode: 'HTML' });
}

async function sendEmployees(env: Env, chatId: string | number) {
  const data = await stateCall(env, '/employees');
  const list: Employee[] = data.employees || [];
  if (!list.length) return send(env.TELEGRAM_BOT_TOKEN, chatId, 'Список сотрудников пока пуст.');
  const lines = list.map((e, i) => `${i + 1}. ${e.status === 'active' ? '🟢' : '🔴'} <b>${esc(e.name)}</b> · <code>${e.id}</code>`);
  return send(env.TELEGRAM_BOT_TOKEN, chatId, `👥 <b>СОТРУДНИКИ (${list.length})</b>\n\n${lines.join('\n')}`, { parse_mode: 'HTML' });
}

async function startJob(req: Request, env: Env, user: TgUser, employee: Employee | null, appUrl: string): Promise<Response> {
  let body: any; try { body = await req.json(); } catch { return J({ ok: false, error: 'Некорректные данные.' }, 400); }
  const customer = clean(body.customer, 100), address = clean(body.address, 180), type = clean(body.type, 80) || 'Не указан', team = clean(body.team, 100);
  const loc = parseLocation(body.location);
  if (!customer) return J({ ok: false, error: 'Укажите имя заказчика.' }, 400);
  if (!address) return J({ ok: false, error: 'Укажите адрес уборки.' }, 400);
  if (!loc) return J({ ok: false, error: 'Не удалось получить координаты.' }, 400);
  if (loc.accuracy > GPS_MAX_ACCURACY) return J({ ok: false, error: `GPS недостаточно точный: ±${Math.round(loc.accuracy)} м.` }, 400);
  const current = await getJob(env, user.id);
  if (current && current.stage !== 'done') return J({ ok: false, error: 'У вас уже есть активная уборка. Завершите её.' }, 409);
  const now = Math.floor(Date.now() / 1000);
  const job: Job = { id: 'HCJ-' + crypto.randomUUID(), userId: user.id, employeeName: employee?.name || displayName(user), customer, address, type, team, stage: 'started', startedAt: now, started_at_short: formatTime(new Date(now * 1000)), start_location: loc, appUrl };
  await stateCall(env, '/job/start', 'POST', { job });
  return J({ ok: true, job });
}

async function sendBeforeStage(req: Request, env: Env, user: TgUser, appUrl: string): Promise<Response> {
  if (!adminIds(env).length) return J({ ok: false, error: 'Администратор ещё не настроен.' }, 503);
  let form: FormData; try { form = await req.formData(); } catch { return J({ ok: false, error: 'Не удалось прочитать фотографии.' }, 400); }
  const jobId = clean(form.get('job_id'), 80);
  const job = await getJob(env, user.id);
  if (!job || job.id !== jobId) return J({ ok: false, error: 'Активная уборка не найдена.' }, 404);
  if (job.stage !== 'started') return J({ ok: false, error: 'Этап ДО уже отправлен.' }, 409);
  const before = form.getAll('before').filter(isFile), defects = form.getAll('defects').filter(isFile);
  const all = [...before, ...defects];
  if (before.length < MIN_PHOTOS) return J({ ok: false, error: `Добавьте минимум ${MIN_PHOTOS} фото ДО.` }, 400);
  const fileError = validateFiles(all); if (fileError) return J({ ok: false, error: fileError }, 400);
  const noDefects = String(form.get('no_defects')) === '1';
  const defectNote = clean(form.get('defect_note'), 500), defectTypes = clean(form.get('defect_types'), 300);
  if (!noDefects && !defectNote && !defectTypes && !defects.length) return J({ ok: false, error: 'Отметьте «дефектов нет» или укажите дефект.' }, 400);
  const defectText = noDefects ? 'Не обнаружены' : [defectTypes, defectNote].filter(Boolean).join(' · ') || 'Зафиксированы на фото';
  const gps = `${job.start_location.lat.toFixed(6)}, ${job.start_location.lon.toFixed(6)} (±${Math.round(job.start_location.accuracy)} м)`;
  const text = `🟡 <b>ЭТАП ДО · УБОРКА НАЧАТА</b>\n\n🆔 <code>${esc(job.id)}</code>\n👤 <b>Заказчик:</b> ${esc(job.customer)}\n📍 <b>Адрес:</b> ${esc(job.address)}\n🧽 <b>Тип:</b> ${esc(job.type)}\n👥 <b>Бригада:</b> ${esc(job.team || 'не указана')}\n🧑‍🔧 <b>Клинер:</b> ${esc(job.employeeName)}\n🕐 <b>Начало:</b> ${esc(formatMoscow(new Date(job.startedAt * 1000)))}\n🌍 <b>Координаты:</b> <code>${esc(gps)}</code>\n📷 <b>Фото ДО:</b> ${before.length}\n⚠️ <b>Дефекты:</b> ${esc(defectText)}`;
  try {
    for (const admin of adminIds(env)) {
      await send(env.TELEGRAM_BOT_TOKEN, admin, text, { parse_mode: 'HTML', disable_web_page_preview: true });
      await sendLocation(env.TELEGRAM_BOT_TOKEN, admin, job.start_location.lat, job.start_location.lon);
      await sendAlbums(env.TELEGRAM_BOT_TOKEN, admin, before, `📷 ДО · ${job.customer}`);
      if (defects.length) await sendAlbums(env.TELEGRAM_BOT_TOKEN, admin, defects, `⚠️ ДЕФЕКТЫ · ${job.customer}`);
    }
  } catch (e) { console.error('before delivery', e); return J({ ok: false, error: 'Не удалось доставить этап ДО администратору. Повторите отправку.' }, 502); }
  const beforeSentAt = Math.floor(Date.now() / 1000);
  const updated = await stateCall(env, '/job/before', 'POST', { uid: user.id, jobId: job.id, beforeSentAt, defects: defectText, defectTypes, beforeCount: before.length, defectPhotoCount: defects.length });
  const newJob: Job = updated.job;
  await send(env.TELEGRAM_BOT_TOKEN, user.id,
    `✅ <b>ФОТО ДО ПРИНЯТО</b>\n\nФото ДО и дефекты отправлены руководителю.\n\n🧹 Выполните уборку.\n📷 <b>После окончания обязательно отправьте фото ПОСЛЕ.</b>\n\nНе закрывайте отчёт до завершения второго этапа.`,
    { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '📷 Отправить фото ПОСЛЕ', web_app: { url: appUrl } }]] } }).catch(() => null);
  return J({ ok: true, job: newJob });
}

async function sendAfterStage(req: Request, env: Env, user: TgUser, appUrl: string): Promise<Response> {
  if (!adminIds(env).length) return J({ ok: false, error: 'Администратор ещё не настроен.' }, 503);
  let form: FormData; try { form = await req.formData(); } catch { return J({ ok: false, error: 'Не удалось прочитать фотографии.' }, 400); }
  const jobId = clean(form.get('job_id'), 80), job = await getJob(env, user.id);
  if (!job || job.id !== jobId) return J({ ok: false, error: 'Активная уборка не найдена.' }, 404);
  if (job.stage !== 'before_sent') return J({ ok: false, error: job.stage === 'done' ? 'Отчёт уже завершён.' : 'Сначала отправьте этап ДО.' }, 409);
  const after = form.getAll('after').filter(isFile);
  if (after.length < MIN_PHOTOS) return J({ ok: false, error: `Добавьте минимум ${MIN_PHOTOS} фото ПОСЛЕ.` }, 400);
  const fileError = validateFiles(after); if (fileError) return J({ ok: false, error: fileError }, 400);
  const end: Location = { lat: num(form.get('end_lat')), lon: num(form.get('end_lon')), accuracy: num(form.get('end_accuracy')) };
  if (!validCoords(end.lat, end.lon)) return J({ ok: false, error: 'Не удалось получить финальные координаты.' }, 400);
  if (end.accuracy > GPS_MAX_ACCURACY) return J({ ok: false, error: `GPS завершения недостаточно точный: ±${Math.round(end.accuracy)} м.` }, 400);
  const clientNote = clean(form.get('client_note'), 400), comment = clean(form.get('comment'), 700);
  const finish = Math.floor(Date.now() / 1000), duration = finish - job.startedAt, distance = Math.round(haversine(job.start_location.lat, job.start_location.lon, end.lat, end.lon));
  const flags: string[] = [];
  if (duration < 15 * 60) flags.push('очень короткое время уборки');
  if (distance > 1000) flags.push('точка завершения дальше 1 км от старта');
  if (job.start_location.accuracy > 100 || end.accuracy > 100) flags.push('GPS средней точности');
  const reportId = makeReportId(user.id), status = flags.length ? '⚠️ ТРЕБУЕТ ПРОВЕРКИ' : '✅ ПРОВЕРКА ПРОЙДЕНА';
  const text = `🟢 <b>ЭТАП ПОСЛЕ · УБОРКА ЗАВЕРШЕНА</b>\n\n🆔 <code>${esc(reportId)}</code>\n${status}\n\n👤 <b>Заказчик:</b> ${esc(job.customer)}\n📍 <b>Адрес:</b> ${esc(job.address)}\n🧑‍🔧 <b>Клинер:</b> ${esc(job.employeeName)}\n🕐 <b>Начало:</b> ${esc(formatMoscow(new Date(job.startedAt * 1000)))}\n🏁 <b>Завершение:</b> ${esc(formatMoscow(new Date(finish * 1000)))}\n⏱ <b>Длительность:</b> ${esc(durationText(duration))}\n📏 <b>Смещение GPS:</b> ${distance} м\n🌍 <b>Финиш:</b> <code>${end.lat.toFixed(6)}, ${end.lon.toFixed(6)} (±${Math.round(end.accuracy)} м)</code>\n📷 <b>Фото:</b> ДО ${job.beforeCount || 0} · ПОСЛЕ ${after.length}\n⚠️ <b>Дефекты ДО:</b> ${esc(job.defects || 'не указаны')}${clientNote ? `\n💬 <b>Заказчик:</b> ${esc(clientNote)}` : ''}${comment ? `\n📝 <b>Комментарий клинера:</b> ${esc(comment)}` : ''}${flags.length ? `\n\n🔎 <b>Обратить внимание:</b> ${esc(flags.join('; '))}` : ''}`;
  try {
    for (const admin of adminIds(env)) {
      await send(env.TELEGRAM_BOT_TOKEN, admin, text, { parse_mode: 'HTML', disable_web_page_preview: true });
      await sendLocation(env.TELEGRAM_BOT_TOKEN, admin, end.lat, end.lon);
      await sendAlbums(env.TELEGRAM_BOT_TOKEN, admin, after, `✅ ПОСЛЕ · ${job.customer}`);
    }
  } catch (e) { console.error('after delivery', e); return J({ ok: false, error: 'Не удалось доставить финальный отчёт. Повторите отправку.' }, 502); }
  const updated = await stateCall(env, '/job/after', 'POST', { uid: user.id, jobId: job.id, finishedAt: finish, end_location: end, afterCount: after.length, reportId });
  await send(env.TELEGRAM_BOT_TOKEN, user.id, `✅ <b>ОТЧЁТ ЗАВЕРШЁН</b>\n\nФото ПОСЛЕ приняты.\nНомер отчёта: <code>${esc(reportId)}</code>\n\nСпасибо. Уборка закрыта.`, { parse_mode: 'HTML' }).catch(() => null);
  return J({ ok: true, job: updated.job, report_id: reportId, flags, distance_m: distance, duration_sec: duration });
}

async function reportProblem(req: Request, env: Env, user: TgUser) {
  let body: any = {}; try { body = await req.json(); } catch {}
  const job = await getJob(env, user.id), text = clean(body.text, 500) || 'Проблема не описана';
  for (const admin of adminIds(env)) await send(env.TELEGRAM_BOT_TOKEN, admin, `🆘 <b>ПРОБЛЕМА У СОТРУДНИКА</b>\n\n🧑‍🔧 ${esc(job?.employeeName || displayName(user))}\n🆔 <code>${user.id}</code>\n${job ? `📍 ${esc(job.address)}\n` : ''}💬 ${esc(text)}`, { parse_mode: 'HTML' }).catch(() => null);
  return J({ ok: true });
}

async function requireUser(req: Request, env: Env) { return validateInitData(req.headers.get('X-Telegram-Init-Data') || '', env.TELEGRAM_BOT_TOKEN); }
async function getAccess(env: Env, uid: number) {
  if (isAdmin(env, uid)) return { allowed: true, admin: true, employee: null as Employee | null };
  const data = await stateCall(env, '/access?uid=' + uid);
  return { allowed: !!data.allowed, admin: false, employee: data.employee || null as Employee | null };
}
async function getJob(env: Env, uid: number): Promise<Job | null> { const data = await stateCall(env, '/job?uid=' + uid); return data.job || null; }

async function stateCall(env: Env, path: string, method = 'GET', body?: unknown): Promise<any> {
  const id = env.STATE.idFromName('house-cleaning-v5');
  const stub = env.STATE.get(id);
  const init: RequestInit = { method, headers: { 'content-type': 'application/json' } };
  if (body !== undefined) init.body = JSON.stringify(body);
  const r = await stub.fetch('https://state' + path, init);
  return r.json();
}

export class AppState {
  constructor(private state: DurableObjectState, private env: Env) {}
  async fetch(req: Request): Promise<Response> {
    const u = new URL(req.url);
    if (req.method === 'GET' && u.pathname === '/access') {
      const uid = Number(u.searchParams.get('uid')); const employee = await this.state.storage.get<Employee>('employee:' + uid);
      return J({ ok: true, allowed: employee?.status === 'active', employee: employee || null });
    }
    if (req.method === 'GET' && u.pathname === '/employees') {
      const map = await this.state.storage.list<Employee>({ prefix: 'employee:' });
      return J({ ok: true, employees: [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru')) });
    }
    if (req.method === 'POST' && u.pathname === '/employee') {
      const b = await req.json() as any; const key = 'employee:' + Number(b.id || b.employee?.id);
      if (b.action === 'upsert') { await this.state.storage.put(key, b.employee); return J({ ok: true, employee: b.employee }); }
      const e = await this.state.storage.get<Employee>(key); if (!e) return J({ ok: false });
      if (b.action === 'remove') { await this.state.storage.delete(key); return J({ ok: true }); }
      if (b.action === 'block' || b.action === 'unblock') { e.status = b.action === 'block' ? 'blocked' : 'active'; await this.state.storage.put(key, e); return J({ ok: true, employee: e }); }
      return J({ ok: false }, 400);
    }
    if (req.method === 'GET' && u.pathname === '/job') {
      const uid = Number(u.searchParams.get('uid')); return J({ ok: true, job: await this.state.storage.get<Job>('job:' + uid) || null });
    }
    if (req.method === 'POST' && u.pathname === '/job/start') {
      const b = await req.json() as any, job: Job = b.job; await this.state.storage.put('job:' + job.userId, job); return J({ ok: true, job });
    }
    if (req.method === 'POST' && u.pathname === '/job/before') {
      const b = await req.json() as any, key = 'job:' + b.uid, job = await this.state.storage.get<Job>(key);
      if (!job || job.id !== b.jobId || job.stage !== 'started') return J({ ok: false }, 409);
      Object.assign(job, { stage: 'before_sent', beforeSentAt: b.beforeSentAt, defects: b.defects, defectTypes: b.defectTypes, beforeCount: b.beforeCount, defectPhotoCount: b.defectPhotoCount, reminded: false });
      await this.state.storage.put(key, job); await this.scheduleReminder(); return J({ ok: true, job });
    }
    if (req.method === 'POST' && u.pathname === '/job/after') {
      const b = await req.json() as any, key = 'job:' + b.uid, job = await this.state.storage.get<Job>(key);
      if (!job || job.id !== b.jobId || job.stage !== 'before_sent') return J({ ok: false }, 409);
      Object.assign(job, { stage: 'done', finishedAt: b.finishedAt, end_location: b.end_location, afterCount: b.afterCount, reportId: b.reportId });
      await this.state.storage.put(key, job); await this.scheduleReminder(); return J({ ok: true, job });
    }
    return J({ ok: false }, 404);
  }
  async alarm() {
    const now = Math.floor(Date.now() / 1000), map = await this.state.storage.list<Job>({ prefix: 'job:' });
    for (const [key, job] of map.entries()) {
      if (job.stage === 'before_sent' && !job.reminded && job.beforeSentAt && now >= job.beforeSentAt + 4 * 60 * 60) {
        await send(this.env.TELEGRAM_BOT_TOKEN, job.userId, `⏰ <b>НАПОМИНАНИЕ</b>\n\nВы отправили фото ДО по адресу:\n📍 ${esc(job.address)}\n\nПосле окончания уборки обязательно отправьте фотографии ПОСЛЕ.`, { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '📷 Отправить фото ПОСЛЕ', web_app: { url: job.appUrl } }]] } }).catch(() => null);
        for (const admin of adminIds(this.env)) await send(this.env.TELEGRAM_BOT_TOKEN, admin, `⚠️ <b>НЕ ЗАВЕРШЁН ФОТООТЧЁТ</b>\n\n🧑‍🔧 ${esc(job.employeeName)}\n📍 ${esc(job.address)}\nФото ДО отправлены более 4 часов назад, фото ПОСЛЕ ещё нет.`, { parse_mode: 'HTML' }).catch(() => null);
        job.reminded = true; await this.state.storage.put(key, job);
      }
    }
    await this.scheduleReminder();
  }
  private async scheduleReminder() {
    const map = await this.state.storage.list<Job>({ prefix: 'job:' }); let next = Infinity;
    for (const job of map.values()) if (job.stage === 'before_sent' && !job.reminded && job.beforeSentAt) next = Math.min(next, (job.beforeSentAt + 4 * 60 * 60) * 1000);
    if (Number.isFinite(next)) await this.state.storage.setAlarm(Math.max(Date.now() + 1000, next)); else await this.state.storage.deleteAlarm();
  }
}

function validateFiles(files: File[]) {
  if (files.length > MAX_FILES) return `Максимум ${MAX_FILES} фотографий.`;
  if (files.some(f => !f.type.startsWith('image/'))) return 'Разрешены только изображения.';
  if (files.some(f => f.size > MAX_FILE)) return 'Одно из фото больше 9 МБ.';
  return '';
}
async function sendAlbums(token: string, chatId: string, files: File[], label: string) {
  for (let offset = 0; offset < files.length; offset += 10) {
    const part = files.slice(offset, offset + 10), caption = offset ? label + ' · продолжение' : label;
    if (part.length === 1) { const f = new FormData(); f.append('chat_id', chatId); f.append('photo', part[0], part[0].name || 'photo.jpg'); f.append('caption', caption); const r = await fetch(`${API(token)}/sendPhoto`, { method: 'POST', body: f }); const d = await r.json() as any; if (!r.ok || !d.ok) throw new Error(JSON.stringify(d)); continue; }
    const f = new FormData(), media: any[] = []; part.forEach((file, i) => { const field = 'f' + (offset + i); f.append(field, file, file.name || field + '.jpg'); media.push({ type: 'photo', media: 'attach://' + field, ...(i === 0 ? { caption } : {}) }); }); f.append('chat_id', chatId); f.append('media', JSON.stringify(media)); const r = await fetch(`${API(token)}/sendMediaGroup`, { method: 'POST', body: f }); const d = await r.json() as any; if (!r.ok || !d.ok) throw new Error(JSON.stringify(d));
  }
}
async function sendLocation(token: string, chatId: string, lat: number, lon: number) { return tg(token, 'sendLocation', { chat_id: chatId, latitude: lat, longitude: lon, horizontal_accuracy: 50 }).catch(() => null); }
async function send(token: string, chatId: string | number, text: string, extra: Record<string, unknown> = {}) { return tg(token, 'sendMessage', { chat_id: chatId, text, ...extra }); }
async function tg(token: string, method: string, body: Record<string, unknown>) { const r = await fetch(`${API(token)}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); const d = await r.json() as any; if (!r.ok || !d.ok) throw new Error(`Telegram ${method}: ${JSON.stringify(d)}`); return d; }

async function validateInitData(raw: string, token: string): Promise<TgUser | null> {
  if (!raw || !token) return null;
  try { const p = new URLSearchParams(raw), hash = p.get('hash') || '', auth = Number(p.get('auth_date') || 0); if (!hash || !auth || Math.abs(Date.now() / 1000 - auth) > 6 * 60 * 60) return null; p.delete('hash'); const entries: [string,string][] = []; p.forEach((v,k)=>entries.push([k,v])); const check = entries.sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n'); const secret = await hmac(new TextEncoder().encode('WebAppData'), new TextEncoder().encode(token)); const got = bytesToHex(await hmac(secret, new TextEncoder().encode(check))); if (!safeEq(got, hash.toLowerCase())) return null; const u = JSON.parse(p.get('user') || 'null'); return u?.id ? u as TgUser : null; } catch { return null; }
}
async function hmac(keyBytes: Uint8Array, data: Uint8Array) { const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return new Uint8Array(await crypto.subtle.sign('HMAC', key, data)); }
function bytesToHex(x: Uint8Array) { return [...x].map(b=>b.toString(16).padStart(2,'0')).join(''); }
function safeEq(a: string, b: string) { if (a.length !== b.length) return false; let x=0; for(let i=0;i<a.length;i++) x |= a.charCodeAt(i)^b.charCodeAt(i); return x===0; }
function adminIds(env: Env) { return String(env.ADMIN_IDS || '').split(',').map(x=>x.trim()).filter(Boolean); }
function isAdmin(env: Env, id: number) { return adminIds(env).includes(String(id)); }
function clean(v: unknown, max: number) { return String(v || '').trim().replace(/\s+/g,' ').slice(0,max); }
function num(v: unknown) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function parseLocation(v: any): Location | null { const lat=num(v?.lat),lon=num(v?.lon),accuracy=Math.max(0,num(v?.accuracy)); return validCoords(lat,lon)?{lat,lon,accuracy}:null; }
function validCoords(lat:number,lon:number){return lat>=-90&&lat<=90&&lon>=-180&&lon<=180&&(lat!==0||lon!==0)}
function isFile(v: FormDataEntryValue): v is File { return v instanceof File && v.size > 0; }
function displayName(u:TgUser){return [u.first_name,u.last_name].filter(Boolean).join(' ')||u.username||`ID ${u.id}`}
function esc(s:string){return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
function normalizeAppUrl(s:string){return s.replace(/\/$/,'')+'/'}
function formatMoscow(d:Date){return new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d)}
function formatTime(d:Date){return new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit'}).format(d)}
function durationText(sec:number){const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60);return h?`${h} ч ${m} мин`:`${m} мин`}
function makeReportId(uid:number){const d=new Date(),day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'2-digit',month:'2-digit',day:'2-digit'}).format(d).replace(/-/g,'');return `HC-${day}-${String(uid).slice(-4)}-${crypto.randomUUID().slice(0,6).toUpperCase()}`}
function haversine(a:number,b:number,c:number,d:number){const R=6371000,r=Math.PI/180,dLat=(c-a)*r,dLon=(d-b)*r,x=Math.sin(dLat/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin(dLon/2)**2;return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
function securityHeaders(type?:string){const h:Record<string,string>={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','permissions-policy':'geolocation=(self), camera=(self)'};if(type)h['content-type']=type;return h}
function J(data:any,status=200){return new Response(JSON.stringify(data),{status,headers:{...securityHeaders('application/json; charset=utf-8')}})}
