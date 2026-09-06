import { APP as BASE } from './app-v15';

export const APP=BASE.replace(
  "function renderGuide(){hero(2,'Как делать фотоотчёт','Короткая инструкция');",
  "function renderGuide(){$('hero').style.display='none';"
);
