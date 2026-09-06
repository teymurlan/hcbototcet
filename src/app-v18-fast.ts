import { APP as BASE_APP } from './app-v16-keyboard';

function replaceBetween(src:string,start:string,end:string,replacement:string){
  const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
  if(a<0||b<0)throw new Error('app-v18 patch markers not found');
  return src.slice(0,a)+replacement+src.slice(b);
}

let app=replaceBetween(
  BASE_APP,
  'async function bestGeo(){',
  'async function begin(){',
  "async function bestGeo(){return {lat:0,lon:0,accuracy:0}}\n"
);

app=app
  .replace("<strong>GPS:</strong> приложение автоматически определит сотрудника, время и местоположение.","<strong>Адрес:</strong> используется указанный выше. GPS не требуется и не блокирует работу.")
  .replace("busy('Определяем местоположение','Ищем лучший доступный GPS-сигнал…')","busy('Создаём фотоотчёт','Сохраняем данные объекта…')")
  .replace("busy('Завершаем фотоотчёт','Проверяем местоположение и сохраняем результат…')","busy('Завершаем фотоотчёт','Сохраняем результат…')");

export const APP=app;
