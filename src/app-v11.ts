import { APP as BASE } from './app-v10';

let app = BASE;

app = app.replace(
  "S={job:null,files:[],upload:0,stage:''}",
  "S={job:null,files:[],upload:0,stage:'',showAfter:new URLSearchParams(location.search).get('after')==='1'}"
);

app = app.replace(
  "function render(){var j=S.job;if(S.waitTimer){clearInterval(S.waitTimer);S.waitTimer=null}if(!j||j.stage==='done')return start();if(j.stage==='started')return before();if(new URLSearchParams(location.search).get('after')==='1')return after();return waiting()}",
  "function render(){var j=S.job;if(S.waitTimer){clearInterval(S.waitTimer);S.waitTimer=null}if(!j||j.stage==='done')return start();if(j.stage==='started')return before();if(S.showAfter)return after();return waiting()}"
);

app = app.replace(
  "$('go').onclick=after;function tick()",
  "$('go').onclick=function(){S.showAfter=true;after()};function tick()"
);

app = app.replace(
  "S.job=x.job;render();M('ДО принято. Теперь выполните уборку и отправьте ПОСЛЕ.',true)",
  "S.job=x.job;S.showAfter=false;waiting();M('ДО принято. Выполните уборку по регламенту, затем нажмите «Перейти к фото ПОСЛЕ».',true)"
);

export const APP = app;
