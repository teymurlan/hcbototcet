const APP_MOTION_CSS = String.raw`
<style>
/* HOUSE CLEANING STAFF motion system: event-driven, transform/opacity first. */
.navin{position:relative!important;isolation:isolate!important}.navin .hc-nav-indicator{position:absolute;left:0;top:7px;height:calc(100% - 14px);width:0;border-radius:22px;background:linear-gradient(145deg,rgba(231,241,255,.98),rgba(239,249,255,.94));border:1px solid rgba(178,207,246,.72);box-shadow:0 7px 20px rgba(47,109,246,.10);pointer-events:none;z-index:0;opacity:0;transform:translate3d(0,0,0);transition:transform .28s cubic-bezier(.2,.78,.22,1),width .22s cubic-bezier(.2,.78,.22,1),opacity .16s ease}.navin .hc-nav-indicator.on{opacity:1}.navin>button{position:relative;z-index:1;transition:transform .16s ease,color .2s ease,opacity .18s ease!important}.navin>button.on{background:transparent!important}

.filter,.rt-filterbar button,.toolbar button,.chip,.team-state{transition:transform .16s ease,opacity .18s ease,background-color .2s ease,border-color .2s ease,color .2s ease!important}.filter:active,.rt-filterbar button:active,.toolbar button:active{transform:scale(.975)}.filter.on,.rt-filterbar button.on{animation:hcFilterIn .2s cubic-bezier(.2,.72,.24,1) both}.chip.hc-status-chip,.team-state{animation:hcStateIn .18s ease both}
.notice-card.warning,.attention.red,.dangerbox{animation:hcWarningIn .24s ease both}.readonly-box,.notice-card.success{animation:hcSuccessIn .22s ease both}

.hc-toast-host{position:fixed;left:14px;right:14px;bottom:calc(104px + env(safe-area-inset-bottom));z-index:14000;display:grid;justify-items:center;gap:8px;pointer-events:none}.hc-toast{width:min(520px,100%);display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:17px;background:rgba(24,34,50,.94);color:#fff;border:1px solid rgba(255,255,255,.14);box-shadow:0 16px 42px rgba(21,34,54,.24);backdrop-filter:blur(14px) saturate(135%);-webkit-backdrop-filter:blur(14px) saturate(135%);font-size:13px;font-weight:720;line-height:1.42;opacity:0;transform:translateY(10px) scale(.985);transition:opacity .2s ease,transform .24s cubic-bezier(.2,.72,.24,1)}.hc-toast.on{opacity:1;transform:none}.hc-toast.out{opacity:0;transform:translateY(6px) scale(.99)}.hc-toast:before{content:'✓';display:grid;place-items:center;flex:0 0 22px;width:22px;height:22px;border-radius:50%;background:#1ba568;color:#fff;font-size:12px;font-weight:900}.hc-toast.warn:before{content:'!';background:#e18a19}.hc-toast.error:before{content:'×';background:#d54a4a}.hc-toast.info:before{content:'i';background:#3476ff}

#main.hc-motion-ready>.hero,#main.hc-motion-ready>.section-title,#main.hc-motion-ready>.card,#main.hc-motion-ready>.grid,#main.hc-motion-ready>.search,#main.hc-motion-ready>.toolbar,#main.hc-motion-ready>.std-intro,#main.hc-motion-ready>.finance-grid{animation:hcScreenIn .26s cubic-bezier(.2,.72,.24,1) both}
#main.hc-motion-ready.hc-direction-back>.hero,#main.hc-motion-ready.hc-direction-back>.section-title,#main.hc-motion-ready.hc-direction-back>.card,#main.hc-motion-ready.hc-direction-back>.grid,#main.hc-motion-ready.hc-direction-back>.search,#main.hc-motion-ready.hc-direction-back>.toolbar,#main.hc-motion-ready.hc-direction-back>.std-intro,#main.hc-motion-ready.hc-direction-back>.finance-grid{animation-name:hcScreenBack!important}
#main.hc-motion-ready .metric,#main.hc-motion-ready .order-card,#main.hc-motion-ready .task-card,#main.hc-motion-ready .employee,#main.hc-motion-ready .notice-card{animation:hcCardIn .24s cubic-bezier(.2,.72,.24,1) both;will-change:auto}
#main.hc-motion-ready .order-card:nth-child(2),#main.hc-motion-ready .task-card:nth-child(2),#main.hc-motion-ready .notice-card:nth-child(2){animation-delay:24ms}#main.hc-motion-ready .order-card:nth-child(3),#main.hc-motion-ready .task-card:nth-child(3),#main.hc-motion-ready .notice-card:nth-child(3){animation-delay:48ms}#main.hc-motion-ready .order-card:nth-child(4),#main.hc-motion-ready .task-card:nth-child(4),#main.hc-motion-ready .notice-card:nth-child(4){animation-delay:72ms}#main.hc-motion-ready .order-card:nth-child(n+5),#main.hc-motion-ready .task-card:nth-child(n+5),#main.hc-motion-ready .notice-card:nth-child(n+5){animation-delay:90ms}

.rt-modal{animation:hcModalIn .2s ease both}.rt-sheet,.hc-access-sheet{animation:hcSheetIn .26s cubic-bezier(.2,.72,.24,1) both}.rt-modal.hc-motion-closing{animation:hcModalOut .18s ease both}.rt-modal.hc-motion-closing .rt-sheet{animation:hcSheetOut .18s ease both}.hc-viewer.on{animation:hcModalIn .18s ease both}.hc-viewer.on .hc-viewer-media{animation:hcViewerIn .22s cubic-bezier(.2,.72,.24,1) both}
.loading-media,.hc-media-skeleton{opacity:.72;transition:opacity .18s ease}.hc-media img,.hc-media video,.media img,.media video,.hc-viewer-media img,.hc-viewer-media video{opacity:.01;transform:scale(.995);transition:opacity .22s ease,transform .22s ease}.hc-media img.hc-media-loaded,.hc-media video.hc-media-loaded,.media img.hc-media-loaded,.media video.hc-media-loaded,.hc-viewer-media img.hc-media-loaded,.hc-viewer-media video.hc-media-loaded{opacity:1;transform:none}

details>summary{cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .15s ease,opacity .18s ease}details>summary:active{transform:scale(.99)}details[open]>*:not(summary){animation:hcAccordionIn .2s ease both}

@keyframes hcScreenIn{from{opacity:0;transform:translateX(7px)}to{opacity:1;transform:none}}@keyframes hcScreenBack{from{opacity:0;transform:translateX(-7px)}to{opacity:1;transform:none}}@keyframes hcCardIn{from{opacity:0;transform:translateY(7px) scale(.994)}to{opacity:1;transform:none}}@keyframes hcFilterIn{from{opacity:.72;transform:scale(.97)}to{opacity:1;transform:none}}@keyframes hcStateIn{from{opacity:.55;transform:translateY(2px)}to{opacity:1;transform:none}}@keyframes hcWarningIn{from{opacity:.62;transform:translateY(4px)}to{opacity:1;transform:none}}@keyframes hcSuccessIn{from{opacity:.66;transform:translateY(4px)}to{opacity:1;transform:none}}@keyframes hcModalIn{from{opacity:0}to{opacity:1}}@keyframes hcModalOut{from{opacity:1}to{opacity:0}}@keyframes hcSheetIn{from{opacity:.75;transform:translateY(22px)}to{opacity:1;transform:none}}@keyframes hcSheetOut{from{opacity:1;transform:none}to{opacity:0;transform:translateY(15px)}}@keyframes hcViewerIn{from{opacity:.3;transform:scale(.985)}to{opacity:1;transform:none}}@keyframes hcAccordionIn{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}

@media(prefers-reduced-motion:reduce){.hc-nav-indicator,.hc-toast,.filter,.rt-filterbar button,.toolbar button,.chip,.team-state,details>*,#main.hc-motion-ready>*,#main.hc-motion-ready .metric,#main.hc-motion-ready .order-card,#main.hc-motion-ready .task-card,#main.hc-motion-ready .employee,#main.hc-motion-ready .notice-card,.rt-modal,.rt-sheet,.hc-access-sheet,.hc-viewer.on,.hc-viewer.on .hc-viewer-media{animation:none!important;transition-duration:.01ms!important}.hc-media img,.hc-media video,.media img,.media video,.hc-viewer-media img,.hc-viewer-media video{opacity:1!important;transform:none!important;transition:none!important}}
</style>`;

const APP_MOTION_SCRIPT = String.raw`
<script>
(function(){
  var navFrame=0,dirTimer=0,toastSeq=0;
  function tg(){return window.Telegram&&window.Telegram.WebApp}
  function haptic(kind){try{var t=tg(),h=t&&t.HapticFeedback;if(!h)return;if(kind==='success'||kind==='warning'||kind==='error'){if(h.notificationOccurred)h.notificationOccurred(kind);return}if(h.impactOccurred)h.impactOccurred(kind||'light')}catch(e){}}
  function host(){var h=document.getElementById('hcToastHost');if(h)return h;h=document.createElement('div');h.id='hcToastHost';h.className='hc-toast-host';document.body.appendChild(h);return h}
  function kindOf(text){text=String(text||'').toLowerCase();if(/ошиб|не удалось|отмен|нельзя|нет доступа|не найден/.test(text))return'error';if(/вниман|проверь|сначала|дождитесь|нужно|точно/.test(text))return'warn';if(/сохран|готов|успеш|отправ|принят|обновл|заверш/.test(text))return'success';return'info'}
  window.__hcToast=function(message,type){var text=String(message==null?'':message).trim();if(!text)return;var k=type||kindOf(text),h=host(),el=document.createElement('div');el.className='hc-toast '+(k==='warning'?'warn':k);el.setAttribute('role','status');el.setAttribute('aria-live','polite');el.dataset.toast=String(++toastSeq);var span=document.createElement('span');span.textContent=text;el.appendChild(span);h.appendChild(el);haptic(k==='warn'?'warning':k==='info'?'light':k);requestAnimationFrame(function(){el.classList.add('on')});window.setTimeout(function(){el.classList.add('out');window.setTimeout(function(){el.remove()},230)},2600)};
  window.__hcCloseMotion=function(el){if(!el||el.classList.contains('hc-motion-closing'))return;el.classList.add('hc-motion-closing');window.setTimeout(function(){try{el.remove()}catch(e){}},185)};
  function indicator(){navFrame=0;var box=document.getElementById('navin');if(!box)return;var on=box.querySelector('button.on');if(!on)return;var ind=box.querySelector('.hc-nav-indicator');if(!ind){ind=document.createElement('div');ind.className='hc-nav-indicator';ind.setAttribute('aria-hidden','true');box.insertBefore(ind,box.firstChild)}ind.style.width=on.offsetWidth+'px';ind.style.transform='translate3d('+on.offsetLeft+'px,0,0)';ind.classList.add('on')}
  function queueIndicator(){if(navFrame)return;navFrame=requestAnimationFrame(indicator)}
  function markDirection(back){var main=document.getElementById('main');if(!main)return;main.classList.toggle('hc-direction-back',!!back);main.classList.toggle('hc-direction-forward',!back);if(dirTimer)clearTimeout(dirTimer);dirTimer=setTimeout(function(){main.classList.remove('hc-direction-back','hc-direction-forward')},420)}
  function tactile(target){if(!target)return;var hit=target.closest&&target.closest('.btn,.filter,.rt-filterbar button,#nav button,.rt-close,.hc-media,summary');if(!hit)return;haptic('light')}
  function mediaReady(target){if(!target||!target.matches)return;if(target.matches('.hc-media img,.hc-media video,.media img,.media video,.hc-viewer-media img,.hc-viewer-media video'))target.classList.add('hc-media-loaded')}
  document.addEventListener('pointerup',function(e){tactile(e.target)},{passive:true,capture:true});
  document.addEventListener('click',function(e){var b=e.target&&e.target.closest&&e.target.closest('.back');if(b)markDirection(true);else if(e.target&&e.target.closest&&e.target.closest('#nav button'))markDirection(false);queueIndicator()},true);
  document.addEventListener('load',function(e){mediaReady(e.target)},true);document.addEventListener('loadeddata',function(e){mediaReady(e.target)},true);
  document.addEventListener('hc:after-render',queueIndicator,true);
  window.addEventListener('pageshow',queueIndicator);
  window.addEventListener('resize',queueIndicator,{passive:true});
  queueIndicator();
})();
</script>`;

export function applyStaffMotionSystem(app:string):string {
  let out=app;
  out=out.replace(
    "function M(html){document.getElementById('main').innerHTML=html;window.scrollTo(0,0)}",
    "function M(html){var main=document.getElementById('main');main.classList.remove('hc-motion-ready');main.innerHTML=html;window.scrollTo(0,0);requestAnimationFrame(function(){main.classList.add('hc-motion-ready');try{document.dispatchEvent(new CustomEvent('hc:after-render',{detail:{page:S&&S.page||''}}))}catch(e){var ev=document.createEvent('Event');ev.initEvent('hc:after-render',true,false);document.dispatchEvent(ev)}})}"
  );
  // Route existing lightweight toast helpers to the native-looking in-app toast.
  out=out.replace(
    "function toast(x){try{T&&T.showAlert(String(x))}catch(e){alert(String(x))}}",
    "function toast(x){if(window.__hcToast)return window.__hcToast(String(x));try{T&&T.showAlert(String(x))}catch(e){alert(String(x))}}"
  );
  out=out.replaceAll(
    "if(tg&&tg.showAlert)return tg.showAlert(String(s))",
    "if(window.__hcToast)return window.__hcToast(String(s));if(tg&&tg.showAlert)return tg.showAlert(String(s))"
  );
  out=out.replaceAll(
    "if(t&&t.showAlert)return t.showAlert(String(s))",
    "if(window.__hcToast)return window.__hcToast(String(s));if(t&&t.showAlert)return t.showAlert(String(s))"
  );
  // Preserve synchronous app logic while giving the manual-order sheet a real reverse transition.
  out=out.replace(
    "document.getElementById('rtClose').onclick=function(){m.remove()};m.onclick=function(e){if(e.target===m)m.remove()}",
    "document.getElementById('rtClose').onclick=function(){window.__hcCloseMotion?window.__hcCloseMotion(m):m.remove()};m.onclick=function(e){if(e.target===m){window.__hcCloseMotion?window.__hcCloseMotion(m):m.remove()}}"
  );
  return out.replace('</head>', APP_MOTION_CSS + '</head>').replace('</body>', APP_MOTION_SCRIPT + '</body>');
}
