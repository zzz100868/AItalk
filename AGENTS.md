# AGENTS.md

This is the thin agent entrypoint for this repository.

## Start Here

- Use `docs/README.md` as the only project documentation route.
- Do not use, recreate, or route agents through `data/docs/`; it was removed as an old duplicate documentation tree.
- For legacy Claude-specific context, also read `CLAUDE.md`.

## Working Rules

- When modifying files under `docs/`, keep `docs/README.md` in sync.
- Do not modify `data/mockData.js` unless explicitly requested. Treat it as the frontend data contract and mock fallback source.
- When adding backend APIs, add the service/API layer first; do not change page fields, UI structure, or interactions unless explicitly requested.
- ADR files live under `docs/decisions/` and should receive status annotations instead of body rewrites when calibrating current state.

## Verification

- Root `npm test` is currently a placeholder that exits with failure.
- For backend changes, prefer the commands documented in `docs/DEVELOPMENT.md` and `server/package.json`, such as `npm run build` and `npm run build:voice` from `server/`.
