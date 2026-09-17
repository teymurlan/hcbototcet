import staff from './staff-clients';
import type { Env } from './staff-clients';
import type { Env as HumanOrdersEnv } from './staff-human-orders';

export { AppState } from './staff-clients';
export type { Env } from './staff-clients';

// Keep the established human-orders layer explicit in the entrypoint contract while
// the client database extends it through staff-clients.
type _HumanOrdersChainContract = HumanOrdersEnv;

const CLIENT_ENTRY_FIX = String.raw`<script>
(function(){
  var accessState=null,clientSummary=null,patchQueued=false,lateTimer=0;
  var rawFetch=window.fetch.bind(window);
  function tg(){return window.Telegram&&window.Telegram.WebApp}
  function headers(){var t=tg();return {'X-App-Launch-Token':new URLSearchParams(location.search).get('launch')||'','X-Telegram-Init-Data':t&&t.initData||''}}
  async function api(path){var r=await rawFetch(path,{headers:headers(),cache:'no-store'}),x=await r.json().catch(function(){return{error:'Ошибка сервера'}});if(!r.ok||x.ok===false)throw Error(x.error||'Ошибка');return x}
  function moreScreenVisible(){
    var heads=document.querySelectorAll('.section-title h2');
    for(var i=0;i<heads.length;i++)if(String(heads[i].textContent||'').trim()==='Ещё')return true;
    var more=document.querySelector('#nav button[data-n="more"]');
    return !!(more&&more.classList.contains('on'));
  }
  function summaryText(x){
    var rows=Array.isArray(x&&x.clients)?x.clients:[],subs=0,review=0;
    rows.forEach(function(c){var ss=Array.isArray(c.subscription_snapshots)?c.subscription_snapshots:[];subs+=ss.length;if(c.needs_review||ss.some(function(s){return s&&s.needs_review}))review++});
    return rows.length+' клиентов · '+subs+' абонементов'+(review?' · '+review+' проверить':'');
  }
  function ensureCard(){
    var main=document.getElementById('main');if(!main)return null;
    var b=document.getElementById('hcClientsEntry');
    if(!b){
      b=document.createElement('button');b.type='button';b.id='hcClientsEntry';b.className='hc-clients-entry';
      b.innerHTML='<span><strong>Клиенты и абонементы</strong><span id="hcClientsEntryMeta">База клиентов HOUSE CLEANING</span></span><i>›</i>';
      var admin=document.getElementById('hcAdminAccessCard');if(admin&&admin.parentNode===main)main.insertBefore(b,admin);else main.appendChild(b);
    }
    return b;
  }
  async function patch(){
    if(!moreScreenVisible())return;
    if(!accessState){try{accessState=await api('/api/state')}catch(e){return}}
    if(!accessState||!accessState.owner)return;
    var card=ensureCard();if(!card)return;
    if(!clientSummary){try{clientSummary=await api('/api/staff/clients')}catch(e){clientSummary=null}}
    var meta=document.getElementById('hcClientsEntryMeta');if(meta&&clientSummary)meta.textContent=summaryText(clientSummary);
  }
  function queue(){
    if(!patchQueued){patchQueued=true;requestAnimationFrame(function(){patchQueued=false;patch()})}
    if(lateTimer)clearTimeout(lateTimer);
    lateTimer=setTimeout(function(){lateTimer=0;patch()},100);
  }
  document.addEventListener('hc:after-render',queue,false);
  document.addEventListener('click',function(e){var t=e.target;if(t&&t.closest&&t.closest('button'))queue()},false);
  window.addEventListener('pageshow',queue);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)queue()});
  queue();
})();
</script>`;

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === 'GET' && url.pathname === '/__hc_clients_health') {
      return clientHealth(env);
    }

    const origin = url.origin;
    const response = await staff.fetch(req, { ...env, WEBAPP_URL: origin }, ctx);
    if (req.method === 'GET' && ['/staff', '/staff/', '/admin'].includes(url.pathname) && response.ok) {
      const headers = new Headers(response.headers);
      headers.set('cache-control', 'no-store, no-cache, must-revalidate');
      const body = (await response.text()).replace('</body>', CLIENT_ENTRY_FIX + '</body>');
      return new Response(body, { status: response.status, headers });
    }
    return response;
  },
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    return staff.scheduled(controller, env, ctx);
  },
};

async function clientHealth(env: Env): Promise<Response> {
  try {
    const id = (env as any).STATE.idFromName('global');
    const stub = (env as any).STATE.get(id);
    const r = await stub.fetch('https://state.local/opsclients/list?summary=1');
    const x: any = await r.json().catch(() => ({}));
    if (!r.ok || x?.ok === false) return healthJson({ ok: false, error: 'client database unavailable' }, 503);
    const clients = Array.isArray(x.clients) ? x.clients : [];
    let subscriptions = 0;
    let needsReview = 0;
    for (const c of clients) {
      const snapshots = Array.isArray(c?.subscription_snapshots) ? c.subscription_snapshots : [];
      subscriptions += snapshots.length;
      if (c?.needs_review || snapshots.some((s: any) => !!s?.needs_review)) needsReview += 1;
    }
    return healthJson({
      ok: true,
      clients: clients.length,
      subscriptions,
      needs_review: needsReview,
      imported_clients: Number(x?.meta?.clients || 0),
      imported_visits: Number(x?.meta?.visits || 0),
      imported_subscriptions: Number(x?.meta?.subscriptions || 0),
    });
  } catch {
    return healthJson({ ok: false, error: 'client database unavailable' }, 503);
  }
}

function healthJson(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
