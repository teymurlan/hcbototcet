import { STAFF_PRODUCTION_APP } from './staff-production-ui';

const RUNTIME_CSS = String.raw`
<style>
/* Stable runtime polish — review flow, standards, requisites */
.rt-review-actions{position:sticky;bottom:calc(92px + env(safe-area-inset-bottom));z-index:26;margin-top:18px;padding:14px;background:rgba(255,255,255,.97);border:1px solid #d9e3ef;border-radius:20px;box-shadow:0 12px 34px rgba(25,39,64,.14);backdrop-filter:blur(18px)}
.rt-review-actions .rt-title{font-weight:850;font-size:16px;margin-bottom:4px}.rt-review-actions .rt-sub{font-size:12px;color:#6e7786;margin-bottom:10px}.rt-review-grid{display:grid;grid-template-columns:1.35fr 1fr;gap:8px}.rt-review-grid button{margin:0!important}.rt-review-accepted{margin-top:14px;padding:14px;border-radius:16px;background:#eaf8f1;border:1px solid #bfe5d2;color:#176b48}.rt-review-accepted b{display:block;font-size:16px;margin-bottom:3px}.rt-review-redo{margin-top:14px;padding:14px;border-radius:16px;background:#fff0f0;border:1px solid #efc0c0;color:#963232}
.rt-attention-report{cursor:pointer}.rt-attention-report:active{transform:scale(.992)}.rt-attention-report:after{content:'Открыть →';display:block;color:#1769e0;font-weight:800;font-size:11px;margin-top:7px}
.rt-payment-summary{background:linear-gradient(135deg,#f7fbff,#eef5ff);border:1px solid #cfe0ff;border-radius:17px;padding:14px;margin-bottom:8px}.rt-payment-summary .rt-pay-title{font-size:15px;font-weight:850;color:#1f2b3b}.rt-payment-summary .rt-pay-line{font-size:12px;color:#536274;margin-top:5px;line-height:1.45}.rt-payment-summary .rt-edit{width:100%;margin-top:11px;border:1px solid #bdd5f8;background:#fff;color:#1769e0;border-radius:12px;padding:10px;font-weight:800}
.profile-actions.rt-one{grid-template-columns:1fr!important}.rt-hidden{display:none!important}
/* Make standard categories unmistakable even if an older inner renderer is used. */
.standard-card.rt-std-blue{border:2px solid #9fc2f5!important;border-left:7px solid #1769e0!important;background:#eef5ff!important}.standard-card.rt-std-blue h3{color:#1558b5!important}
.standard-card.rt-std-green{border:2px solid #a8ddc3!important;border-left:7px solid #15945b!important;background:#ecf9f2!important}.standard-card.rt-std-green h3{color:#117549!important}
.standard-card.rt-std-orange{border:2px solid #f0cf93!important;border-left:7px solid #e18a19!important;background:#fff6e6!important}.standard-card.rt-std-orange h3{color:#995b08!important}
.standard-card.rt-std-red{border:2px solid #efb1b1!important;border-left:7px solid #d54a4a!important;background:#fff0f0!important}.standard-card.rt-std-red h3{color:#a72d2d!important}
.standard-card.rt-std-purple{border:2px solid #ccbff0!important;border-left:7px solid #7657c7!important;background:#f5f1ff!important}.standard-card.rt-std-purple h3{color:#5e43a7!important}
.rt-std-tag{display:inline-flex;border-radius:999px;padding:4px 8px;font-size:10px;font-weight:850;margin-bottom:8px}.rt-std-blue .rt-std-tag{background:#dbeaff;color:#1558b5}.rt-std-green .rt-std-tag{background:#d9f3e5;color:#117549}.rt-std-orange .rt-std-tag{background:#ffe8bd;color:#995b08}.rt-std-red .rt-std-tag{background:#ffdada;color:#a72d2d}.rt-std-purple .rt-std-tag{background:#e8e0ff;color:#5e43a7}
@media(max-width:390px){.rt-review-grid{grid-template-columns:1fr}}
</style>`;

const RUNTIME_SCRIPT = String.raw`
<script>
(function(){
  var rt={jobs:[],lastJob:null,patching:false};
  var nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    var url=typeof input==='string'?input:(input&&input.url)||'';
    var r=await nativeFetch(input,init);
    try{
      if(String(url).indexOf('/api/admin/jobs')>=0){var c=r.clone(),x=await c.json();if(x&&Array.isArray(x.jobs))rt.jobs=x.jobs}
      if(String(url).indexOf('/api/admin/job?')>=0){var c2=r.clone(),y=await c2.json();if(y&&y.job)rt.lastJob=y.job}
    }catch(e){}
    return r;
  };
  function headers(){var tg=window.Telegram&&window.Telegram.WebApp;return {'content-type':'application/json','X-App-Launch-Token':new URLSearchParams(location.search).get('launch')||'','X-Telegram-Init-Data':tg&&tg.initData||''}}
  async function api(path,opt){opt=opt||{};opt.headers=Object.assign({},headers(),opt.headers||{});var r=await nativeFetch(path,opt),x=await r.json().catch(function(){return{error:'Ошибка сервера'}});if(!r.ok||x.ok===false)throw Error(x.error||'Ошибка');return x}
  function toast(s){try{var tg=window.Telegram&&window.Telegram.WebApp;if(tg&&tg.showAlert)return tg.showAlert(String(s))}catch(e){}alert(String(s))}
  function classifyStandards(){
    document.querySelectorAll('.standard-card').forEach(function(card){if(card.dataset.rtColor)return;var h=card.querySelector('h3'),t=(h&&h.textContent||'').toLowerCase(),c='blue',label='ПОРЯДОК РАБОТЫ';
      if(/фото до|фото после|генеральн/.test(t)){c='green';label='КАЧЕСТВО'}
      else if(/хим|поверхност|после ремонта/.test(t)){c='orange';label='ОСТОРОЖНО'}
      else if(/имуществ|ключ|конфиденц|нестандарт/.test(t)){c='red';label='ВАЖНО'}
      else if(/общение|внешний вид/.test(t)){c='purple';label='КЛИЕНТ И СЕРВИС'}
      card.classList.add('rt-std-'+c);card.dataset.rtColor=c;if(!card.querySelector('.rt-std-tag'))card.insertAdjacentHTML('afterbegin','<span class="rt-std-tag">'+label+'</span>');
    })
  }
  function removeCall(){document.querySelectorAll('a[href^="tel:"]').forEach(function(a){var p=a.closest('.profile-actions');a.remove();if(p)p.classList.add('rt-one')})}
  function compactPayment(prefix){
    var ids=prefix==='my'?['mybank','mysbp','myrec','mylast','savemypay']:['pbank','psbp','prec','plast','savepay'];
    var btn=document.getElementById(ids[4]);if(!btn||btn.dataset.rtBound)return;var els=ids.slice(0,4).map(function(id){return document.getElementById(id)});if(els.some(function(x){return!x}))return;
    btn.dataset.rtBound='1';var values=els.map(function(x){return String(x.value||'').trim()}),has=values.some(Boolean),box=btn.parentElement;if(!has||!box)return;
    var summary=document.createElement('div');summary.className='rt-payment-summary';summary.innerHTML='<div class="rt-pay-title">Реквизиты сохранены</div><div class="rt-pay-line">'+(values[0]||'Банк не указан')+(values[1]?'<br>СБП: '+values[1]:'')+(values[2]?'<br>Получатель: '+values[2]:'')+(values[3]?'<br>Карта: •••• '+values[3]:'')+'</div><button type="button" class="rt-edit">Изменить реквизиты</button>';
    box.insertBefore(summary,box.firstChild);els.forEach(function(x){var p=x.parentElement;p&&p.classList.add('rt-hidden')});btn.classList.add('rt-hidden');var note=box.querySelector('.payment-replace-note');if(note)note.classList.add('rt-hidden');
    summary.querySelector('.rt-edit').onclick=function(){summary.remove();els.forEach(function(x){var p=x.parentElement;p&&p.classList.remove('rt-hidden')});btn.classList.remove('rt-hidden');if(note)note.classList.remove('rt-hidden')};
  }
  function statusFor(j){if(!j)return null;if(j.staff_verified||j.staff_review_status==='accepted')return['Принят и завершён','green'];if(j.staff_review_status==='redo')return['Нужен повтор','red'];if(j.stage==='done')return['Готов к проверке','orange'];return null}
  function patchReportCards(){document.querySelectorAll('[data-report]').forEach(function(b){var j=rt.jobs.find(function(x){return String(x.id)===String(b.dataset.report)});var s=statusFor(j);if(!s)return;var card=b.closest('.card'),chip=card&&card.querySelector('.row .chip');if(chip){chip.textContent=s[0];chip.classList.remove('green','orange','red','blue');chip.classList.add(s[1])}})}
  function matchAttention(text){text=String(text||'').toLowerCase();return rt.jobs.find(function(j){if(j.stage!=='done'||j.staff_verified)return false;return [j.address,j.reportId,j.id].some(function(v){return v&&text.indexOf(String(v).toLowerCase())>=0})})}
  function patchAttention(){document.querySelectorAll('.attention').forEach(function(card){if(card.dataset.rtReport)return;var text=card.textContent||'';if(text.indexOf('Фотоотчёт')<0)return;var j=matchAttention(text);if(!j)return;card.dataset.rtReport=j.id;card.classList.add('rt-attention-report');card.onclick=function(e){if(e.target.closest('button'))return;openReport(j.id)}})}
  function openReport(id){var n=document.querySelector('#nav button[data-n="photos"]');if(n)n.click();setTimeout(function(){var b=document.querySelector('[data-report="'+CSS.escape(String(id))+'"]');if(b)b.click();else toast('Фотоотчёт обновляется. Откройте раздел «Фото» ещё раз.')},120)}
  function patchReportDetail(){
    var back=document.getElementById('pback'),j=rt.lastJob;if(!back||!j||String(j.stage)!=='done')return;
    var existing=document.querySelector('.rt-review-actions,.rt-review-accepted,.rt-review-redo');if(existing)return;
    var chip=back.parentElement.querySelector('.card .meta .chip:last-child'),s=statusFor(j);if(chip&&s){chip.textContent=s[0];chip.classList.remove('green','orange','red','blue');chip.classList.add(s[1])}
    var old=document.getElementById('verify');if(old)old.closest('.sticky-actions')?old.closest('.sticky-actions').remove():old.remove();
    if(j.staff_verified||j.staff_review_status==='accepted'){var ok=document.createElement('div');ok.className='rt-review-accepted';ok.innerHTML='<b>✅ Принят и завершён</b>Работа принята руководителем. Начисление зафиксировано, сотрудник больше не может менять отчёт.';document.getElementById('main').appendChild(ok);return}
    if(j.staff_review_status==='redo'){var rr=document.createElement('div');rr.className='rt-review-redo';rr.innerHTML='<b>↩️ Отправлен на повтор</b><div style="margin-top:4px">'+(j.staff_redo_reason||'Руководитель запросил исправление фотоотчёта.')+'</div>';document.getElementById('main').appendChild(rr);return}
    var box=document.createElement('div');box.className='rt-review-actions';box.innerHTML='<div class="rt-title">Проверка фотоотчёта</div><div class="rt-sub">После принятия заказ будет закрыт и сотруднику зафиксируется начисление.</div><div class="rt-review-grid"><button class="btn green" id="rtAccept">✓ Принять работу</button><button class="btn red" id="rtRedo">↩ Запросить повтор</button></div>';document.getElementById('main').appendChild(box);
    document.getElementById('rtAccept').onclick=async function(){if(!confirm('Принять работу и завершить проверку?'))return;try{this.disabled=true;await api('/api/staff/report/review',{method:'POST',body:JSON.stringify({job_id:j.id,action:'accept'})});toast('Работа принята и завершена');j.staff_verified=true;j.staff_review_status='accepted';box.remove();patchReportDetail()}catch(e){this.disabled=false;toast(e.message)}};
    document.getElementById('rtRedo').onclick=async function(){var reason=prompt('Что сотруднику нужно исправить?');if(!reason)return;try{this.disabled=true;await api('/api/staff/report/review',{method:'POST',body:JSON.stringify({job_id:j.id,action:'redo',reason:reason})});toast('Фотоотчёт отправлен на повтор');j.staff_review_status='redo';j.staff_redo_reason=reason;box.remove();patchReportDetail()}catch(e){this.disabled=false;toast(e.message)}};
  }
  function renamePay(){var p=document.getElementById('pay');if(p)p.textContent='Выплатить сотруднику'}
  function patch(){if(rt.patching)return;rt.patching=true;try{classifyStandards();removeCall();compactPayment('my');compactPayment('admin');patchReportCards();patchAttention();patchReportDetail();renamePay()}finally{rt.patching=false}}
  var mo=new MutationObserver(function(){requestAnimationFrame(patch)});mo.observe(document.documentElement,{subtree:true,childList:true});setInterval(patch,1200);patch();
})();
</script>`;

// Never prefill Telegram display name into the legal/working FIO field.
const manualFio = STAFF_PRODUCTION_APP.replace(
  "var u=s.user||{},name=[u.first_name||'',u.last_name||''].join(' ').trim();",
  "var u=s.user||{},name='';"
);

export const STAFF_RUNTIME_APP = manualFio.replace('</head>', RUNTIME_CSS + '</head>').replace('</body>', RUNTIME_SCRIPT + '</body>');
