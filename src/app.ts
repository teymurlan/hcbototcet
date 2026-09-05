export const APP = String.raw`<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
  <meta name="theme-color" content="#0b1220">
  <title>HOUSE CLEANING · Фотоотчёты</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>
    :root{--bg:#f4f7fb;--card:#fff;--text:#111827;--muted:#6b7280;--line:#e5e7eb;--brand:#12a86b;--brand2:#0b8f5a;--blue:#2563eb;--danger:#dc2626;--shadow:0 12px 34px rgba(15,23,42,.08)}
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
    body{padding-bottom:calc(98px + env(safe-area-inset-bottom))}
    button,input,textarea,select{font:inherit}
    button{cursor:pointer}
    .shell{max-width:640px;margin:0 auto;padding:14px 14px 28px}
    .top{background:linear-gradient(135deg,#0b1220 0%,#15243d 64%,#0b6b4b 140%);color:#fff;border-radius:26px;padding:20px;box-shadow:var(--shadow);overflow:hidden;position:relative}
    .top:after{content:"";position:absolute;width:150px;height:150px;border-radius:50%;right:-58px;top:-66px;background:rgba(255,255,255,.08)}
    .brand{font-size:11px;letter-spacing:3px;font-weight:900;opacity:.78}
    .headline{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-top:8px}
    h1{font-size:30px;line-height:1.05;margin:0;font-weight:900;letter-spacing:-.8px}
    .online{display:inline-flex;align-items:center;gap:6px;font-size:12px;background:rgba(255,255,255,.12);padding:8px 10px;border-radius:999px;white-space:nowrap}
    .dot{width:7px;height:7px;background:#41dd91;border-radius:50%;box-shadow:0 0 0 4px rgba(65,221,145,.12)}
    .sub{font-size:14px;line-height:1.45;opacity:.78;margin:12px 0 0;max-width:440px}
    .who{display:none;margin-top:14px;font-size:13px;background:rgba(255,255,255,.09);padding:10px 12px;border-radius:12px}
    .steps{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:14px 0}
    .step{background:#fff;border:1px solid var(--line);border-radius:14px;padding:10px 6px;text-align:center;font-size:11px;color:var(--muted);font-weight:800}
    .step b{display:block;color:var(--text);font-size:13px;margin-bottom:2px}
    .step.done{border-color:#b7ead2;background:#effbf5;color:#277553}.step.done b{color:#0d7f4d}
    .card{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:16px;margin-top:12px;box-shadow:0 6px 24px rgba(15,23,42,.035)}
    .cardHead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:13px}
    .cardTitle{font-weight:900;font-size:17px}.badge{font-size:11px;font-weight:900;border-radius:999px;padding:6px 8px;background:#eef2ff;color:#4338ca}
    .badge.green{background:#ecfdf5;color:#087747}.badge.blue{background:#eff6ff;color:#1d4ed8}
    .field{margin-top:12px}.field:first-child{margin-top:0}
    label{display:block;font-size:11px;color:var(--muted);font-weight:900;text-transform:uppercase;letter-spacing:.55px;margin-bottom:7px}
    input,textarea,select{width:100%;border:1px solid var(--line);background:#f8fafc;color:var(--text);border-radius:14px;padding:14px;outline:none;transition:.15s}
    input:focus,textarea:focus,select:focus{border-color:#8fd8b7;background:#fff;box-shadow:0 0 0 4px rgba(18,168,107,.09)}
    textarea{min-height:88px;resize:vertical}.row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .drop{border:1.5px dashed #b9c1cc;background:#f8fafc;border-radius:17px;padding:18px 14px;text-align:center;transition:.15s}
    .drop:active{transform:scale(.99);background:#f1f5f9}.dropIcon{width:42px;height:42px;border-radius:13px;margin:0 auto 9px;display:grid;place-items:center;font-size:22px;background:#eaf8f1}
    .drop.blue .dropIcon{background:#eaf2ff}.drop strong{display:block;font-size:15px}.drop span{display:block;font-size:12px;color:var(--muted);margin-top:4px;line-height:1.35}
    .hidden{display:none!important}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}
    .thumb{position:relative;aspect-ratio:1/1;border-radius:13px;overflow:hidden;background:#e5e7eb}.thumb img{width:100%;height:100%;object-fit:cover;display:block}
    .remove{position:absolute;top:5px;right:5px;border:0;background:rgba(17,24,39,.82);color:#fff;width:28px;height:28px;border-radius:50%;font-size:18px;line-height:1}
    .counter{margin-top:9px;font-size:12px;color:var(--muted)}
    .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.stat{background:#f8fafc;border:1px solid var(--line);border-radius:14px;padding:12px;text-align:center}.stat b{display:block;font-size:19px}.stat span{font-size:11px;color:var(--muted)}
    .notice{font-size:12px;color:var(--muted);line-height:1.45;margin-top:11px}.notice strong{color:var(--text)}
    .msg{display:none;border-radius:14px;padding:12px 13px;margin-top:12px;font-size:13px;line-height:1.4}.msg.ok{display:block;background:#ecfdf5;color:#086c43;border:1px solid #b7ead2}.msg.err{display:block;background:#fff1f2;color:#9f1239;border:1px solid #fecdd3}
    .bottom{position:fixed;z-index:20;left:0;right:0;bottom:0;background:rgba(244,247,251,.92);backdrop-filter:blur(18px);border-top:1px solid rgba(229,231,235,.9);padding:10px 14px calc(10px + env(safe-area-inset-bottom))}
    .bottomIn{max-width:640px;margin:auto;display:flex;gap:9px}.send{flex:1;border:0;border-radius:15px;padding:15px 16px;background:linear-gradient(135deg,var(--brand),var(--brand2));color:#fff;font-weight:900;font-size:15px;box-shadow:0 9px 24px rgba(18,168,107,.25)}
    .send:disabled{opacity:.55;box-shadow:none}.reset{border:1px solid var(--line);border-radius:15px;background:#fff;color:var(--text);padding:0 14px;font-weight:900}
    .cover{position:fixed;inset:0;z-index:50;background:var(--bg);display:grid;place-items:center;padding:24px}.loader{text-align:center;color:var(--muted)}.loaderMark{width:54px;height:54px;border-radius:17px;background:#0b1220;color:#fff;display:grid;place-items:center;margin:0 auto 12px;font-weight:900;letter-spacing:-1px}
    @media(max-width:410px){h1{font-size:27px}.row{grid-template-columns:1fr}.step{font-size:10px}.step b{font-size:12px}.grid{grid-template-columns:repeat(3,1fr)}}
    @media(prefers-color-scheme:dark){:root{--bg:#0e131d;--card:#151c28;--text:#f8fafc;--muted:#9aa4b2;--line:#273244}.card,.step{box-shadow:none}.step{background:#151c28}.field input,.field textarea,.field select,.drop,.stat{background:#111824;color:var(--text)}.bottom{background:rgba(14,19,29,.92)}.reset{background:#151c28;color:#fff}.drop{border-color:#364154}}
  </style>
</head>
<body>
  <div id="cover" class="cover"><div class="loader"><div class="loaderMark">HC</div><b>HOUSE CLEANING</b><div style="margin-top:6px">Открываем фотоотчёты…</div></div></div>
  <main class="shell" id="app" aria-hidden="true">
    <section class="top">
      <div class="brand">HOUSE CLEANING</div>
      <div class="headline"><h1>Фотоотчёты</h1><div class="online"><i class="dot"></i> Сервис работает</div></div>
      <p class="sub">Один аккуратный отчёт: объект, фото ДО, фото ПОСЛЕ и комментарий. После отправки администратор сразу получает материалы.</p>
      <div id="who" class="who"></div>
    </section>

    <div class="steps">
      <div class="step" id="s1"><b>01</b>Объект</div>
      <div class="step" id="s2"><b>02</b>ДО</div>
      <div class="step" id="s3"><b>03</b>ПОСЛЕ</div>
      <div class="step" id="s4"><b>04</b>Готово</div>
    </div>

    <section class="card">
      <div class="cardHead"><div class="cardTitle">Объект и работа</div><span class="badge">Обязательно</span></div>
      <div class="field"><label for="object">Название объекта</label><input id="object" maxlength="120" placeholder="Например: ЖК Северная Долина, кв. 120"></div>
      <div class="field"><label for="address">Адрес</label><input id="address" maxlength="180" placeholder="Улица, дом, корпус"></div>
      <div class="field row">
        <div><label for="type">Тип уборки</label><select id="type"><option>Поддерживающая</option><option>Генеральная</option><option>После ремонта</option><option>Коммерческая</option><option>Другое</option></select></div>
        <div><label for="team">Бригада / сотрудник</label><input id="team" maxlength="100" placeholder="Можно не заполнять"></div>
      </div>
    </section>

    <section class="card">
      <div class="cardHead"><div class="cardTitle">Фото ДО</div><span id="beforeBadge" class="badge green">0 фото</span></div>
      <button class="drop" id="beforeDrop" type="button"><div class="dropIcon">＋</div><strong>Добавить фотографии ДО</strong><span>Покажите состояние объекта до начала уборки</span></button>
      <input id="before" class="hidden" type="file" accept="image/*" multiple>
      <div id="beforeGrid" class="grid"></div><div id="beforeCount" class="counter">Нужно минимум 1 фото</div>
    </section>

    <section class="card">
      <div class="cardHead"><div class="cardTitle">Фото ПОСЛЕ</div><span id="afterBadge" class="badge blue">0 фото</span></div>
      <button class="drop blue" id="afterDrop" type="button"><div class="dropIcon">＋</div><strong>Добавить фотографии ПОСЛЕ</strong><span>Покажите итоговый результат выполненной уборки</span></button>
      <input id="after" class="hidden" type="file" accept="image/*" multiple>
      <div id="afterGrid" class="grid"></div><div id="afterCount" class="counter">Нужно минимум 1 фото</div>
    </section>

    <section class="card">
      <div class="cardHead"><div class="cardTitle">Комментарий</div><span class="badge">Необязательно</span></div>
      <div class="field"><textarea id="comment" maxlength="700" placeholder="Что было сделано, особенности объекта, замечания"></textarea></div>
      <div class="summary"><div class="stat"><b id="sumBefore">0</b><span>фото ДО</span></div><div class="stat"><b id="sumAfter">0</b><span>фото ПОСЛЕ</span></div><div class="stat"><b id="sumTotal">0</b><span>всего</span></div></div>
      <div class="notice"><strong>Важно:</strong> максимум 20 фотографий в одном отчёте, до 9 МБ каждая. Токен бота в WebApp не передаётся.</div>
      <div id="msg" class="msg"></div>
    </section>
  </main>

  <div class="bottom"><div class="bottomIn"><button id="reset" class="reset" type="button">Сбросить</button><button id="send" class="send" type="button">Отправить фотоотчёт</button></div></div>

  <script>
  (()=>{
    const T=window.Telegram&&window.Telegram.WebApp;
    const S={before:[],after:[],sending:false};
    const $=id=>document.getElementById(id);
    const LIMIT=20,MAX=9*1024*1024;

    try{T&&T.ready();T&&T.expand();T&&T.disableVerticalSwipes&&T.disableVerticalSwipes()}catch(_){ }

    const user=T&&T.initDataUnsafe&&T.initDataUnsafe.user;
    if(user){
      const n=[user.first_name,user.last_name].filter(Boolean).join(' ')||user.username||('ID '+user.id);
      $('who').textContent='Сотрудник: '+n;$('who').style.display='block';
    }

    function haptic(type='light'){try{T&&T.HapticFeedback&&T.HapticFeedback.impactOccurred(type)}catch(_){}}
    function message(text,ok=false){const el=$('msg');el.textContent=text;el.className='msg '+(ok?'ok':'err');el.scrollIntoView({behavior:'smooth',block:'nearest'})}
    function clearMessage(){$('msg').className='msg';$('msg').textContent=''}
    function plural(n){return n===1?'фото':'фото'}
    function mark(){
      const object=$('object').value.trim();
      $('s1').classList.toggle('done',!!object);
      $('s2').classList.toggle('done',S.before.length>0);
      $('s3').classList.toggle('done',S.after.length>0);
      $('beforeBadge').textContent=S.before.length+' '+plural(S.before.length);
      $('afterBadge').textContent=S.after.length+' '+plural(S.after.length);
      $('beforeCount').textContent=S.before.length?('Добавлено: '+S.before.length):'Нужно минимум 1 фото';
      $('afterCount').textContent=S.after.length?('Добавлено: '+S.after.length):'Нужно минимум 1 фото';
      $('sumBefore').textContent=S.before.length;$('sumAfter').textContent=S.after.length;$('sumTotal').textContent=S.before.length+S.after.length;
    }
    function render(kind){
      const g=$(kind+'Grid');g.innerHTML='';
      S[kind].forEach((file,index)=>{
        const d=document.createElement('div');d.className='thumb';
        const img=document.createElement('img');const url=URL.createObjectURL(file);img.src=url;img.onload=()=>URL.revokeObjectURL(url);
        const b=document.createElement('button');b.className='remove';b.type='button';b.textContent='×';b.setAttribute('aria-label','Удалить фото');
        b.onclick=()=>{S[kind].splice(index,1);render(kind);haptic()};
        d.append(img,b);g.append(d);
      });mark();clearMessage();
    }
    function add(kind,list){
      const files=[...list];
      if(!files.length)return;
      const badType=files.find(f=>!String(f.type||'').startsWith('image/'));
      if(badType)return message('Можно загружать только изображения.');
      const tooBig=files.find(f=>f.size>MAX);
      if(tooBig)return message('Одно из фото больше 9 МБ. Выберите фото меньшего размера.');
      if(S.before.length+S.after.length+files.length>LIMIT)return message('В одном отчёте можно отправить максимум 20 фото.');
      S[kind].push(...files);render(kind);haptic('medium');
    }
    function wire(kind){
      $(kind+'Drop').onclick=()=>$(kind).click();
      $(kind).onchange=e=>{add(kind,e.target.files||[]);e.target.value=''};
    }
    wire('before');wire('after');$('object').addEventListener('input',mark);

    function reset(ask=true){
      if(ask&&(S.before.length||S.after.length||$('object').value||$('address').value||$('comment').value)){
        if(!confirm('Очистить текущий фотоотчёт?'))return;
      }
      S.before=[];S.after=[];['object','address','team','comment'].forEach(id=>$(id).value='');$('type').selectedIndex=0;render('before');render('after');$('s4').classList.remove('done');clearMessage();haptic();
    }
    $('reset').onclick=()=>reset(true);

    $('send').onclick=async()=>{
      if(S.sending)return;
      clearMessage();
      const object=$('object').value.trim(),address=$('address').value.trim();
      if(!object)return message('Укажите название объекта.');
      if(!S.before.length)return message('Добавьте минимум 1 фото ДО.');
      if(!S.after.length)return message('Добавьте минимум 1 фото ПОСЛЕ.');
      if(S.before.length+S.after.length>LIMIT)return message('Максимум 20 фото в одном отчёте.');
      if(!T||!T.initData)return message('Откройте фотоотчёты именно через кнопку в Telegram-боте.');

      const fd=new FormData();
      fd.append('object',object);fd.append('address',address);fd.append('type',$('type').value);fd.append('team',$('team').value.trim());fd.append('comment',$('comment').value.trim());
      S.before.forEach(f=>fd.append('before',f,f.name||'before.jpg'));S.after.forEach(f=>fd.append('after',f,f.name||'after.jpg'));

      S.sending=true;$('send').disabled=true;$('reset').disabled=true;$('send').textContent='Отправляем…';haptic('medium');
      try{
        const r=await fetch('/api/report',{method:'POST',headers:{'X-Telegram-Init-Data':T.initData},body:fd});
        let data={};try{data=await r.json()}catch(_){ }
        if(!r.ok||!data.ok)throw new Error(data.error||'Не удалось отправить отчёт.');
        $('s4').classList.add('done');
        S.before=[];S.after=[];render('before');render('after');
        message('Фотоотчёт '+(data.report_id||'')+' отправлен администратору.',true);haptic('heavy');
      }catch(err){message(err&&err.message?err.message:'Ошибка отправки. Попробуйте ещё раз.');try{T&&T.HapticFeedback&&T.HapticFeedback.notificationOccurred('error')}catch(_){}}
      finally{S.sending=false;$('send').disabled=false;$('reset').disabled=false;$('send').textContent='Отправить фотоотчёт'}
    };

    mark();
    setTimeout(()=>{$('cover').classList.add('hidden');$('app').setAttribute('aria-hidden','false')},180);
  })();
  </script>
</body>
</html>`;
