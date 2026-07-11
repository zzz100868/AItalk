# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

赛博聊机 (Cyber Chat) — a WeChat Mini Program for AI-companion dating/social matching. Users talk to an AI friend via voice, the system builds a personality profile through 66 implicit questions, and matches users weekly.

**Current stage**: Frontend with mock data fallback + NestJS backend (Phase 1–5 done). All API calls gracefully fall back to `mockData.js` when the backend is unavailable.

## Documentation

All project documentation lives in `docs/` — see [`docs/README.md`](docs/README.md) for the full index.

| Document | Content |
|---|---|
| [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) | Dev environment setup, backend commands, API route table |
| [`docs/DEV_PROGRESS.md`](docs/DEV_PROGRESS.md) | Phase-based development roadmap and status |
| [`docs/architecture/前端架构.md`](docs/architecture/前端架构.md) | Frontend data flow, modules, pages, components, design system |
| [`docs/architecture/技术方案设计.md`](docs/architecture/技术方案设计.md) | Backend architecture, domain model, API design |
| [`docs/api/README.md`](docs/api/README.md) | API specs per module (auth, profile, voice, memory, match, etc.) |
| [`docs/decisions/`](docs/decisions/) | ADRs (Architecture Decision Records) |

## Critical Rules

- **Do not modify `data/mockData.js`** unless explicitly requested. Treat it as the frontend data contract and fallback source.
- **When adding backend APIs**, add a service/API layer first; do not change page fields, UI structure, or interactions unless explicitly requested.
- **Mock Data Policy**: `mockData.js` is a protected compatibility layer. Do not modify schemas, field names, default users, AI users, match candidates, memory data, or reply structures. Keep mockData as fallback during MVP development.

## Conventions

- All documents are in Chinese (Simplified)
- AI characters: voice calls use "小雅" (`AI_USERS.xiaoya`), text chat uses "Stitch AI" (`AI_USERS.stitch`)
- Match opens weekly on Tuesday (`getDay() === 2`), with `TEST_MODE = true` to bypass during dev
- When modifying `docs/`, keep `docs/README.md` index in sync
- ADR files get a `**当前状态（YYYY-MM 校准）**` line — don't rewrite the body, only add status annotations
- API docs in `docs/api/` must reference `docs/architecture/前后端字段对齐表.md` for field names
