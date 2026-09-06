import { APP as BASE } from './app-v7';

const OLD_GEO = "function geo(){return new Promise(function(ok,no){if(!navigator.geolocation)return no(Error('Геопозиция недоступна'));navigator.geolocation.getCurrentPosition(function(p){ok({lat:p.coords.latitude,lon:p.coords.longitude,accuracy:p.coords.accuracy})},function(){no(Error('Разрешите доступ к геопозиции'))},{enableHighAccuracy:true,timeout:18000,maximumAge:0})})}";

const NEW_GEO = `function geo(){return new Promise(function(ok,no){
  function browserGeo(){
    if(!navigator.geolocation)return no(Error('Геопозиция недоступна'));
    navigator.geolocation.getCurrentPosition(function(p){
      ok({lat:p.coords.latitude,lon:p.coords.longitude,accuracy:Number(p.coords.accuracy||9999),source:'browser'})
    },function(){no(Error('Разрешите доступ к геопозиции'))},{enableHighAccuracy:true,timeout:18000,maximumAge:0})
  }
  try{
    var lm=T&&T.LocationManager;
    if(lm&&typeof lm.init==='function'&&typeof lm.getLocation==='function'){
      lm.init(function(){
        if(!lm.isLocationAvailable)return browserGeo();
        lm.getLocation(function(p){
          if(!p)return browserGeo();
          ok({lat:Number(p.latitude),lon:Number(p.longitude),accuracy:Number(p.horizontal_accuracy||9999),source:'telegram'})
        })
      });
      return;
    }
  }catch(e){}
  browserGeo();
})}`;

export const APP = BASE
  .replace(OLD_GEO, NEW_GEO)
  .replace("(function(){var T=null,S={job:null,files:[],upload:0,stage:''};", "(function(){var T=null,LAUNCH=new URLSearchParams(location.search).get('launch')||'',S={job:null,files:[],upload:0,stage:''};")
  .replace("function H(){return{'X-Telegram-Init-Data':T&&T.initData?T.initData:''}}", "function H(){return{'X-Telegram-Init-Data':T&&T.initData?T.initData:'','X-App-Launch-Token':LAUNCH}}")
  .replace("if(!T||!T.initData){status('Нет Telegram-сессии'", "if((!T||!T.initData)&&!LAUNCH){status('Нет Telegram-сессии'")
  .replace("Геопозиция недостаточно точная", "Геопозиция приблизительная");
