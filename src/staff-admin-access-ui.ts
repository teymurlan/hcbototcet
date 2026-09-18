import { STAFF_OPERATIONS_SAFE_APP } from './staff-operations-safe-ui';

const ACCESS_CSS = String.raw`
<style>
/* Subscription visit cards — explicit iPhone-safe date/time controls */
.rt-visits{display:grid!important;gap:10px!important}
.rt-visit.hc-visit-card{display:grid!important;grid-template-columns:44px minmax(0,1fr)!important;gap:10px!important;align-items:start!important;min-height:0!important;padding:11px!important;border:1.5px solid #d7e2ef!important;border-radius:16px!important;background:linear-gradient(180deg,#fbfdff,#f5f9ff)!important;box-shadow:0 3px 12px rgba(25,39,64,.045)!important}
.rt-visit.hc-visit-card>b{width:42px!important;height:42px!important;display:grid!important;place-items:center!important;margin:18px 0 0!important;border-radius:13px!important;background:#eaf2ff!important;border:1px solid #d6e5ff!important;color:#1769e0!important;font-size:15px!important;font-weight:850!important}
.hc-visit-fields{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:9px;min-width:0}
.hc-visit-field{display:grid;gap:5px;min-width:0}.hc-visit-field span{font-size:11px;line-height:1;color:#6c7b90;font-weight:820;padding-left:2px}
.hc-visit-field input{display:block!important;position:static!important;float:none!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important;width:100%!important;min-width:0!important;max-width:100%!important;height:52px!important;min-height:52px!important;margin:0!important;padding:0 12px!important;border:1.5px solid #cbd8e8!important;border-radius:13px!important;background:#fff!important;color:#172033!important;-webkit-text-fill-color:#172033!important;font:700 16px/1.1 -apple-system,BlinkMacSystemFont,"SF Pro Text",Arial,sans-serif!important;box-shadow:0 2px 8px rgba(34,55,86,.035)!important;color-scheme:light!important;-webkit-appearance:auto!important;appearance:auto!important}
.hc-visit-field input:focus{outline:none!important;border-color:#6ba4f1!important;box-shadow:0 0 0 3px rgba(23,105,224,.10)!important}.hc-visit-field input::-webkit-date-and-time-value{text-align:left!important;color:#172033!important;-webkit-text-fill-color:#172033!important}.hc-visit-field input::-webkit-calendar-picker-indicator{opacity:.72!important}

/* Owner / administrator management */
.hc-admin-access-card{border:1.5px solid #cbdcf2!important;background:linear-gradient(180deg,#fff,#f8fbff)!important}.hc-admin-access-card .hc-admin-icon{width:42px;height:42px;border-radius:14px;background:#eaf2ff;color:#1769e0;display:grid;place-items:center;font-size:20px;margin-bottom:9px}.hc-admin-access-card p{margin:5px 0 0;color:#6b7789;font-size:12px;line-height:1.45}
.hc-access-modal{position:fixed;inset:0;z-index:12050;background:rgba(17,28,44,.56);backdrop-filter:blur(12px);display:flex;align-items:flex-end;justify-content:center}.hc-access-sheet{width:min(700px,100%);max-height:93vh;overflow:auto;background:#f5f8fc;border-radius:26px 26px 0 0;padding:15px 14px calc(28px + env(safe-area-inset-bottom));box-shadow:0 -18px 60px rgba(20,33,51,.25)}.hc-access-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.hc-access-head h2{margin:0;font-size:22px;letter-spacing:-.35px}.hc-access-close{border:0;width:39px;height:39px;border-radius:12px;background:#e8eef6;color:#425168;font-size:23px}.hc-access-info{padding:12px 13px;border:1px solid #cfe0f8;border-radius:15px;background:#edf5ff;color:#315f95;font-size:12px;line-height:1.5;margin-bottom:11px}.hc-access-list{display:grid;gap:8px;margin-bottom:12px}.hc-access-person{background:#fff;border:1px solid #dfe6ef;border-radius:16px;padding:12px;display:grid;grid-template-columns:42px 1fr auto;gap:10px;align-items:center}.hc-access-avatar{width:42px;height:42px;border-radius:13px;background:#edf3fb;color:#53647c;display:grid;place-items:center;font-weight:900}.hc-access-person strong{display:block;font-size:14px}.hc-access-person small{display:block;color:#778397;font-size:11px;margin-top:3px}.hc-access-badge{display:inline-flex;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:850;background:#e8f8ef;color:#11764b;border:1px solid #c5e9d7}.hc-access-badge.owner{background:#eef3ff;color:#395a9a;border-color:#cedcff}.hc-access-remove{border:1px solid #efc8c8;background:#fff4f4;color:#a63737;border-radius:11px;padding:8px 9px;font-weight:800;font-size:11px}.hc-access-form{background:#fff;border:1px solid #dfe6ef;border-radius:18px;padding:13px}.hc-access-form h3{margin:0 0 9px;font-size:16px}.hc-access-form input{width:100%;min-height:49px;border:1px solid #d3deea;border-radius:12px;background:#fff;color:#172033;font:inherit;padding:11px 12px;margin-top:8px}.hc-access-form button{width:100%;min-height:48px;border:0;border-radius:13px;background:#1769e0;color:#fff;font-weight:850;margin-top:9px}.hc-access-readonly{padding:12px;border-radius:14px;background:#f6f8fb;border:1px dashed #cfd9e5;color:#6b7789;font-size:12px;line-height:1.45}
button,.btn,[role="button"]{touch-action:manipulation}
@media(max-width:430px){.rt-visit.hc-visit-card{grid-template-columns:40px minmax(0,1fr)!important;padding:10px!important}.rt-visit.hc-visit-card>b{width:38px!important;height:38px!important;margin-top:18px!important}.hc-visit-fields{gap:7px}.hc-visit-field input{font-size:15px!important;padding:0 9px!important}.hc-access-person{grid-template-columns:40px 1fr}.hc-access-person>:last-child{grid-column:2;justify-self:start}.hc-access-remove{grid-column:2}}
@media(max-width:350px){.hc-visit-fields{grid-template-columns:1fr}.rt-visit.hc-visit-card>b{margin-top:18px!important}}
</style>`;

const ACCESS_SCRIPT = String.raw`
<script>
(function(){
  var accessState=null,patching=false,patchQueued=false;
  var rawFetch=window.fetch.bind(window);
  function tg(){return window.Telegram&&window.Telegram.WebApp}
  function headers(){var t=tg();return {'content-type':'application/json','X-App-Launch-Token':new URLSearchParams(location.search).get('launch')||'','X-Telegram-Init-Data':t&&t.initData||''}}
  async function api(path,opt){opt=opt||{};opt.headers=Object.assign({},headers(),opt.headers||{});var r=await rawFetch(path,opt),x=await r.json().catch(function(){return{error:'Ошибка сервера'}});if(!r.ok||x.ok===false)throw Error(x.error||'Ошибка');return x}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function alertText(v){try{var t=tg();if(t&&t.showAlert)return t.showAlert(String(v))}catch(e){}alert(String(v))}
  function initials(name){var a=String(name||'').trim().split(/\s+/).filter(Boolean);return(a[0]&&a[0][0]||'A')+(a[1]&&a[1][0]||'')}

  function beautifyVisits(){
    var rows=document.querySelectorAll('.rt-visit');
    for(var i=0;i<rows.length;i++){
      var row=rows[i];if(row.dataset.hcVisitCard)continue;
      var date=row.querySelector('.rt-date'),time=row.querySelector('.rt-time'),num=row.querySelector('b');
      if(!date||!time||!num)continue;
      row.dataset.hcVisitCard='1';row.classList.add('hc-visit-card');
      var fields=document.createElement('div');fields.className='hc-visit-fields';
      function wrap(input,label){var box=document.createElement('label');box.className='hc-visit-field';var cap=document.createElement('span');cap.textContent=label;box.appendChild(cap);box.appendChild(input);return box}
      fields.appendChild(wrap(date,'Дата'));fields.appendChild(wrap(time,'Время'));row.appendChild(fields);
    }
  }

  function patchRole(){var role=document.getElementById('role');if(!role||!accessState||!accessState.admin)return;var value=accessState.owner?'Руководитель':'Администратор';if(role.textContent!==value)role.textContent=value}
  function moreScreenVisible(){var heads=document.querySelectorAll('.section-title h2');for(var i=0;i<heads.length;i++)if(String(heads[i].textContent||'').trim()==='Ещё')return true;return false}
  function patchAdminCard(){
    if(!accessState||!accessState.admin||!moreScreenVisible())return;
    var main=document.getElementById('main');if(!main)return,card=document.getElementById('hcAdminAccessCard');
    if(!card){card=document.createElement('div');card.id='hcAdminAccessCard';card.className='card hc-admin-access-card';main.appendChild(card)}
    card.innerHTML='<div class="hc-admin-icon">♛</div><div class="title">Администраторы</div><p>'+(accessState.owner?'Назначайте администраторов, которые смогут управлять заказами, сотрудниками, фотоотчётами, графиком и финансами.':'Список пользователей с административным доступом. Назначать и снимать администраторов может только руководитель.')+'</p><button id="hcAdminAccessOpen" class="btn soft block">Управление администраторами</button>';
    var open=document.getElementById('hcAdminAccessOpen');if(open)open.onclick=openAdminAccess;
  }

  function personHtml(x,ownerMode){
    var owner=!!x.owner,name=x.name||((owner?'Руководитель':'Администратор')+' '+x.id),right=owner?'<span class="hc-access-badge owner">РУКОВОДИТЕЛЬ</span>':'<span class="hc-access-badge">АДМИНИСТРАТОР</span>';
    if(!owner&&ownerMode)right='<button class="hc-access-remove" data-hc-revoke="'+Number(x.id)+'" data-hc-name="'+esc(name)+'">Снять доступ</button>';
    return '<div class="hc-access-person"><div class="hc-access-avatar">'+esc(initials(name))+'</div><div><strong>'+esc(name)+'</strong><small>Telegram ID: '+Number(x.id)+'</small></div>'+right+'</div>';
  }

  async function openAdminAccess(){
    try{
      var data=await api('/api/staff/admins'),old=document.getElementById('hcAccessModal');if(old)old.remove();
      var modal=document.createElement('div');modal.id='hcAccessModal';modal.className='hc-access-modal';
      var owners=data.owners||[],admins=data.admins||[],people=owners.map(function(x){return personHtml(x,!!data.owner)}).join('')+admins.map(function(x){return personHtml(x,!!data.owner)}).join('');
      var form=data.owner?'<div class="hc-access-form"><h3>Назначить администратора</h3><input id="hcAdminName" autocomplete="off" placeholder="Имя и фамилия"><input id="hcAdminId" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="Telegram ID"><button id="hcGrantAdmin">Назначить администратором</button></div>':'<div class="hc-access-readonly">У вас административный доступ к рабочему кабинету. Управление правами других администраторов доступно только руководителю.</div>';
      modal.innerHTML='<div class="hc-access-sheet"><div class="hc-access-head"><h2>Администраторы</h2><button id="hcAccessClose" class="hc-access-close">×</button></div><div class="hc-access-info">Администратор работает в том же кабинете управления: заказы, сотрудники, фотоотчёты, график и финансы. Право назначать или снимать других администраторов остаётся только у руководителя.</div><div class="hc-access-list">'+(people||'<div class="hc-access-readonly">Дополнительных администраторов пока нет.</div>')+'</div>'+form+'</div>';
      document.body.appendChild(modal);var close=document.getElementById('hcAccessClose');if(close)close.onclick=function(){modal.remove()};modal.onclick=function(e){if(e.target===modal)modal.remove()};
      modal.querySelectorAll('[data-hc-revoke]').forEach(function(b){b.onclick=async function(){var id=Number(b.dataset.hcRevoke),name=b.dataset.hcName||'администратора';if(!confirm('Снять административный доступ у '+name+'?'))return;try{b.disabled=true;await api('/api/staff/admins',{method:'POST',body:JSON.stringify({action:'revoke',telegram_id:id})});alertText('Административный доступ снят');openAdminAccess()}catch(e){b.disabled=false;alertText(e.message)}}});
      var grant=document.getElementById('hcGrantAdmin');if(grant)grant.onclick=async function(){var id=Number(document.getElementById('hcAdminId').value||0),name=String(document.getElementById('hcAdminName').value||'').trim();if(!Number.isSafeInteger(id)||id<=0)return alertText('Укажите корректный Telegram ID');if(name.length<2)return alertText('Укажите имя администратора');try{grant.disabled=true;grant.textContent='Назначаем…';var x=await api('/api/staff/admins',{method:'POST',body:JSON.stringify({action:'grant',telegram_id:id,name:name})});alertText(x.notified===false?'Администратор назначен. Чтобы получить сообщение, ему нужно сначала открыть бота.':'Администратор назначен');openAdminAccess()}catch(e){grant.disabled=false;grant.textContent='Назначить администратором';alertText(e.message)}};
    }catch(e){alertText(e.message)}
  }

  function patch(){if(patching)return;patching=true;try{beautifyVisits();patchRole();patchAdminCard()}finally{patching=false}}
  function queuePatch(){if(patchQueued)return;patchQueued=true;Promise.resolve().then(function(){patchQueued=false;patch()})}
  async function bootAccess(){try{accessState=await api('/api/state')}catch(e){}patch()}

  /* Event-driven only: no MutationObserver and no perpetual interval. */
  document.addEventListener('hc:after-render',queuePatch,false);
  document.addEventListener('change',function(e){var t=e.target;if(t&&(t.id==='rtPlan'||(t.classList&&t.classList.contains('rt-date'))||(t.classList&&t.classList.contains('rt-time'))))queuePatch()},false);
  window.addEventListener('pageshow',queuePatch,{passive:true});
  bootAccess();
})();
</script>`;

export const STAFF_ADMIN_ACCESS_APP = STAFF_OPERATIONS_SAFE_APP
  .replace('</head>', ACCESS_CSS + '</head>')
  .replace('</body>', ACCESS_SCRIPT + '</body>');
