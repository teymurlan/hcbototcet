export const APP = String.raw`<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
  <meta name="theme-color" content="#0d1422">
  <title>House Cleaning · Фотоотчёты</title>
  <style>
    :root{--bg:#f3f6fb;--card:#fff;--text:#111827;--muted:#6b7280;--line:#e5e7eb;--brand:#0ca66d;--brand2:#078958;--dark:#0d1422;--danger:#b42318;--ok:#067647}
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
    body{padding-bottom:calc(92px + env(safe-area-inset-bottom))}
    button,input,textarea,select{font:inherit}button{cursor:pointer}
    .shell{max-width:640px;margin:auto;padding:14px}
    .hero{background:linear-gradient(135deg,#0d1422,#17263f 68%,#0d6b4c);border-radius:25px;color:#fff;padding:20px;box-shadow:0 16px 38px rgba(13,20,34,.16)}
    .brand{font-size:11px;letter-spacing:2.5px;font-weight:900;opacity:.72}.hero h1{font-size:30px;line-height:1.05;margin:8px 0 8px}.hero p{margin:0;color:#cbd5e1;line-height:1.45;font-size:14px}
    .status{display:flex;align-items:center;gap:7px;margin-top:14px;font-size:12px;color:#d1fae5}.dot{width:8px;height:8px;border-radius:50%;background:#34d399;box-shadow:0 0 0 5px rgba(52,211,153,.12)}
    .who{display:none;margin-top:12px;background:rgba(255,255,255,.08);padding:9px 11px;border-radius:12px;font-size:12px}
    .steps{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:12px 0}.step{border:1px solid var(--line);background:var(--card);border-radius:13px;padding:9px 5px;text-align:center;color:var(--muted);font-size:10px;font-weight:800}.step b{display:block;color:var(--text);font-size:12px;margin-bottom:2px}.step.done{background:#ecfdf3;border-color:#abefc6;color:#067647}.step.done b{color:#067647}
    .card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:15px;margin-top:11px;box-shadow:0 5px 22px rgba(15,23,42,.035)}
    .head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:12px}.title{font-size:17px;font-weight:900}.badge{font-size:10px;font-weight:900;padding:6px 8px;border-radius:999px;background:#eef2ff;color:#4338ca}.badge.green{background:#ecfdf3;color:#067647}.badge.blue{background:#eff8ff;color:#175cd3}
    .field{margin-top:11px}.field:first-child{margin-top:0}label{display:block;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:6px}
    input,textarea,select{width:100%;border:1px solid var(--line);background:#f8fafc;color:var(--text);border-radius:13px;padding:13px;outline:none}input:focus,textarea:focus,select:focus{background:#fff;border-color:#72d4ae;box-shadow:0 0 0 4px rgba(12,166,109,.09)}textarea{min-height:84px;resize:vertical}.row{display:grid;grid-template-columns:1fr 1fr;gap:9px}
    .drop{width:100%;border:1.5px dashed #aeb8c5;background:#f8fafc;border-radius:15px;padding:17px 12px;text-align:center;color:var(--text)}.drop strong{display:block}.drop span{display:block;color:var(--muted);font-size:11px;margin-top:4px}.plus{width:38px;height:38px;border-radius:12px;background:#e8f8f1;color:#087a50;display:grid;place-items:center;margin:0 auto 8px;font-size:23px;font-weight:500}.drop.blue .plus{background:#eaf2ff;color:#175cd3}
    .hidden{display:none!important}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:9px}.thumb{position:relative;aspect-ratio:1;border-radius:12px;overflow:hidden;background:#e5e7eb}.thumb img{width:100%;height:100%;object-fit:cover;display:block}.remove{position:absolute;top:5px;right:5px;width:27px;height:27px;border:0;border-radius:50%;background:rgba(17,24,39,.82);color:white;font-size:18px;line-height:1}.count{font-size:11px;color:var(--muted);margin-top:8px}
    .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:12px}.stat{background:#f8fafc;border:1px solid var(--line);border-radius:13px;padding:10px;text-align:center}.stat b{display:block;font-size:18px}.stat span{font-size:10px;color:var(--muted)}
    .msg{display:none;margin-top:11px;padding:11px 12px;border-radius:13px;font-size:12px;line-height:1.4}.msg.err{display:block;background:#fff1f3;color:#9f1239;border:1px solid #fecdd6}.msg.ok{display:block;background:#ecfdf3;color:#067647;border:1px solid #abefc6}
    .hint{font-size:11px;color:var(--muted);line-height:1.45;margin-top:10px}
    .bottom{position:fixed;z-index:20;left:0;right:0;bottom:0;padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:rgba(243,246,251,.93);backdrop-filter:blur(18px);border-top:1px solid rgba(229,231,235,.9)}.bottomIn{max-width:640px;margin:auto;display:flex;gap:8px}.send{flex:1;border:0;border-radius:14px;padding:14px;background:linear-gradient(135deg,var(--brand),var(--brand2));color:#fff;font-weight:900}.send:disabled{opacity:.55}.reset{border:1px solid var(--line);background:#fff;color:var(--text);border-radius:14px;padding:0 13px;font-weight:900}
    .boot{position:fixed;z-index:50;inset:0;background:var(--bg);display:grid;place-items:center;pointer-events:none;animation:bootAway .65s ease .45s forwards}.bootBox{text-align:center;color:var(--muted)}.mark{width:54px;height:54px;border-radius:17px;background:var(--dark);color:#fff;display:grid;place-items:center;margin:0 auto 10px;font-weight:900}.boot strong{display:block;color:var(--text)}
    @keyframes bootAway{to{opacity:0;visibility:hidden}}
    @media(max-width:410px){.row{grid-template-columns:1fr}.hero h1{font-size:27px}.steps{gap:5px}.step{font-size:9px}}
    @media(prefers-color-scheme:dark){:root{--bg:#0d1420;--card:#141d2b;--text:#f8fafc;--muted:#9ba7b6;--line:#273448}.card,.step{box-shadow:none}.step{background:#141d2b}input,textarea,select,.drop,.stat{background:#101824;color:#f8fafc}.reset{background:#141d2b;color:#fff}.bottom{background:rgba(13,20,32,.93)}}
  </style>
</head>
<body>
  <div class="boot" id="boot"><div class="bootBox"><div class="mark">HC</div><strong>House Cleaning</strong><div style="margin-top:5px">Открываем фотоотчёты</div></div></div>
  <main class="shell">
    <section class="hero">
      <div class="brand">HOUSE CLEANING</div><h1>Фотоотчёты</h1>
      <p>Добавьте объект, фотографии до и после уборки. Отчёт сразу поступит администратору.</p>
      <div class="status"><i class="dot"></i><span id="sdkStatus">Приложение готово</span></div>
      <div class="who" id="who"></div>
    </section>
    <div class="steps"><div class="step" id="s1"><b>01</b>Объект</div><div class="step" id="s2"><b>02</b>ДО</div><div class="step" id="s3"><b>03</b>ПОСЛЕ</div><div class="step" id="s4"><b>04</b>Готово</div></div>

    <section class="card"><div class="head"><div class="title">Объект и работа</div><span class="badge">Обязательно</span></div>
      <div class="field"><label for="object">Название объекта</label><input id="object" maxlength="120" placeholder="Например: ЖК Северная Долина, кв. 120"></div>
      <div class="field"><label for="address">Адрес</label><input id="address" maxlength="180" placeholder="Улица, дом, корпус"></div>
      <div class="field row"><div><label for="type">Тип уборки</label><select id="type"><option>Поддерживающая</option><option>Генеральная</option><option>После ремонта</option><option>Коммерческая</option><option>Другое</option></select></div><div><label for="team">Бригада / сотрудник</label><input id="team" maxlength="100" placeholder="Можно не заполнять"></div></div>
    </section>

    <section class="card"><div class="head"><div class="title">Фото ДО</div><span class="badge green" id="beforeBadge">0 фото</span></div><button type="button" class="drop" id="beforeDrop"><div class="plus">+</div><strong>Добавить фотографии ДО</strong><span>Состояние объекта перед уборкой</span></button><input class="hidden" id="before" type="file" accept="image/*" multiple><div class="grid" id="beforeGrid"></div><div class="count" id="beforeCount">Нужно минимум 1 фото</div></section>

    <section class="card"><div class="head"><div class="title">Фото ПОСЛЕ</div><span class="badge blue" id="afterBadge">0 фото</span></div><button type="button" class="drop blue" id="afterDrop"><div class="plus">+</div><strong>Добавить фотографии ПОСЛЕ</strong><span>Итоговый результат уборки</span></button><input class="hidden" id="after" type="file" accept="image/*" multiple><div class="grid" id="afterGrid"></div><div class="count" id="afterCount">Нужно минимум 1 фото</div></section>

    <section class="card"><div class="head"><div class="title">Комментарий</div><span class="badge">Необязательно</span></div><textarea id="comment" maxlength="700" placeholder="Что выполнено, замечания, особенности объекта"></textarea><div class="summary"><div class="stat"><b id="sumBefore">0</b><span>фото ДО</span></div><div class="stat"><b id="sumAfter">0</b><span>фото ПОСЛЕ</span></div><div class="stat"><b id="sumTotal">0</b><span>всего</span></div></div><div class="hint">Максимум 20 фотографий, до 9 МБ каждая.</div><div id="msg" class="msg"></div></section>
  </main>
  <div class="bottom"><div class="bottomIn"><button id="reset" class="reset" type="button">Сбросить</button><button id="send" class="send" type="button">Отправить фотоотчёт</button></div></div>

  <script>
  (function(){
    var S={before:[],after:[],sending:false};
    var LIMIT=20,MAX=9*1024*1024;
    function $(id){return document.getElementById(id)}
    function tg(){return window.Telegram&&window.Telegram.WebApp?window.Telegram.WebApp:null}
    function setStatus(t){$('sdkStatus').textContent=t}
    function haptic(type){try{var T=tg();if(T&&T.HapticFeedback)T.HapticFeedback.impactOccurred(type||'light')}catch(e){}}
    function show(text,ok){var el=$('msg');el.textContent=text;el.className='msg '+(ok?'ok':'err');el.scrollIntoView({behavior:'smooth',block:'nearest'})}
    function clear(){var el=$('msg');el.textContent='';el.className='msg'}
    function mark(){var o=$('object').value.trim();$('s1').classList.toggle('done',!!o);$('s2').classList.toggle('done',S.before.length>0);$('s3').classList.toggle('done',S.after.length>0);$('beforeBadge').textContent=S.before.length+' фото';$('afterBadge').textContent=S.after.length+' фото';$('beforeCount').textContent=S.before.length?'Добавлено: '+S.before.length:'Нужно минимум 1 фото';$('afterCount').textContent=S.after.length?'Добавлено: '+S.after.length:'Нужно минимум 1 фото';$('sumBefore').textContent=String(S.before.length);$('sumAfter').textContent=String(S.after.length);$('sumTotal').textContent=String(S.before.length+S.after.length)}
    function render(kind){var g=$(kind+'Grid');g.innerHTML='';S[kind].forEach(function(file,index){var d=document.createElement('div');d.className='thumb';var im=document.createElement('img');var u=URL.createObjectURL(file);im.src=u;im.onload=function(){URL.revokeObjectURL(u)};var b=document.createElement('button');b.type='button';b.className='remove';b.textContent='×';b.onclick=function(){S[kind].splice(index,1);render(kind);haptic('light')};d.appendChild(im);d.appendChild(b);g.appendChild(d)});mark();clear()}
    function add(kind,list){var files=Array.prototype.slice.call(list||[]);if(!files.length)return;for(var i=0;i<files.length;i++){if(String(files[i].type||'').indexOf('image/')!==0)return show('Можно загружать только изображения.',false);if(files[i].size>MAX)return show('Одно из фото больше 9 МБ.',false)}if(S.before.length+S.after.length+files.length>LIMIT)return show('Максимум 20 фото в одном отчёте.',false);Array.prototype.push.apply(S[kind],files);render(kind);haptic('medium')}
    function wire(kind){$(kind+'Drop').onclick=function(){$(kind).click()};$(kind).onchange=function(e){add(kind,e.target.files);e.target.value=''}}
    function reset(ask){if(ask&&(S.before.length||S.after.length||$('object').value||$('address').value||$('comment').value)){if(!confirm('Очистить текущий фотоотчёт?'))return}S.before=[];S.after=[];['object','address','team','comment'].forEach(function(id){$(id).value=''});$('type').selectedIndex=0;$('s4').classList.remove('done');render('before');render('after');clear()}
    function attachTelegram(){var T=tg();if(!T){setStatus('Telegram подключается');return}try{T.ready();T.expand();if(T.disableVerticalSwipes)T.disableVerticalSwipes()}catch(e){}var u=T.initDataUnsafe&&T.initDataUnsafe.user;if(u){var n=[u.first_name,u.last_name].filter(Boolean).join(' ')||u.username||('ID '+u.id);$('who').textContent='Сотрудник: '+n;$('who').style.display='block'}setStatus('Telegram подключён')}
    function loadTelegramSdk(){if(tg()){attachTelegram();return}var s=document.createElement('script');s.src='https://telegram.org/js/telegram-web-app.js';s.async=true;s.onload=attachTelegram;s.onerror=function(){setStatus('Telegram SDK недоступен, форма открыта')};document.head.appendChild(s);setTimeout(function(){if(!tg())setStatus('Telegram SDK загружается')},1800)}

    wire('before');wire('after');$('object').addEventListener('input',mark);$('reset').onclick=function(){reset(true)};
    $('send').onclick=async function(){if(S.sending)return;clear();var object=$('object').value.trim();if(!object)return show('Укажите название объекта.',false);if(!S.before.length)return show('Добавьте минимум 1 фото ДО.',false);if(!S.after.length)return show('Добавьте минимум 1 фото ПОСЛЕ.',false);var T=tg();if(!T||!T.initData)return show('Telegram ещё не подключился. Закройте приложение и откройте его снова из бота.',false);var fd=new FormData();fd.append('object',object);fd.append('address',$('address').value.trim());fd.append('type',$('type').value);fd.append('team',$('team').value.trim());fd.append('comment',$('comment').value.trim());S.before.forEach(function(f){fd.append('before',f,f.name||'before.jpg')});S.after.forEach(function(f){fd.append('after',f,f.name||'after.jpg')});S.sending=true;$('send').disabled=true;$('reset').disabled=true;$('send').textContent='Отправляем';try{var r=await fetch('/api/report',{method:'POST',headers:{'X-Telegram-Init-Data':T.initData},body:fd});var data={};try{data=await r.json()}catch(e){}if(!r.ok||!data.ok)throw new Error(data.error||'Не удалось отправить отчёт.');$('s4').classList.add('done');S.before=[];S.after=[];render('before');render('after');show('Фотоотчёт '+(data.report_id||'')+' отправлен администратору.',true);haptic('heavy')}catch(e){show(e&&e.message?e.message:'Ошибка отправки.',false)}finally{S.sending=false;$('send').disabled=false;$('reset').disabled=false;$('send').textContent='Отправить фотоотчёт'}};
    mark();loadTelegramSdk();
  })();
  </script>
</body>
</html>`;
