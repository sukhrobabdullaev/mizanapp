# Mizan — Claude Code Build Prompt

Build **Mizan**: a Muslim life-balance tracker.
Two separate codebases: Django REST API (backend) + Expo React Native (mobile).
Senior engineer standards: typed, tested, no TODOs, no console.logs in prod paths.

---

## Architecture

```
┌─────────────────────────┐        ┌──────────────────────┐
│  Expo (React Native)    │  HTTP  │  Django REST API      │
│  iOS app                │◄──────►│  + DRF + JWT          │
└─────────────────────────┘        │  Docker container     │
                                   └──────────┬───────────┘
                                              │ psycopg2
                                   ┌──────────▼───────────┐
                                   │  Supabase Postgres    │
                                   │  (DB URL only)        │
                                   └──────────────────────┘
```

Mobile calls Django REST endpoints. Django owns auth + all business logic.
Supabase = hosted Postgres, nothing else (no Supabase client SDK anywhere).

---

## Backend Stack (Django)

| Layer | Choice |
|---|---|
| Language | Python 3.12, type hints everywhere |
| Framework | Django 5.x + Django REST Framework |
| Auth | dj-rest-auth + SimpleJWT (access + refresh tokens) |
| Database | Supabase Postgres via `DATABASE_URL` env var |
| ORM | Django ORM + migrations |
| Containerization | Docker + docker-compose |
| Tests | pytest + pytest-django (models, serializers, views) |
| Linting | ruff + mypy |
| Env | python-decouple |

### Docker setup

```yaml
# docker-compose.yml
services:
  api:
    build: ./backend
    ports: ["8000:8000"]
    env_file: ./backend/.env
    command: >
      sh -c "python manage.py migrate &&
             python manage.py runserver 0.0.0.0:8000"
```

```dockerfile
# backend/Dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
```

### Backend folder structure

```
backend/
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── manage.py
├── config/
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── apps/
│   ├── accounts/      # User, Profile models + auth endpoints
│   ├── goals/         # Goal, Milestone, Task, ChallengeTemplate
│   ├── prayers/       # Prayer model + time computation endpoints
│   ├── finance/       # Category, Transaction
│   └── mizan/         # Review, score computation, streak logic
└── tests/
```

### Django models (abbreviated — use Django ORM, not raw SQL)

```python
# Priority: TextChoices
class Priority(models.TextChoices):
    HIGH   = 'high'
    MEDIUM = 'medium'
    LOW    = 'low'

class DimensionKey(models.TextChoices):
    RUHIY     = 'ruhiy'
    JISMONIY  = 'jismoniy'
    MOLIYAVIY = 'moliyaviy'
    IJTIMOIY  = 'ijtimoiy'
    ILMIY     = 'ilmiy'

class Profile(models.Model):
    user             = models.OneToOneField(User, on_delete=models.CASCADE)
    location_lat     = models.FloatField(null=True)
    location_lng     = models.FloatField(null=True)
    calc_method      = models.CharField(default='MuslimWorldLeague')
    asr_madhab       = models.CharField(default='Hanafi')
    prayer_offsets   = models.JSONField(default=dict)   # {"bomdod": 2}
    hide_sadaqa      = models.BooleanField(default=False)
    notif_prefs      = models.JSONField(default=dict)

class Goal(models.Model):
    user        = models.ForeignKey(User, on_delete=models.CASCADE)
    title       = models.CharField(max_length=255)
    dimension   = models.CharField(choices=DimensionKey.choices)
    priority    = models.CharField(choices=Priority.choices, default=Priority.MEDIUM)
    target_date = models.DateField(null=True)
    status      = models.CharField(default='active')
    created_at  = models.DateTimeField(auto_now_add=True)

class Milestone(models.Model):
    goal        = models.ForeignKey(Goal, on_delete=models.CASCADE, related_name='milestones')
    user        = models.ForeignKey(User, on_delete=models.CASCADE)
    title       = models.CharField(max_length=255)
    due_date    = models.DateField(null=True)
    sort_order  = models.IntegerField(default=0)
    status      = models.CharField(default='active')

class Task(models.Model):
    user        = models.ForeignKey(User, on_delete=models.CASCADE)
    goal        = models.ForeignKey(Goal, null=True, on_delete=models.SET_NULL)
    milestone   = models.ForeignKey(Milestone, null=True, on_delete=models.SET_NULL)
    title       = models.CharField(max_length=255)
    date        = models.DateField()
    priority    = models.CharField(choices=Priority.choices, default=Priority.MEDIUM)
    status      = models.CharField(default='pending')
    sort_order  = models.IntegerField(default=0)

class Prayer(models.Model):
    user   = models.ForeignKey(User, on_delete=models.CASCADE)
    date   = models.DateField()
    name   = models.CharField()   # bomdod peshin asr shom xufton
    status = models.CharField()   # done missed excused late
    class Meta:
        unique_together = ('user', 'date', 'name')

class Category(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE)
    name_uz    = models.CharField(max_length=100)
    type       = models.CharField()   # income | expense
    dimension  = models.CharField(choices=DimensionKey.choices, null=True)
    icon       = models.CharField(null=True)
    is_sadaqa  = models.BooleanField(default=False)

class Transaction(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE)
    amount     = models.DecimalField(max_digits=14, decimal_places=2)
    currency   = models.CharField(default='UZS')
    type       = models.CharField()
    category   = models.ForeignKey(Category, null=True, on_delete=models.SET_NULL)
    note       = models.TextField(blank=True)
    date       = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

class ChallengeTemplate(models.Model):
    title_uz      = models.CharField(max_length=255)
    dimension     = models.CharField(choices=DimensionKey.choices)
    duration_days = models.IntegerField()
    schedule      = models.JSONField()   # {milestones:[...], daily_tasks:[...]}
    is_builtin    = models.BooleanField(default=False)

class Review(models.Model):
    user        = models.ForeignKey(User, on_delete=models.CASCADE)
    week_start  = models.DateField()   # always Monday
    answers     = models.JSONField()   # {ruhiy:{score:4,note:""}, ...}
    mizan_score = models.IntegerField(null=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = ('user', 'week_start')
```

### REST API endpoints

```
POST   /api/auth/register/
POST   /api/auth/login/          → {access, refresh}
POST   /api/auth/token/refresh/
GET    /api/profile/
PATCH  /api/profile/

GET    /api/goals/
POST   /api/goals/
GET    /api/goals/{id}/
PATCH  /api/goals/{id}/
DELETE /api/goals/{id}/
GET    /api/goals/{id}/milestones/
POST   /api/goals/{id}/milestones/
PATCH  /api/milestones/{id}/
POST   /api/milestones/{id}/tasks/

GET    /api/tasks/?date=YYYY-MM-DD
POST   /api/tasks/
PATCH  /api/tasks/{id}/
DELETE /api/tasks/{id}/

GET    /api/prayers/?date=YYYY-MM-DD
POST   /api/prayers/bulk/        → upsert [{name, status}] for a date
GET    /api/prayer-times/?date=YYYY-MM-DD&lat=X&lng=Y

GET    /api/categories/
POST   /api/categories/
GET    /api/transactions/?month=YYYY-MM
POST   /api/transactions/
DELETE /api/transactions/{id}/

GET    /api/challenges/
POST   /api/challenges/{id}/start/   → instantiates goal tree

GET    /api/reviews/?week=YYYY-MM-DD
POST   /api/reviews/
GET    /api/mizan/score/?week=YYYY-MM-DD
GET    /api/mizan/streaks/
```

All endpoints require `Authorization: Bearer <access_token>`.
All queryset filtering scoped to `request.user` (never leak cross-user data).

### Pure logic (apps/mizan/logic.py) — unit-tested

```python
def compute_streak(days: list[dict]) -> dict:
    """
    days: [{"date": "2026-01-01", "status": "done"|"excused"|"missed"}]
    Returns: {"current": int, "longest": int}
    "excused" counts as done. Computed, never stored.
    """

def compute_mizan_score(dimensions: dict[str, float]) -> dict:
    """
    dimensions: {"ruhiy": 0.8, "jismoniy": 0.4, ...}  (0.0-1.0)
    score = mean * (1 - std_dev) * 100, clamped 0-100
    Returns: {"score": int, "weakest": str, "radar": dict}
    """

def instantiate_challenge(template: ChallengeTemplate, start_date: date, user) -> Goal:
    """
    Creates Goal + Milestones + Tasks from template.schedule.
    Returns unsaved Goal with prefilled related objects.
    """
```

---

## Mobile Stack (Expo React Native)

| Layer | Choice |
|---|---|
| Runtime | Expo SDK 52, prebuild |
| Language | TypeScript strict |
| Navigation | expo-router v4 |
| Styling | StyleSheet only |
| API client | axios + interceptor for JWT refresh |
| Server state | TanStack Query v5 + AsyncStorage persister |
| Offline queue | op-sqlite mutation queue, replay on reconnect |
| Prayer times | adhan-js on-device (Hanafi, O'zbekiston Musulmonlari Idorasi method) |
| Charts | victory-native v41 (Skia) |
| Notifications | expo-notifications (local) |
| Widgets | react-native-widgetkit |
| Live Activity | Swift config plugin (Dynamic Island prayer countdown) |
| Forms | react-hook-form + zod |
| Icons | Ionicons |
| Date | date-fns + date-fns-tz (Asia/Tashkent) |

### API client (src/lib/api.ts)

```typescript
import axios from 'axios'

const api = axios.create({ baseURL: process.env.EXPO_PUBLIC_API_URL })

// Attach JWT, auto-refresh on 401
api.interceptors.request.use(attachToken)
api.interceptors.response.use(null, refreshOnUnauthorized)

export default api
```

All hooks call `api` via TanStack Query. No direct DB calls from mobile.

---

## Design System

```typescript
export const colors = {
  background:    '#F7F8F7',
  card:          '#FFFFFF',
  bgDark:        '#0A1712',
  cardDark:      '#121E18',
  gradientStart: '#0FA36B',
  gradientEnd:   '#4EE6A8',
  textPrimary:   '#101613',
  textSecondary: '#6B7570',
  gold:          '#C9A24B',
  danger:        '#E53E3E',
  amber:         '#F6A623',
  dimensions: {
    ruhiy: '#4EE6A8', jismoniy: '#0FA36B',
    moliyaviy: '#C9A24B', ijtimoiy: '#4A90D9', ilmiy: '#9B7FD4',
  },
}
```

Cards: white, border-radius 20, shadow elevation 2.
Buttons: linear gradient (#0FA36B → #4EE6A8), border-radius 9999.
UI language: Uzbek throughout.

---

## Screens (4 tabs)

**Bugun:** hadith hero card, prayer strip (5 toggles + countdown), progress bar,
priority-sorted tasks (red/amber/gray dot + goal tag), FAB (+ vazifa / + xarajat).

**Maqsadlar:** goal cards (progress ring, dimension chip), challenge gallery (3 templates),
goal detail (collapsible milestones + nested tasks).

**Moliya:** month totals (UZS: 1 250 000 so'm format), donut chart (Sadaqa in gold),
day-grouped transactions, quick-add bottom sheet (keypad first, max 3 taps).

**Mizan:** pentagon radar (hafta/oy), Mizan score card (0-100, trend, weakest nudge),
2x2 stats grid, 12-week heatmap, muhosaba card → 5-step guided flow → result screen.

**Onboarding (3 screens):** value prop, prayer setup (calc method + location), notifications.

---

## Environment Variables

```bash
# backend/.env
SECRET_KEY=
DATABASE_URL=postgresql://...supabase.co:5432/postgres
DEBUG=True
ALLOWED_HOSTS=*

# mobile/.env
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

---

## Build Order

1. Django project scaffold + Docker setup + DB connection check
2. User auth (register, login, JWT refresh, profile)
3. Django models + migrations for all apps
4. Goals CRUD endpoints + tests
5. Tasks endpoints + streak logic + tests
6. Prayer endpoints + adhan-js wrapper on mobile + tests
7. Finance endpoints (categories + transactions)
8. Mizan score algorithm + review endpoints + tests
9. Challenge templates seed + instantiation endpoint + tests
10. Mobile: design system primitives + API client
11. Mobile: auth screens + onboarding
12. Mobile: Bugun tab (prayers + tasks)
13. Mobile: Maqsadlar tab (goal tree)
14. Mobile: Moliya tab (quick-add + list)
15. Mobile: Mizan tab (radar + score + heatmap)
16. Mobile: Muhosaba flow (5 steps + result)
17. Mobile: widgets + Live Activity
18. Dark mode pass
19. Docker production config (gunicorn, whitenoise)
20. TestFlight build

---

## Non-goals for v1

No Android, no web, no bank sync, no AI features, no ads,
no dhikr counter, no Quran tracker, no zakat calculator,
no budgets, no family circles, no Screen Time blocking, no Apple Watch.
