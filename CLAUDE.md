# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

喜乐瑜伽教师认证中心 (Xile Yoga Teacher Certification Center) — a system for managing yoga teacher certifications, annual reviews, and studio listings. Three user roles: students (query/verify teachers), teachers (self-service credentials and annual reviews), and the Teacher Management Committee (admin CRUD, review approvals, imports).

Target: MVP by end of July 2026. Deployed as a single Docker container on WeChat Cloud Hosting (微信云托管).

## Development Commands

### Backend (Flask API)

```bash
# Start dev server with demo seed data (SQLite, port 5000)
python backend/run_dev.py

# Run API contract tests
python -m pytest backend/tests/test_api_contract.py -q

# Run a single test
python -m pytest backend/tests/test_api_contract.py::test_health_endpoint_reports_service_status -q
```

### Admin Console (Vue 3)

```bash
cd admin-src
npm install
npm run dev        # Vite dev server, proxies /api to localhost:5000
npm test           # Node test runner + static contract verification
npm run build      # Production build to admin-src/dist/
```

Dev login: `admin` / `password` (token: `Bearer dev-admin-token`)

### Mini Program (WeChat Native)

No build step — open `miniprogram/` in WeChat Developer Tools. Falls back to local mock data when backend is not running.

### Full Verification Suite

```bash
node scripts/verify_all.js
```

Runs project-static, miniprogram-static, prototype-contract, miniprogram-runtime, pytest, backend-http-smoke, admin-test, admin-build, and admin-preview checks in sequence.

## Architecture

### Three-module monorepo

```
miniprogram/     WeChat native mini program (wx.cloud.callContainer to backend)
admin-src/       Vue 3 + Vite + Pinia (served at /admin/ in production)
backend/         Flask + SQLAlchemy + Gunicorn + Nginx (port 80 in Docker)
```

### Backend structure

- `backend/app/__init__.py` — Flask app factory (`create_app`). Pass `SEED_DEMO_DATA=True` for local dev. Includes security headers via `after_request`.
- `backend/app/api/mp/` — Mini program public API blueprint, mounted at `/api/mp`
- `backend/app/api/mp/helpers.py` — Shared utilities (escape_like for LIKE injection prevention)
- `backend/app/api/admin/` — Admin API blueprint, mounted at `/api/admin`
- `backend/app/api/admin/studios.py` — Full CRUD for studios (list, create, update, soft-delete)
- `backend/app/api/admin/reviews.py` — Review queue + decision endpoint (includes file URLs)
- `backend/app/models/` — SQLAlchemy models (teacher, teacher_detail, teacher_tier, annual_review, review_file, studio, admin_user, user, import_batch, import_error, audit_log)
- `backend/app/config.py` — Config classes; dev uses SQLite, production uses `MYSQL_DATABASE_URI` env var (TDSQL-C Serverless MySQL 8.0)
- `backend/app/extensions.py` — Flask extensions (db, rate limiter with X-Forwarded-For support)
- `backend/app/services/review_service.py` — Review decision business logic
- `backend/app/utils/storage.py` — File URL resolution (COS in prod, local `/uploads/` in dev)

Auth: WeChat OpenID for mini program users; JWT (8h expiry, jti claim) for admin users. Dev mode accepts `Bearer dev-admin-token` to bypass login.

### Admin console structure

- `admin-src/src/views/` — 9 views: Login, Dashboard, Teachers, Reviews, Studios, ImportTeachers, Analytics, Permissions, Settings
- `admin-src/src/api/index.js` — Axios instance with auth interceptor (auto-redirect to login on 401)
- `admin-src/src/api/adminData.js` — Data fetching + DTO mapping functions
- `admin-src/src/stores/auth.js` — Pinia auth store
- `admin-src/src/router/index.js` — Vue Router with `beforeEach` auth guard (redirects to /login if no token)
- `admin-src/src/composables/useToast.js` — Global toast notification system
- Vite config: base path `/admin/`, proxy `/api` to Flask in dev

### Mini program structure

- `miniprogram/pages/` — Main tab pages (index, teacher-search, teacher-detail, studios, studio-detail). All public pages allow visitor access without login.
- `miniprogram/packageTeacher/` — Sub-package for teacher self-service (home, login, profile, settings, review-apply, review-records, cert-step1, cert-view, submission-success). Requires login.
- `miniprogram/components/` — Shared components (teacher-card, studio-card, cert-badge, empty-state, upload-list, section-card, tab-bar)
- `miniprogram/utils/auth.js` — Auth utilities (requireAuth, isLoggedIn, isPhoneBound)

### Auth flow (mini program)

Public pages (index, teacher-search, teacher-detail, studios, studio-detail) load without auth. The tab-bar "我的" button and "查看我的证书" CTA check `auth.isLoggedIn()` + `auth.isPhoneBound()` before navigating to teacher self-service pages; if not authenticated, redirect to `/packageTeacher/login/login` with returnUrl.

### Deployment

Single Docker container: Nginx on port 80 routes `/admin` to static files, `/api` to Gunicorn (Flask on 127.0.0.1:5000). The mini program connects via `wx.cloud.callContainer` (no public domain or ICP filing needed).

## Key API Contracts

Mini program (public, no auth):
- `GET /api/mp/teachers/search?q=` — returns `{total, items}` with public fields only (no phone)
- `GET /api/mp/teachers/<id>/summary`
- `GET /api/mp/teachers/<id>/certification`
- `POST /api/mp/reviews` — annual review submission (requires auth)
- `GET /api/mp/studios`, `GET /api/mp/studios/<id>`
- `GET /api/mp/stats/overview` — public stats (totalTeachers, completedReviews)

Admin (JWT required):
- `POST /api/admin/login`
- `GET /api/admin/stats/dashboard`
- `GET /api/admin/teachers`, `POST /api/admin/teachers`, `PUT /api/admin/teachers/<id>`, `DELETE /api/admin/teachers/<id>`
- `GET /api/admin/studios`, `POST /api/admin/studios`, `PUT /api/admin/studios/<id>`, `DELETE /api/admin/studios/<id>`
- `GET /api/admin/reviews`, `POST /api/admin/reviews/<id>/decision`
- `POST /api/admin/import/teachers/preview`, `POST /api/admin/import/teachers/commit`
- `GET /api/admin/users`, `PUT /api/admin/users/<id>/role`

## Domain Rules

- Teacher tier levels: L0–L5. Annual review cycles: L0–L3 every 2 years, L4 every 3 years, L5 exempt.
- Three DTO projections for teacher data: TeacherSummaryDTO (public query), TeacherSelfDTO (teacher's own view), TeacherAdminDTO (committee full access).
- Review files stored as object-storage keys; access via temporary signed URLs (COS) or local `/uploads/reviews/` path in dev.
- Studio soft-delete: `status="hidden"` instead of row deletion; hidden studios excluded from queries.

## Security

- Security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, CSP (in production)
- Rate limiting: 200/min default, configurable per-endpoint via Flask-Limiter
- LIKE injection: all user-supplied text passed through `escape_like()` before use in SQL LIKE clauses
- File uploads: extension whitelist, size limits enforced before storage
