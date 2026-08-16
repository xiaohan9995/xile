# Repository Guidelines

## Project Structure & Module Organization

This monorepo contains three deployable surfaces:

- `miniprogram/` is the native WeChat Mini Program. Public pages live in `pages/`, teacher self-service flows in `packageTeacher/`, and reusable UI in `components/`.
- `admin-src/` is the Vue 3/Vite administration console. Keep views in `src/views/`, API mapping in `src/api/`, auth state in `src/stores/`, and shared UI logic in `src/composables/`.
- `backend/` is the Flask API. Route blueprints, SQLAlchemy models, services, migrations, and tests are under `backend/app/`, `backend/migrations/`, and `backend/tests/`.

Supporting validation scripts are in `scripts/`; product and QA documentation is in `docss/`. Treat `prototype/product-design/` as a visual reference, not the production application.

## Build, Test, and Development Commands

Run these from the repository root unless stated otherwise:

```bash
python backend/run_dev.py                         # Flask dev server with seed data
python -m pytest backend/tests/test_api_contract.py -q  # API contracts
node scripts/verify_all.js                        # complete automated verification
```

For the admin app, run `cd admin-src && npm install`, then use `npm run dev`, `npm test`, or `npm run build`. Open `miniprogram/` directly in WeChat Developer Tools; it has no separate build command and can fall back to mock data.

## Coding Style & Naming Conventions

Follow nearby code before introducing a new pattern. Python uses four-space indentation, `snake_case` functions, and grouped imports. Admin JavaScript uses two spaces, semicolons omitted, `camelCase` functions, and PascalCase Vue components (for example, `TeacherDetail.vue`). Mini Program page and component directories use lowercase kebab-case; each component keeps matching `.js`, `.json`, `.wxml`, and `.wxss` files.

Keep API DTO mappings explicit, preserve public/admin data boundaries, and avoid hard-coding credentials or production endpoints.

## Testing Guidelines

Add or update backend contract tests in `backend/tests/test_*.py`; name tests after observable behavior, such as `test_health_endpoint_reports_service_status`. Add admin data tests beside the code in `admin-src/src/api/*.test.js`. Run focused tests while iterating, then run `node scripts/verify_all.js` before handoff. Manually verify Mini Program rendering in WeChat Developer Tools when changing WXML/WXSS or navigation.

## Commit & Pull Request Guidelines

Recent history follows concise Conventional Commit prefixes, often scoped: `feat(miniprogram): ...`, `fix(import): ...`, `style(admin): ...`, and `refactor: ...`. Use an imperative summary and include the affected module where useful.

PRs should explain the user-visible and API impact, link the relevant issue or requirement, list verification commands run, and include screenshots for admin or Mini Program visual changes. Do not include unrelated generated files or existing working-tree edits.
