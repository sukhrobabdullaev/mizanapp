# Mizan — Muslim life-balance tracker

Two codebases: a Django REST API and an Expo (React Native) iOS app.
UI language is Uzbek throughout; the API is the only thing the app talks to.

```
Expo (React Native)  ──HTTP──▶  Django REST + DRF + JWT  ──psycopg──▶  Postgres
```

## Backend

```bash
cp backend/.env.example backend/.env      # fill SECRET_KEY + DATABASE_URL
docker compose up -d                      # api on :8000, dev postgres on :5433
curl localhost:8000/api/health/           # {"status":"ok","database":"ok"}
```

Verification commands (all run inside the container):

```bash
docker compose run --rm api pytest -q     # 163 tests
docker compose run --rm api ruff check .
docker compose run --rm api mypy .        # strict
docker compose run --rm api python manage.py check_db
```

### Pointing at Supabase

`docker-compose.yml` ships a local Postgres for development. To use Supabase,
set `DATABASE_URL` in `backend/.env` to the project URI and drop the `db`
service dependency — nothing else changes. Use the direct host (`:5432`) for
migrations and the pooler (`:6543`) for app traffic.

### Production

```bash
cp backend/.env.prod.example backend/.env.prod
docker compose -f docker-compose.prod.yml up -d --build
```

Runs gunicorn (3 workers × 2 threads) as a non-root user, serves static files
through WhiteNoise, and enables HSTS/secure cookies whenever `DEBUG=False`.

### API surface

```
POST   /api/auth/register/ /api/auth/login/ /api/auth/token/refresh/ /api/auth/logout/
GET    PATCH /api/profile/
CRUD   /api/goals/  /api/goals/{id}/milestones/  /api/milestones/{id}/  /api/milestones/{id}/tasks/
CRUD   /api/tasks/?date=YYYY-MM-DD
GET    /api/prayers/?date=   POST /api/prayers/bulk/   GET /api/prayer-times/?date=&lat=&lng=
CRUD   /api/categories/  /api/transactions/?month=YYYY-MM  GET /api/transactions/summary/?month=
GET    /api/challenges/   POST /api/challenges/{id}/start/
CRUD   /api/reviews/?week=YYYY-MM-DD
GET    /api/mizan/score/  /api/mizan/streaks/  /api/mizan/heatmap/  /api/mizan/stats/
```

Every endpoint except `/api/health/` requires `Authorization: Bearer <access>`
and is scoped to `request.user`.

## Mobile

```bash
cd mobile
cp .env.example .env                      # EXPO_PUBLIC_API_URL
npm install --legacy-peer-deps
npx expo start
```

```bash
npm run typecheck    # tsc --noEmit, strict + noUncheckedIndexedAccess
npm run lint         # eslint
npm test             # 35 unit tests
```

Prayer times are computed on-device with adhan-js and agree to the minute with
the server's adhanpy implementation (both are pinned to the same set of
calculation methods).

## Known gaps

- **iOS build / TestFlight**: this machine has Command Line Tools but no Xcode,
  so nothing native was compiled and no build was submitted. See
  `mobile/WIDGETS.md` for the widget/Live Activity setup that needs Xcode.
- The `MizanWidgets` native module is not implemented; the JS bridge no-ops
  until it exists.
