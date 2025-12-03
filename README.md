<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1FtELSOX9idfdUkauJgBhRPdN4mg8o5JB

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Посмотреть превью

- Быстрый локальный запуск: выполните `npm run dev` и откройте http://localhost:5173. В хэше URL доступны все пункты лендинга, включая вход для ведущего.
- Предпросмотр собранной версии: выполните `npm run build && npm run preview` и откройте http://localhost:4173. Это покажет, как приложение выглядит после сборки.

## Admin access (ведущий)

- На лендинге выберите пункт «Вход для Ведущего» или перейдите по хэшу `#admin` в URL.
- Используйте пароль **`batumi-owl-stronghold`** (зашит в `config.ts`) для входа в кабинет ведущего.
- После ввода правильного пароля откроется административная панель с управлением вопросами, играми, пользователями и рассылками.
