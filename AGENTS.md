# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

赛博聊机 (Cyber Chat) — a WeChat Mini Program for AI-companion dating/social matching. Users talk to an AI friend via voice, the system builds a personality profile through 66 implicit questions, and matches users weekly.

**Current stage**: Pure frontend with mock data. No backend, no real API calls, no WebSocket connections. All data lives in `wx.Storage` and `mockData.js`.

## Development Environment

- **Framework**: WeChat Mini Program (native, no npm/node)
- **IDE**: WeChat DevTools (微信开发者工具) — import project root directory, appid is in `project.config.json`
- **No build step**: no package.json, no bundler. DevTools compiles directly
- **No test framework**: no unit tests exist
- **No linter config**: no eslint/prettier configured

## Architecture

### Data flow (current mock state)

```
mockData.js (hardcoded defaults)
    ↓
app.js onLaunch → reads wx.Storage → merges into app.globalData
    ↓
Page onShow → common.loadUserInfo() or userStore.getProfile() → reads storage + globalData
    ↓
User edits → userStore.updateProfile() → writes storage + updates globalData
```

### Key modules


| Module          | File                                 | Role                                                                                  |
| --------------- | ------------------------------------ | ------------------------------------------------------------------------------------- |
| Mock data       | `data/mockData.js`                   | DEFAULT_USER, AI_USERS (xiaoya/stitch), MATCH_CANDIDATES, MEMORY_DATA, MEMORY_REPLIES |
| Storage wrapper | `utils/common.js` → `storage`        | In-memory cache + wx.Storage sync. All pages use this, never raw `wx.getStorageSync`  |
| User state      | `stores/userStore.js`                | `getProfile()` / `updateProfile()` — single source for avatar/nickName/bio            |
| Tab behavior    | `behaviors/tabPage.js`               | Behavior mixin that sets `tabBar.selected` on `onShow` — used by all 3 tab pages      |
| Navigation      | `utils/common.js` → `goToUserHome()` | Centralized user home navigation with author encoding                                 |


### Mock Data Policy

`data/mockData.js` must be treated as a protected compatibility layer.

Codex must not modify mock data schemas, field names, default users, AI users, match candidates, memory data, or reply structures unless the user explicitly asks for it.

When adding backend integration, keep mockData as fallback data. Do not remove it during MVP development.

### Pages and their data sources


| Page               | Data source                               | Persistence                                       |
| ------------------ | ----------------------------------------- | ------------------------------------------------- |
| index (voice call) | Local timer + mockData AI_USERS.xiaoya    | None (callDate written on endCall, not persisted) |
| match              | mockData.MATCH_CANDIDATES (random pick)   | None                                              |
| memory/chat        | mockData.MEMORY_REPLIES (random)          | Messages in memory only                           |
| memory/insights    | mockData → wx.Storage('memoryInsights')   | localStorage                                      |
| memory/archive     | mockData (aboutMe, personalities, traits) | None                                              |
| profile            | userStore → wx.Storage('userProfile')     | localStorage                                      |
| profile photos     | wx.Storage('profilePhotos')               | localStorage (local file paths)                   |
| accountSecurity    | Hardcoded in page data                    | None                                              |
| notifications      | Hardcoded in page data (2 items)          | None                                              |


### Cross-page communication

- `app.globalData.memoryTargetTab` — set by `endCall()` to `'archive'`, consumed by memory page `onShow` to switch sub-tab, then cleared
- `userStore` — profile changes propagate via storage; pages re-read in `onShow`
- Protected keys on cache clear: `userProfile`, `userSettings`, `memoryInsights`, `profilePhotos`

### Components

- `page-header` — custom navigation bar (replaces native nav, `navigationStyle: "custom"` in app.json)
- `edit-modal` — generic edit dialog used by memory page for insight editing
- `custom-tab-bar` — custom tab bar component with 3 tabs (match/memory/profile)

## Design System

Global CSS variables in `app.wxss`. Key values:

- Base background: `--bg-base: #faf9f7`
- Accent: `--accent: #c4715a` (warm terracotta)
- Error/danger: `--error: #c45a5a`
- All shadows are warm-tinted (`rgba(196,113,90,...)`)
- Units: `rpx` throughout

## Documentation

All project documentation lives in `docs/` — see `docs/README.md` for the full index.


| Directory            | Content                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `docs/product/`      | Product concept, 66-question personality mapping                                          |
| `docs/architecture/` | Tech design, field alignment table, dialogue orchestration, matching algorithm            |
| `docs/api/`          | API specs per module with priority (P0/P1/P2), current frontend state, and field mappings |
| `docs/decisions/`    | ADRs (Architecture Decision Records) with calibration status                              |


### Key technical decisions (ADRs)

- **Monolith + separate voice gateway** (NestJS + Node.js)
- **PostgreSQL + pgvector** as sole database
- **火山引擎 (Volcengine/Doubao)** for ASR + TTS + LLM
- **微信实名认证** for identity verification (via WeChat login, see ADR-0002)

## Critical Rules

- Do not modify `data/mockData.js` unless explicitly requested.
- Treat `mockData.js` as the current frontend data contract and fallback source.
- When adding backend APIs, add a service/API layer first; do not change page fields, UI structure, or interactions unless explicitly requested.

## Backend (server/)

NestJS + TypeScript + Prisma + PostgreSQL backend skeleton.

```bash
cd server
npm install
cp .env.example .env        # edit DATABASE_URL if needed
npx prisma generate         # generate Prisma client
npx prisma migrate dev      # create DB tables (requires running PostgreSQL)
npm run start:dev           # dev mode with hot-reload on http://localhost:3000
```

Without PostgreSQL, the server starts in mock-only mode (DB operations will fail but /health works).

### Key commands

| Command | Purpose |
|---|---|
| `npm run start:dev` | Dev server with watch |
| `npm run build` | Compile to dist/ |
| `npx prisma studio` | Visual DB browser |
| `npx prisma migrate dev --name <name>` | Create migration |

### API routes (Phase 1)

All routes are prefixed with `/api`. Auth routes require `Authorization: Bearer <token>` header.

| Method | Path | Auth | Status |
|---|---|---|---|
| GET | /health | No | Returns `{status, timestamp}` |
| POST | /auth/wx-login | No | Mock: generates user from code |
| GET | /me | Yes | User profile |
| PUT | /me | Yes | Update profile |
| GET | /me/photos | Yes | Photo list |
| POST | /me/photos | Yes | Add photo |
| DELETE | /me/photos/:id | Yes | Delete photo |
| GET | /users/:author/home | Yes | User home page |
| GET | /memory/chat | Yes | Chat history |
| POST | /memory/chat | Yes | Send message (mock AI reply) |
| GET | /memory/insights | Yes | Insights list |
| PUT | /memory/insights/:id | Yes | Edit insight |
| DELETE | /memory/insights/:id | Yes | Delete insight |
| GET | /memory/archive | Yes | Personality archive |
| GET | /match/current | Yes | Match status |
| POST | /match/do | Yes | Trigger match (mock candidates) |
| POST | /match/:id/feedback | Yes | Submit feedback |
| GET | /notifications | Yes | Notification list |
| PUT | /notifications/read-all | Yes | Mark all read |
| DELETE | /notifications | Yes | Clear all |

## Conventions

- All documents are in Chinese (Simplified)
- AI characters: voice calls use "小雅" (`AI_USERS.xiaoya`), text chat uses "Stitch AI" (`AI_USERS.stitch`)
- Match opens weekly on Tuesday (`getDay() === 2`), with `TEST_MODE = true` to bypass during dev
- When modifying `docs/`, keep `docs/README.md` index in sync
- ADR files get a `**当前状态（YYYY-MM 校准）`** line — don't rewrite the body, only add status annotations
- API docs in `docs/api/` must reference `docs/architecture/前后端字段对齐表.md` for field names

