import { APP } from './app';

export interface Env {
  TELEGRAM_BOT_TOKEN: string;
  ADMIN_IDS?: string;
  WEBAPP_URL?: string;
  SETUP_SECRET?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  ALLOWED_USER_IDS?: string;
}

type TgUser = { id: number; first_name?: string; last_name?: string; username?: string };
type SessionPayload = { v: 1; uid: number; iat: number; customer: string; address: string; lat: number; lon: number; accuracy: number; nonce: string };

const API = (token: string) => `https://api.telegram.org/bot${token}`;
const MAX_FILE = 9 * 1024 * 1024;
const MAX_FILES = 20;
const MIN_PHOTOS = 2;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const appUrl = normalizeAppUrl(env.WEBAPP_URL || url.origin);
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/app')) return new Response(APP, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store, no-cache, must-revalidate', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' } });
    if (req.method === 'GET' && url.pathname === '/health') return J({ ok: true, bot: 'hcbototcet', service: 'smart-photo-reports-v3', webapp: appUrl, configured: { telegram: Boolean(env.TELEGRAM_BOT_TOKEN), admins: parseList(env.ADMIN_IDS).length > 0, setup: Boolean(env.SETUP_SECRET) }, now: new Date().toISOString() });
    if (req.method === 'GET' && url.pathname === '/setup') {
      if (!env.SETUP_SECRET || !safeEq(url.searchParams.get('key') || '', env.SETUP_SECRET)) return J({ ok: false, error: 'Unauthorized' }, 401);
      if (!env.TELEGRAM_BOT_TOKEN) return J({ ok: false, error: 'TELEGRAM_BOT_TOKEN is not configured' }, 500);
      const webhook = appUrl.replace(/\/$/, '') + '/webhook';
      const webhookBody: Record<string, unknown> = { url: webhook, drop_pending_updates: false, allowed_updates: ['message'] };
      if (env.TELEGRAM_WEBHOOK_SECRET) webhookBody.secret_token = env.TELEGRAM_WEBHOOK_SECRET;
      const [wh, menu, commands] = await Promise.all([
        tg(env.TELEGRAM_BOT_TOKEN, 'setWebhook', webhookBody),
        tg(env.TELEGRAM_BOT_TOKEN, 'setChatMenuButton', { menu_button: { type: 'web_app', text: 'Фотоотчёты', web_app: { url: appUrl } } }),
        tg(env.TELEGRAM_BOT_TOKEN, 'setMyCommands', { commands: [{ command: 'start', description: 'Открыть фотоотчёты' }, { command: 'menu', description: 'Открыть меню' }] }),
      ]);
      return J({ ok: true, webhook, webapp: appUrl, telegram: { webhook: wh, menu, commands } });
    }
    if (req.method === 'POST' && url.pathname === '/webhook') {
      if (env.TELEGRAM_WEBHOOK_SECRET) {
        const got = req.headers.get('X-Telegram-Bot-Api-Secret-Token') || '';
        if (!safeEq(got, env.TELEGRAM_WEBHOOK_SECRET)) return new Response('Unauthorized', { status: 401 });
      }
      try { await handleUpdate(await req.json(), env, appUrl); } catch (e) { console.error('Webhook error', e); }
      return new Response('OK');
    }
    if (req.method === 'POST' && url.pathname === '/api/session/start') return startSession(req, env);
    if (req.method === 'POST' && url.pathname === '/api/report') return createReport(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
    return new Response('Not found', { status: 404 });
  },
};

async function handleUpdate(update: any, env: Env, appUrl: string) {
  const message = update?.message;
  if (!message?.chat?.id) return;
  const command = String(message.text || '').trim().split('@')[0];
  if (!['/start', '/menu', '/webapp'].includes(command)) return;
  if (message.message_id) await tg(env.TELEGRAM_BOT_TOKEN, 'deleteMessage', { chat_id: message.chat.id, message_id: message.message_id }).catch(() => null);
  await send(env.TELEGRAM_BOT_TOKEN, message.chat.id, '<b>HOUSE CLEANING · КОНТРОЛЬ УБОРКИ</b>\n\nФотоотчёт с фиксацией времени, геопозиции, фотографий ДО/ПОСЛЕ и чек-листа.\n\nНажмите кнопку ниже.', { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: 'Открыть фотоотчёт', web_app: { url: appUrl } }]] }, disable_web_page_preview: true });
}

async function startSession(req: Request, env: Env): Promise<Response> {
  if (!env.TELEGRAM_BOT_TOKEN) return J({ ok: false, error: 'Бот временно не настроен.' }, 503);
  const user = await validateInitData(req.headers.get('X-Telegram-Init-Data') || '', env.TELEGRAM_BOT_TOKEN);
  if (!user) return J({ ok: false, error: 'Сессия Telegram устарела. Откройте приложение заново из бота.' }, 401);
  if (!isAllowed(user, env)) return J({ ok: false, error: 'У вас нет доступа.' }, 403);
  let body: any;
  try { body = await req.json(); } catch { return J({ ok: false, error: 'Некорректные данные старта.' }, 400); }
  const customer = clean(body.customer, 100), address = clean(body.address, 180);
  const lat = num(body.lat), lon = num(body.lon), accuracy = num(body.accuracy);
  if (!customer) return J({ ok: false, error: 'Укажите имя заказчика.' }, 400);
  if (!address) return J({ ok: false, error: 'Укажите адрес уборки.' }, 400);
  if (!validCoords(lat, lon)) return J({ ok: false, error: 'Не удалось получить геопозицию.' }, 400);
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { v: 1, uid: user.id, iat: now, customer, address, lat, lon, accuracy: Math.max(0, accuracy || 0), nonce: crypto.randomUUID() };
  const session = await signSession(payload, env.TELEGRAM_BOT_TOKEN);
  return J({ ok: true, session, started_at_unix: now, started_at_short: formatMoscowTime(new Date(now * 1000)), accuracy: payload.accuracy });
}

async function createReport(req: Request, env: Env): Promise<Response> {
  if (!env.TELEGRAM_BOT_TOKEN) return J({ ok: false, error: 'Бот временно не настроен.' }, 503);
  const user = await validateInitData(req.headers.get('X-Telegram-Init-Data') || '', env.TELEGRAM_BOT_TOKEN);
  if (!user) return J({ ok: false, error: 'Сессия Telegram устарела. Откройте приложение заново.' }, 401);
  if (!isAllowed(user, env)) return J({ ok: false, error: 'У вас нет доступа.' }, 403);
  const admins = parseList(env.ADMIN_IDS);
  if (!admins.length) return J({ ok: false, error: 'Администраторы ещё не настроены.' }, 503);
  let form: FormData;
  try { form = await req.formData(); } catch { return J({ ok: false, error: 'Не удалось прочитать отчёт.' }, 400); }
  const session = await verifySession(String(form.get('session') || ''), env.TELEGRAM_BOT_TOKEN);
  if (!session || session.uid !== user.id) return J({ ok: false, error: 'Контрольная сессия недействительна. Начните уборку заново.' }, 401);
  if (Date.now() / 1000 - session.iat > 12 * 60 * 60) return J({ ok: false, error: 'Сессия уборки истекла.' }, 400);
  const customer = clean(form.get('customer'), 100), address = clean(form.get('address'), 180);
  if (customer !== session.customer || address !== session.address) return J({ ok: false, error: 'Имя заказчика или адрес были изменены после старта.' }, 400);
  const type = clean(form.get('type'), 80) || 'Не указан', team = clean(form.get('team'), 100), comment = clean(form.get('comment'), 700);
  const checklist = String(form.get('checklist') || '').split(',').filter(Boolean);
  if (checklist.length < 5) return J({ ok: false, error: 'Подтвердите все пункты чек-листа.' }, 400);
  const before = form.getAll('before').filter(isFile), after = form.getAll('after').filter(isFile), files = [...before, ...after];
  if (before.length < MIN_PHOTOS) return J({ ok: false, error: `Добавьте минимум ${MIN_PHOTOS} фото ДО.` }, 400);
  if (after.length < MIN_PHOTOS) return J({ ok: false, error: `Добавьте минимум ${MIN_PHOTOS} фото ПОСЛЕ.` }, 400);
  if (files.length > MAX_FILES) return J({ ok: false, error: `Максимум ${MAX_FILES} фото.` }, 400);
  if (files.some(f => !f.type.startsWith('image/'))) return J({ ok: false, error: 'Разрешены только изображения.' }, 400);
  if (files.some(f => f.size > MAX_FILE)) return J({ ok: false, error: 'Одно из фото больше 9 МБ.' }, 400);
  const endLat = num(form.get('end_lat')), endLon = num(form.get('end_lon')), endAccuracy = num(form.get('end_accuracy'));
  if (!validCoords(endLat, endLon)) return J({ ok: false, error: 'Не удалось зафиксировать геопозицию при завершении.' }, 400);
  const now = Math.floor(Date.now() / 1000), durationSec = Math.max(0, now - session.iat), distanceM = Math.round(haversine(session.lat, session.lon, endLat, endLon));
  const flags: string[] = [];
  if (durationSec < 15 * 60) flags.push('очень короткое время работы');
  if (distanceM > 1000) flags.push('начало и завершение дальше 1 км друг от друга');
  if (session.accuracy > 300 || endAccuracy > 300) flags.push('низкая точность геопозиции');
  const cameraBefore = Math.max(0, Math.floor(num(form.get('camera_before')))), cameraAfter = Math.max(0, Math.floor(num(form.get('camera_after'))));
  if (cameraBefore === 0) flags.push('нет контрольного кадра ДО через кнопку камеры');
  if (cameraAfter === 0) flags.push('нет контрольного кадра ПОСЛЕ через кнопку камеры');
  const reportId = makeReportId(user.id), verification = flags.length ? 'ТРЕБУЕТ ВНИМАНИЯ' : 'ПРОВЕРКА ПРОЙДЕНА';
  const caption = [
    '<b>HOUSE CLEANING · НОВЫЙ ФОТООТЧЁТ</b>', `<b>ID:</b> <code>${esc(reportId)}</code>`, `<b>Статус:</b> ${esc(verification)}`,
    `<b>Заказчик:</b> ${esc(customer)}`, `<b>Адрес:</b> ${esc(address)}`, `<b>Тип:</b> ${esc(type)}`, team ? `<b>Бригада:</b> ${esc(team)}` : '',
    `<b>Сотрудник:</b> ${esc(displayName(user))}`, `<b>Начало:</b> ${esc(formatMoscow(new Date(session.iat * 1000)))}`, `<b>Завершение:</b> ${esc(formatMoscow(new Date(now * 1000)))}`,
    `<b>Длительность:</b> ${esc(durationText(durationSec))}`, `<b>GPS:</b> старт ±${Math.round(session.accuracy)} м, конец ±${Math.round(endAccuracy)} м`, `<b>Смещение:</b> ${distanceM} м`,
    `<b>Фото:</b> ДО ${before.length}, ПОСЛЕ ${after.length}`, `<b>Через кнопку камеры:</b> ДО ${cameraBefore}, ПОСЛЕ ${cameraAfter}`,
    flags.length ? `<b>Проверка:</b> ${esc(flags.join('; '))}` : '<b>Проверка:</b> явных несоответствий не найдено', comment ? `\n<b>Комментарий:</b>\n${esc(comment)}` : '',
  ].filter(Boolean).join('\n');
  try {
    for (const admin of admins) {
      await send(env.TELEGRAM_BOT_TOKEN, admin, caption, { parse_mode: 'HTML', disable_web_page_preview: true });
      await sendAlbums(env.TELEGRAM_BOT_TOKEN, admin, before, `ДО · ${reportId}`);
      await sendAlbums(env.TELEGRAM_BOT_TOKEN, admin, after, `ПОСЛЕ · ${reportId}`);
    }
  } catch (e) { console.error('Report delivery failed', reportId, e); return J({ ok: false, error: 'Telegram не принял часть отчёта. Попробуйте ещё раз.' }, 502); }
  return J({ ok: true, report_id: reportId, duration_sec: durationSec, duration_text: durationText(durationSec), distance_m: distanceM, flags });
}

async function signSession(payload: SessionPayload, token: string) {
  const body = base64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = bytesToHex(await hmac(new TextEncoder().encode(token), new TextEncoder().encode('session:' + body)));
  return body + '.' + sig;
}
async function verifySession(raw: string, token: string): Promise<SessionPayload | null> {
  try { const [body, sig] = raw.split('.'); if (!body || !sig) return null; const expected = bytesToHex(await hmac(new TextEncoder().encode(token), new TextEncoder().encode('session:' + body))); if (!safeEq(sig, expected)) return null; const p = JSON.parse(new TextDecoder().decode(base64UrlDecode(body))); return p?.v === 1 && p?.uid ? p as SessionPayload : null; } catch { return null; }
}
function base64Url(bytes: Uint8Array) { let s=''; bytes.forEach(b=>s+=String.fromCharCode(b)); return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function base64UrlDecode(s: string) { const x=s.replace(/-/g,'+').replace(/_/g,'/'), pad=x+'==='.slice((x.length+3)%4), bin=atob(pad), out=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i); return out; }
function isAllowed(user: TgUser, env: Env) { const allowed=parseList(env.ALLOWED_USER_IDS); return !allowed.length || allowed.includes(String(user.id)); }
function num(v: unknown) { const n=Number(v); return Number.isFinite(n)?n:0; }
function validCoords(lat:number,lon:number){return lat>=-90&&lat<=90&&lon>=-180&&lon<=180&&!(lat===0&&lon===0)}
function haversine(a:number,b:number,c:number,d:number){const R=6371000,rad=(x:number)=>x*Math.PI/180,p1=rad(a),p2=rad(c),dp=rad(c-a),dl=rad(d-b),q=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return 2*R*Math.atan2(Math.sqrt(q),Math.sqrt(1-q))}
function durationText(sec:number){const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60);return h?`${h} ч ${m} мин`:`${m} мин`}
async function sendAlbums(token:string,chatId:string,files:File[],label:string){for(let offset=0;offset<files.length;offset+=10){const part=files.slice(offset,offset+10),caption=offset?`${label} · продолжение`:label;if(part.length===1){const body=new FormData();body.append('chat_id',chatId);body.append('photo',part[0],part[0].name||'photo.jpg');body.append('caption',caption);const r=await fetch(`${API(token)}/sendPhoto`,{method:'POST',body}),d=await r.json() as any;if(!r.ok||!d?.ok)throw new Error(JSON.stringify(d));continue}const body=new FormData(),media:Array<Record<string,string>>=[];part.forEach((f,i)=>{const field=`f${offset+i}`;body.append(field,f,f.name||`${field}.jpg`);const item:Record<string,string>={type:'photo',media:`attach://${field}`};if(i===0)item.caption=caption;media.push(item)});body.append('chat_id',chatId);body.append('media',JSON.stringify(media));const r=await fetch(`${API(token)}/sendMediaGroup`,{method:'POST',body}),d=await r.json() as any;if(!r.ok||!d?.ok)throw new Error(JSON.stringify(d));}}
async function send(token:string,chatId:string|number,text:string,extra:Record<string,unknown>={}){return tg(token,'sendMessage',{chat_id:chatId,text,...extra})}
async function tg(token:string,method:string,body:Record<string,unknown>){const r=await fetch(`${API(token)}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),d=await r.json() as any;if(!r.ok||!d?.ok)throw new Error(`Telegram ${method}: ${JSON.stringify(d)}`);return d}
async function validateInitData(raw:string,token:string):Promise<TgUser|null>{if(!raw)return null;try{const p=new URLSearchParams(raw),received=p.get('hash')||'',auth=Number(p.get('auth_date')||0);if(!received||!auth||Math.abs(Date.now()/1000-auth)>6*60*60)return null;p.delete('hash');const entries:Array<[string,string]>=[];p.forEach((v,k)=>entries.push([k,v]));const check=entries.sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n');const secret=await hmac(new TextEncoder().encode('WebAppData'),new TextEncoder().encode(token)),calc=bytesToHex(await hmac(secret,new TextEncoder().encode(check)));if(!safeEq(calc,received.toLowerCase()))return null;const u=JSON.parse(p.get('user')||'null');return u?.id?u as TgUser:null}catch{return null}}
async function hmac(keyBytes:Uint8Array,data:Uint8Array){const key=await crypto.subtle.importKey('raw',keyBytes,{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',key,data))}
function bytesToHex(bytes:Uint8Array){return Array.from(bytes).map(x=>x.toString(16).padStart(2,'0')).join('')}
function safeEq(a:string,b:string){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
function makeReportId(userId:number){const d=new Date(),rnd=crypto.randomUUID().slice(0,6).toUpperCase();return `HC-${d.getUTCFullYear().toString().slice(-2)}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}-${String(userId).slice(-4)}-${rnd}`}
function normalizeAppUrl(v:string){return v.replace(/\/$/,'')+'/'}
function clean(v:unknown,max:number){return String(v||'').trim().replace(/\s+/g,' ').slice(0,max)}
function isFile(v:FormDataEntryValue):v is File{return v instanceof File&&v.size>0}
function parseList(v?:string){return String(v||'').split(',').map(x=>x.trim()).filter(Boolean)}
function displayName(u:TgUser){return [u.first_name,u.last_name].filter(Boolean).join(' ')||u.username||`ID ${u.id}`}
function formatMoscow(d:Date){return new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d)}
function formatMoscowTime(d:Date){return new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit'}).format(d)}
function esc(s:string){return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
function J(x:unknown,status=200){return new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}