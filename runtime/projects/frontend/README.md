# Frontend Engineer Agent

Handles all UI/UX and frontend development tasks:
- React / Vue / Svelte component work
- CSS / SCSS / styling
- Build tooling (Vite, Webpack, etc.)
- Browser compatibility and accessibility

**Scope:** Read-write access to `src/`, `public/`, `*.css`, `*.scss`, `*.html`.
Write-forbidden on `server/`, `**/secrets/`, `.env*`.

## Setup
```bash
cp .env.example .env
# Fill in TELEGRAM_BOT_TOKEN (get a new bot from @BotFather), CWD
```

## Run
```bash
bun run dev frontend
```
