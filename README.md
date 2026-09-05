# House Cleaning · Telegram Photo Reports

Рабочий Telegram Mini App для фотоотчётов сотрудников House Cleaning.

## Что умеет

- открывается внутри Telegram как WebApp / Mini App;
- сотрудник указывает объект, адрес, тип уборки и бригаду;
- обязательные отдельные фотографии **ДО** и **ПОСЛЕ**;
- предпросмотр и удаление выбранных фотографий до отправки;
- до 20 изображений в одном отчёте, до 9 МБ каждое;
- проверяет подлинность `Telegram.WebApp.initData` на сервере;
- отправляет администратору карточку отчёта и отдельные альбомы ДО/ПОСЛЕ;
- генерирует уникальный ID отчёта;
- `/health` показывает состояние конфигурации без раскрытия секретов;
- `/setup` настраивает webhook, команды и кнопку WebApp.

## Стек

- Cloudflare Workers
- TypeScript
- Telegram Bot API
- Telegram Mini Apps API
- без внешних runtime-зависимостей

## Cloudflare secrets / variables

Обязательные:

- `TELEGRAM_BOT_TOKEN` — токен от BotFather. Хранить только как secret.
- `ADMIN_IDS` — Telegram ID администраторов через запятую.
- `SETUP_SECRET` — случайный секрет для одноразового `/setup`.

Рекомендуемые:

- `WEBAPP_URL` — публичный HTTPS URL Worker, например `https://hcbototcet.<account>.workers.dev/`.
- `TELEGRAM_WEBHOOK_SECRET` — дополнительная проверка запросов webhook от Telegram.
- `ALLOWED_USER_IDS` — если задан, только перечисленные Telegram ID смогут отправлять отчёты.

Никогда не добавляйте реальные секреты в GitHub.

## Команды

```bash
npm install
npm run dev
npm run deploy
```

## Первый запуск

После деплоя откройте в браузере:

```text
https://<WORKER_URL>/setup?key=<SETUP_SECRET>
```

В ответе должны быть `ok: true`, успешный `setWebhook`, `setChatMenuButton` и `setMyCommands`.

Проверка Worker:

```text
https://<WORKER_URL>/health
```

После этого откройте бота в Telegram и отправьте `/start`.

## Production

Основной Worker проекта должен деплоиться из ветки `main`. Production URL: `https://hcbototcet.teymurlannn.workers.dev/`.

## Безопасность

Токен Telegram никогда не передаётся в браузер. Mini App отправляет только подписанный Telegram `initData`; Worker проверяет HMAC подпись перед принятием фотоотчёта.
