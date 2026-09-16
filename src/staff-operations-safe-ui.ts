import { STAFF_OPERATIONS_APP } from './staff-operations-ui';

/*
 * Final safety layer for the parallel-report UI.
 * Keep multipart uploads free of a manual Content-Type header so iOS/WebKit
 * can add the required boundary. Also keep registration FIO intentionally
 * blank: Telegram profile names are not a reliable legal/working name.
 */

const rawUpload = `var __tg=window.Telegram&&window.Telegram.WebApp;var __h={'X-App-Launch-Token':new URLSearchParams(location.search).get('launch')||'','X-Telegram-Init-Data':__tg&&__tg.initData||''};var __r=await window.fetch('/api/media/draft',{method:'POST',headers:__h,body:fd});var __x=await __r.json().catch(function(){return{error:'Ошибка загрузки'}});if(!__r.ok||__x.ok===false)throw Error(__x.error||'Не удалось загрузить файл');`;

let patched = STAFF_OPERATIONS_APP
  .replace("await api('/api/media/draft',{method:'POST',body:fd});", rawUpload)
  .replace("var u=s.user||{},name=[u.first_name||'',u.last_name||''].join(' ').trim();", "var u=s.user||{},name='';");

const SAFE_STYLE = String.raw`
<style>
/* Small visual cue when a cleaner has several reports in progress. */
.ops-active-count{box-shadow:0 3px 10px rgba(23,105,224,.08)}
</style>`;

patched = patched.replace('</head>', SAFE_STYLE + '</head>');

export const STAFF_OPERATIONS_SAFE_APP = patched;
