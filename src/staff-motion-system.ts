const APP_MOTION_CSS = String.raw`
<style>
/* HOUSE CLEANING STAFF motion system: event-driven, transform/opacity first. */
.navin{position:relative!important;isolation:isolate!important}.navin .hc-nav-indicator{position:absolute;left:0;top:7px;height:calc(100% - 14px);width:0;border-radius:22px;background:linear-gradient(145deg,rgba(231,241,255,.98),rgba(239,249,255,.94));border:1px solid rgba(178,207,246,.72);box-shadow:0 7px 20px rgba(47,109,246,.10);pointer-events:none;z-index:0;opacity:0;transform:translate3d(0,0,0);transition:transform .28s cubic-bezier(.2,.78,.22,1),width .22s cubic-bezier(.2,.78,.22,1),opacity .16s ease}.navin .hc-nav-indicator.on{opacity:1}.navin>button{position:relative;z-index:1;transition:transform .16s ease,color .2s ease,opacity .18s ease!important}.navin>button.on{background:transparent!important}

.filter,.rt-filterbar button,.toolbar button,.chip,.team-state{transition:transform .16s ease,opacity .18s ease,background-color .2s ease,border-color .2s ease,color .2s ease!important}.filter:active,.rt-filterbar button:active,.toolbar button:active{transform:scale(.975)}.filter.on,.rt-filterbar button.on{animation:hcFilterIn .2s cubic-bezier(.2,.72,.24,1) both}.chip.hc-status-chip,.team-state{animation:hcStateIn .18s ease both}
.notice-card.warning,.attention.red,.dangerbox{animation:hcWarningIn .24s ease both}.readonly-box,.notice-card.success{animation:hcSuccessIn .22s ease both}

.hc-toast-host{position:fixed;left:14px;right:14px;bottom:calc(104px + env(safe-area-inset-bottom));z-index:14000;display:grid;justify-items:center;gap:8px;pointer-events:none}.hc-toast{width:min(520px,100%);display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:17px;background:rgba(24,34,50,.94);color:#fff;border:1px solid rgba(255,255,255,.14);box-shadow:0 16px 42px rgba(21,34,54,.24);backdrop-filter:blur(14px) saturate(135%);-webkit-backdrop-filter:blur(14px) saturate(135%);font-size:13px;font-weight:720;line-height:1.42;opacity:0;transform:translateY(10px) scale(.985);transition:opacity .2s ease,transform .24s cubic-bezier(.2,.72,.24,1)}.hc-toast.on{opacity:1;transform:none}.hc-toast.out{opacity:0;transform:translateY(6px) scale(.99)}.hc-toast:before{content:'✓';display:grid;place-items:center;flex:0 0 22px;width:22px;height:22px;border-radius:50%;background:#1ba568;color:#fff;font-size:12px;font-weight:900}.hc-toast.warn:before{content:'!';background:#e18a19}.hc-toast.error:before{content:'×';background:#d54a4a}.hc-toast.info:before{content:'i';background:#3476ff}

#main.hc-motion-ready.hc-direction-back>.hero,#main.hc-motion-ready.hc-direction-back>.section-title,#main.hc-motion-ready.hc-direction-back>.card,#main.hc-motion-ready.hc-direction-back>.grid,#main.hc-motion-ready.hc-direction-back>.search,#main.hc-motion-ready.hc-direction-back>.toolbar,#main.hc-motion-ready.hc-direction-back>.std-intro{animation-name:hcScreenBack!important}
#main.hc-motion-ready .metric,#main.hc-motion-ready .order-card,#main.hc-motion-ready .task-card,#main.hc-motion-ready .employee,#main.hc-motion-ready .notice-card{will-change:auto}

.rt-modal{transition:opacity .18s ease!important}.rt-sheet,.hc-access-sheet{transition:transform .24s cubic-bezier(.2,.72,.24,1),opacity .2s ease!important}.hc-viewer-media img,.hc-viewer-media video{animation:hcMediaIn .22s ease both}.loading-media,.hc-media-skeleton{opacity:.72;transition:opacity .18s ease}.hc-media img,.hc-media video,.media img,.media video{transition:opacity .22s ease,transform .22s ease}

details>summary{cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .15s ease,opacity .18s ease}details>summary:active{transform:scale(.99)}details[open]>*:not(summary){animation:hcAccordionIn .2s ease both}

@keyframes hcFilterIn{from{opacity:.72;transform:scale(.97)}to{opacity:1;transform:none}}@keyframes hcStateIn{from{opacity:.55;transform:translateY(2px)}to{opacity:1;transform:none}}@keyframes hcWarningIn{from{opacity:.62;transform:translateY(4px)}to{opacity:1;transform:none}}@keyframes hcSuccessIn{from{opacity:.66;transform:translateY(4px)}to{opacity:1;transform:none}}@keyframes hcScreenBack{from{opacity:0;transform:translateX(-7px)}to{opacity:1;transform:none}}@keyframes hcAccordionIn{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}

@media(prefers-reduced-motion:reduce){.hc-nav-indicator,.hc-toast,.filter,.rt-filterbar button,.toolbar button,.chip,.team-state,details>*{animation:none!important;transition-duration:.01ms!important}#main.hc-motion-ready.hc-direction-back>*{animation:none!important}}
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
  function indicator(){navFrame=0;var box=document.getElementById('navin');if(!box)return;var on=box.querySelector('button.on');if(!on)return;var ind=box.querySelector('.hc-nav-indicator');if(!ind){ind=document.createElement('div');ind.className='hc-nav-indicator';ind.setAttribute('aria-hidden','true');box.insertBefore(ind,box.firstChild)}ind.style.width=on.offsetWidth+'px';ind.style.transform='translate3d('+on.offsetLeft+'px,0,0)';ind.classList.add('on')}
  function queueIndicator(){if(navFrame)return;navFrame=requestAnimationFrame(indicator)}
  function markDirection(back){var main=document.getElementById('main');if(!main)return;main.classList.toggle('hc-direction-back',!!back);main.classList.toggle('hc-direction-forward',!back);if(dirTimer)clearTimeout(dirTimer);dirTimer=setTimeout(function(){main.classList.remove('hc-direction-back','hc-direction-forward')},420)}
  function tactile(target){if(!target)return;var hit=target.closest&&target.closest('.btn,.filter,.rt-filterbar button,#nav button,.rt-close,.hc-media,summary');if(!hit)return;haptic('light')}
  document.addEventListener('pointerup',function(e){tactile(e.target)},{passive:true,capture:true});
  document.addEventListener('click',function(e){var b=e.target&&e.target.closest&&e.target.closest('.back');if(b)markDirection(true);else if(e.target&&e.target.closest&&e.target.closest('#nav button'))markDirection(false);queueIndicator()},true);
  document.addEventListener('hc:after-render',queueIndicator,true);
  window.addEventListener('pageshow',queueIndicator);
  window.addEventListener('resize',queueIndicator,{passive:true});
  queueIndicator();
})();
</script>`;

export function applyStaffMotionSystem(app:string):string {
  let out=app;
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
  return out.replace('</head>', APP_MOTION_CSS + '</head>').replace('</body>', APP_MOTION_SCRIPT + '</body>');
}
