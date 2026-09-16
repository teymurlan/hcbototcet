import { STAFF_RUNTIME_APP } from './staff-runtime-ui';

const CURRENT_CSS = String.raw`
<style>
/* Stable current layer: clear statuses, larger subscription controls, reliable photo flow */
.order-card.hc-status-completed,.task-card.hc-status-completed,.rt-priority-list .card.hc-status-completed{background:#effaf5!important;border-color:#9ed8bc!important;box-shadow:0 5px 18px rgba(19,138,85,.08)!important}
.order-card.hc-status-unassigned,.task-card.hc-status-unassigned,.rt-priority-list .card.hc-status-unassigned{background:#fff8ea!important;border-color:#e9bd71!important;box-shadow:0 5px 18px rgba(183,106,0,.08)!important}
.order-card.hc-status-progress,.task-card.hc-status-progress,.rt-priority-list .card.hc-status-progress{background:#eef5ff!important;border-color:#8fbaff!important;box-shadow:0 5px 18px rgba(23,105,224,.10)!important}
.order-card.hc-status-assigned,.task-card.hc-status-assigned,.rt-priority-list .card.hc-status-assigned{background:#fff!important;border-color:#c9d8eb!important}
.rt-visit{grid-template-columns:42px minmax(0,1.2fr) minmax(112px,.8fr)!important;gap:9px!important}.rt-visit b{width:38px!important;height:38px!important;font-size:14px!important;border-radius:12px!important}.rt-visit input{min-height:54px!important;padding:12px 10px!important;font-size:16px!important;font-weight:650!important;border-radius:13px!important;background:#fff!important}
.hc-upload-status{margin-top:8px;padding:10px 11px;border-radius:12px;background:#f5f8fc;border:1px solid #dce5f1;color:#5d6a7d;font-size:12px;line-height:1.4}.hc-upload-status.busy{background:#edf4ff;border-color:#bfd7ff;color:#315f9a}.hc-upload-status.ok{background:#eaf8f1;border-color:#bfe5d2;color:#176b48}.hc-upload-status.err{background:#fff0f0;border-color:#efc0c0;color:#963232}
.hc-time-card{margin:10px 0;padding:12px 13px;border-radius:15px;background:#f6f9fd;border:1px solid #dce5f1;color:#526074;font-size:12px;line-height:1.55}.hc-time-card b{display:block;color:#1e2a3a;font-size:14px;margin-bottom:3px}.hc-report-timing{margin-top:8px;color:#536274;font-size:12px;font-weight:720}.hc-report-timing:before{content:'◷ ';color:#1769e0}.hc-current-hidden{display:none!important}
@media(max-width:430px){.rt-visit{grid-template-columns:38px minmax(0,1fr) 112px!important}.rt-visit b{width:36px!important;height:36px!important}.rt-visit input{font-size:16px!important;min-height:52px!important}}
</style>`;

const CURRENT_SCRIPT = String.raw`
<script>
(function(){
  var hc={orders:[],jobs:[],lastJob:null,lastOrder:null,state:null,uploading:false,counts:{before:0,after:0},patching:false};
  var previousFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    var url=typeof input==='string'?input:(input&&input.url)||'',method=String((init&&init.method)||'GET').toUpperCase(),r=await previousFetch(input,init);
    try{
      if(method==='GET'&&String(url).indexOf('/api/staff/orders')>=0){var a=await r.clone().json();if(a&&Array.isArray(a.orders))hc.orders=a.orders}
      if(method==='GET'&&String(url).indexOf('/api/admin/jobs')>=0){var b=await r.clone().json();if(b&&Array.isArray(b.jobs))hc.jobs=b.jobs}
      if(method==='GET'&&String(url).indexOf('/api/admin/job?')>=0){var c=await r.clone().json();if(c&&c.job)hc.lastJob=c.job}
      if(method==='GET'&&String(url).indexOf('/api/staff/order?')>=0){var d=await r.clone().json();if(d&&d.order)hc.lastOrder=d.order}
      if(method==='GET'&&String(url).indexOf('/api/state')>=0){hc.state=await r.clone().json()}
    }catch(e){}
    return r;
  };
  function launch(){return new URLSearchParams(location.search).get('launch')||''}
  function tg(){return window.Telegram&&window.Telegram.WebApp}
  function authHeaders(json){var h={'X-App-Launch-Token':launch(),'X-Telegram-Init-Data':tg()&&tg().initData||''};if(json)h['content-type']='application/json';return h}
  async function api(path,opt){opt=opt||{};opt.headers=Object.assign({},authHeaders(true),opt.headers||{});var r=await previousFetch(path,opt),x=await r.json().catch(function(){return{error:'Ошибка сервера'}});if(!r.ok||x.ok===false)throw Error(x.error||'Ошибка');return x}
  async function uploadApi(fd){var r=await previousFetch('/api/media/draft',{method:'POST',headers:authHeaders(false),body:fd}),x=await r.json().catch(function(){return{error:'Ошибка загрузки'}});if(!r.ok||x.ok===false)throw Error(x.error||'Не удалось загрузить файл');return x}
  function toast(s){try{var t=tg();if(t&&t.showAlert)return t.showAlert(String(s))}catch(e){}alert(String(s))}
  function sleep(ms){return new Promise(function(resolve){setTimeout(resolve,ms)})}
  function orderTime(o){return String(o&&o.date||'')+'T'+String(o&&o.time||'00:00')+':00+03:00'}
  function orderByNumber(n){return hc.orders.find(function(o){return String(o.order_number)===String(n)})}
  function jobById(id){return hc.jobs.find(function(j){return String(j.id)===String(id)})}
  function fmtClock(ms){if(!ms)return'—';try{return new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit'}).format(new Date(Number(ms)))}catch(e){return'—'}}
  function dur(ms){var m=Math.max(0,Math.floor(Number(ms||0)/60000)),h=Math.floor(m/60);return h?h+' ч '+(m%60)+' мин':m+' мин'}
  function durationOf(j){var s=Number(j&&j.startedAt||j&&j.started_at||0),e=Number(j&&j.finishedAt||j&&j.finished_at||0);return s?Math.max(0,(e||Date.now())-s):0}
  function statusClass(o){if(!o)return'';if(String(o.status)==='COMPLETED'||Number(o.staff&&o.staff.verified_at||0)>0)return'hc-status-completed';if(String(o.status)==='IN_PROGRESS')return'hc-status-progress';var ass=o.staff&&o.staff.assigned||[];if(!ass.length&&String(o.status)!=='CANCELLED')return'hc-status-unassigned';return'hc-status-assigned'}
  function applyCardStatus(card,o){if(!card||!o)return;['hc-status-completed','hc-status-unassigned','hc-status-progress','hc-status-assigned'].forEach(function(x){card.classList.remove(x)});card.classList.add(statusClass(o))}
  function patchCards(){
    document.querySelectorAll('.order-card').forEach(function(card){var b=card.querySelector('[data-order]');if(b)applyCardStatus(card,orderByNumber(b.dataset.order))});
    document.querySelectorAll('.task-card').forEach(function(card){var b=card.querySelector('[data-task]');if(b)applyCardStatus(card,orderByNumber(b.dataset.task))});
    document.querySelectorAll('.rt-priority-list .card').forEach(function(card){var b=card.querySelector('[data-rtopen]');if(b)applyCardStatus(card,orderByNumber(b.dataset.rtopen))});
  }
  function patchSubscriptionAttention(){
    var now=Date.now(),fourDays=4*24*60*60*1000;
    document.querySelectorAll('.attention').forEach(function(card){var b=card.querySelector('[data-order]');if(!b)return;var o=orderByNumber(b.dataset.order);if(!o||Number(o.subscription_size||0)<=1)return;var ass=o.staff&&o.staff.assigned||[],ts=Date.parse(orderTime(o));if(!ass.length&&isFinite(ts)&&ts-now>fourDays)card.classList.add('hc-current-hidden');else card.classList.remove('hc-current-hidden')});
    var heads=[].slice.call(document.querySelectorAll('.section-title h2')),h=heads.find(function(x){return String(x.textContent||'').trim()==='Требует внимания'});if(h){var span=h.parentElement&&h.parentElement.querySelector('span');if(span){var count=[].slice.call(document.querySelectorAll('.attention')).filter(function(x){return !x.classList.contains('hc-current-hidden')}).length;span.textContent=count+' событий'}}
  }
  async function draftCount(stage){try{var x=await api('/api/staff/draft-count?stage='+encodeURIComponent(stage));hc.counts[stage]=Number(x.count||0);return hc.counts[stage]}catch(e){return hc.counts[stage]||0}}
  function uploadStatus(){var up=document.getElementById('upload');if(!up)return null;var box=document.getElementById('hcUploadStatus');if(!box){box=document.createElement('div');box.id='hcUploadStatus';box.className='hc-upload-status';up.insertAdjacentElement('afterend',box)}return box}
  function setUploadStatus(text,kind){var box=uploadStatus();if(!box)return;box.className='hc-upload-status'+(kind?' '+kind:'');box.textContent=text}
  function setSendDisabled(v){var b=document.getElementById('sendstage');if(b)b.disabled=!!v}
  async function uploadFiles(stage,files,input){if(!files||!files.length||hc.uploading)return;hc.uploading=true;input.disabled=true;setSendDisabled(true);setUploadStatus('Подготавливаем файлы…','busy');var success=0;try{for(var i=0;i<files.length;i++){setUploadStatus('Загружаем '+(i+1)+' из '+files.length+'…','busy');var err=null;for(var attempt=0;attempt<2;attempt++){try{var fd=new FormData();fd.append('stage',stage);fd.append('media',files[i]);await uploadApi(fd);err=null;break}catch(e){err=e;if(attempt===0)await sleep(300)}}if(err)throw err;success++;var n=await draftCount(stage);setUploadStatus('Сохранено '+n+' файл(а/ов). Можно добавить ещё.','ok')}}catch(e){setUploadStatus('Сохранено '+success+' из '+files.length+'. '+e.message+' — выберите неотправленные файлы ещё раз.','err');toast(e.message)}finally{hc.uploading=false;input.disabled=false;input.value='';setSendDisabled(false);var total=await draftCount(stage);if(total) setUploadStatus('Сохранено файлов: '+total+'. '+(total>=2?'Можно отправлять этап.':'Нужно минимум 2.'),total>=2?'ok':'')}}
  function patchUpload(){var up=document.getElementById('upload');if(!up||up.dataset.hcStable)return;up.dataset.hcStable='1';var stage=String(up.dataset.stage||'');up.onchange=function(){uploadFiles(stage,up.files,up)};draftCount(stage).then(function(n){setUploadStatus(n?'Уже сохранено файлов: '+n+'. '+(n>=2?'Можно отправлять этап.':'Нужно минимум 2.'):'Добавьте минимум 2 фото или видео.',n>=2?'ok':'')})}
  function patchStageSend(){var b=document.getElementById('sendstage');if(!b||b.dataset.hcStable)return;b.dataset.hcStable='1';b.onclick=async function(){var stage=String(b.dataset.stage||''),count=await draftCount(stage);if(hc.uploading)return toast('Дождитесь окончания загрузки файлов');if(count<2)return toast('Сначала добавьте минимум 2 фото или видео');var text=stage==='after'?'Точно отправить фото ПОСЛЕ и завершить фотоотчёт? После отправки отчёт уйдёт руководителю на проверку.':'Отправить фото ДО и перейти к выполнению уборки?';if(!confirm(text))return;var old=b.textContent;try{b.disabled=true;b.textContent=stage==='after'?'Отправляем отчёт…':'Сохраняем фото ДО…';await api(stage==='after'?'/api/after':'/api/before',{method:'POST',body:JSON.stringify({defect_note:(document.getElementById('defect')||{}).value||''})});toast(stage==='after'?'Фотоотчёт отправлен руководителю':'Фото ДО сохранены. Продолжайте уборку.');setTimeout(function(){location.reload()},120)}catch(e){b.disabled=false;b.textContent=old;toast(e.message)}}}
  function patchStartConfirm(){var b=document.querySelector('[data-act="start"]');if(!b||b.dataset.hcConfirm)return;b.dataset.hcConfirm='1';var old=b.onclick;b.onclick=function(e){if(!confirm('Точно начать уборку и фотоотчёт? Время работы начнёт считаться с этого момента.'))return false;b.disabled=true;var out=old&&old.call(b,e);setTimeout(function(){if(document.body.contains(b))b.disabled=false},5000);return out}}
  function timingHtml(j){var s=Number(j&&j.startedAt||j&&j.started_at||0),e=Number(j&&j.finishedAt||j&&j.finished_at||0),d=durationOf(j);if(!s)return'';return '<b>Время уборки</b>Начало: '+fmtClock(s)+(e?' · Завершение: '+fmtClock(e):'')+' · '+(e?'Итого: ':'Прошло: ')+dur(d)}
  function patchReportTiming(){
    document.querySelectorAll('[data-report]').forEach(function(b){var j=jobById(b.dataset.report),card=b.closest('.card');if(!j||!card)return;var t=card.querySelector('.hc-report-timing');if(!t){t=document.createElement('div');t.className='hc-report-timing';var meta=card.querySelector('.meta');(meta||b).insertAdjacentElement(meta?'afterend':'beforebegin',t)}var s=Number(j.startedAt||j.started_at||0);if(s)t.textContent='Начало '+fmtClock(s)+' · '+(j.finishedAt||j.finished_at?'заняло '+dur(durationOf(j)):'идёт '+dur(durationOf(j)))});
    var back=document.getElementById('pback'),j=hc.lastJob;if(back&&j){var box=document.getElementById('hcReportTime');if(!box){box=document.createElement('div');box.id='hcReportTime';box.className='hc-time-card';var first=back.parentElement.querySelector('.card');if(first)first.insertAdjacentElement('afterend',box)}box.innerHTML=timingHtml(j)}
  }
  function patchTaskTiming(){var back=document.getElementById('tback'),o=hc.lastOrder,j=hc.state&&hc.state.job;if(!back||!o||!j||String(j.booking_order_number||'')!==String(o.order_number||''))return;var actions=document.getElementById('actions');if(!actions)return;var box=document.getElementById('hcTaskTime');if(!box){box=document.createElement('div');box.id='hcTaskTime';box.className='hc-time-card';actions.insertAdjacentElement('beforebegin',box)}box.innerHTML=timingHtml(j)}
  async function hydrate(){try{hc.state=await api('/api/state');var o=await api('/api/staff/orders');hc.orders=o.orders||[];if(hc.state&&hc.state.admin){var j=await api('/api/admin/jobs').catch(function(){return{jobs:[]}});hc.jobs=j.jobs||[]}patch()}catch(e){}}
  function patch(){if(hc.patching)return;hc.patching=true;try{patchCards();patchSubscriptionAttention();patchUpload();patchStageSend();patchStartConfirm();patchReportTiming();patchTaskTiming()}finally{hc.patching=false}}
  var mo=new MutationObserver(function(){requestAnimationFrame(patch)});mo.observe(document.documentElement,{subtree:true,childList:true});setInterval(patch,1000);setTimeout(hydrate,50);patch();
})();
</script>`;

export const STAFF_CURRENT_APP = STAFF_RUNTIME_APP.replace('</head>', CURRENT_CSS + '</head>').replace('</body>', CURRENT_SCRIPT + '</body>');
