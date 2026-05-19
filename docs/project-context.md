# Project Context — Alarab Attendance System

## Overview

A full-stack university attendance management platform. Students scan QR codes via a Flutter mobile app; professors and admins manage the system via a React web dashboard. The backend is a Django REST API, deployed via Docker on a VM.

- **VM host**: `10.100.13.77`
- **Production domain**: `alarb.attendance`
- **Primary dev state**: Development mode (`DEBUG=True`, `ALLOWED_HOSTS=*`)

---

## Architecture

```
alarab_student_app/   → Flutter mobile client (students only)
frontend/             → React + Vite web dashboard (professors + admins)
backend/              → Django REST Framework API
docker-compose.yml    → Orchestrates: db, redis, backend, frontend
```

### Services (docker-compose)
| Service   | Image              | Port    | Notes                          |
|-----------|--------------------|---------|--------------------------------|
| `db`      | postgres:15-alpine | 5432    | Tuned for 8-core/8GB VM        |
| `redis`   | redis:7-alpine     | 6379    | 200MB cap, LRU eviction        |
| `backend` | ./backend          | internal| Gunicorn, 9w×9t                |
| `frontend` | ./frontend        | 80/443  | Nginx reverse proxy + HTTPS    |

### Backend Django Apps
- `core` — shared models/utilities
- `accounts` — user management (JWT auth)
- `courses` — course enrollment logic
- `attendance` — QR scan processing

---

## UI / Styling

### React Web (frontend/)
- **Stack**: React + Vite + TailwindCSS
- **Design**: "Anti-Gravity" Glassmorphism — dark backgrounds, gold accents, blur effects
- **Color palette**: Brand purple (`#6C3AB7`), Gold accent (`#D4AF37`), Dark bg (`#0A0A0F`)
- **Typography**: Inter (Google Fonts)
- **Index CSS**: Glass-card, float-card utility classes defined in `src/index.css`

### Flutter Mobile (alarab_student_app/)
- **Design system**: `AppTheme` in `lib/theme/app_theme.dart` — mirrors the React palette exactly
- **Key colors**: `AppTheme.gold = #D4AF37`, `AppTheme.brand500 = #6C3AB7`, `AppTheme.darkBg = #0A0A0F`
- **Typography**: Google Fonts — Inter
- **Theming**: Full Dark/Light mode via `AppState.themeMode` + `MaterialApp.darkTheme/theme`
- **Widgets**: `GlassCard`, `SkeletonCard`, `EnrolledCourseCard`, `ScanResultOverlay`, `DeviceMismatchModal`

---

## Authentication & Authorization

### Backend
- **Method**: JWT via `djangorestframework-simplejwt`
- **Access token lifetime**: 8 hours
- **Refresh token lifetime**: 7 days, rotation enabled
- **Default permission**: `IsAuthenticated` globally — public endpoints override explicitly
- **Password hashing**: PBKDF2 (default), Argon2, BCrypt as fallbacks

### Flutter App
- Auth flow managed by `ApiService.fetchMe()` → `_SplashGate` routes to `/dashboard` or `/login`
- Token stored locally, passed as Bearer on all API requests
- `ApiConstants._useLocalIp = true` → connects to `https://10.100.13.77:443/api`

### React Web
- Auth state managed via React Context (`src/context/`)
- Role-based routing: Admin → `AdminDashboard`, Professor → `ProfessorView`, Student → `StudentScan`

---

## Core Features

| Feature              | Platform          | Notes                                              |
|----------------------|-------------------|----------------------------------------------------|
| QR Scan Attendance   | Flutter + Backend | Student scans session QR, backend logs attendance  |
| Session Duration     | React/Flutter/API | Dynamic end-time tracking via student check-out or manual override |
| Course Dashboard     | Flutter           | Lists enrolled courses with attendance stats       |
| Attendance Reports   | React (Professor) | Per-course attendance breakdown with charts & hours|
| Admin Dashboard      | React (Admin)     | Student/course/enrollment CRUD, system stats, academic hierarchy (StudyYears), batch assignments |
| Device Fingerprinting| React + Backend   | Prevents proxying — binds device to student account|
| Profile Management   | Flutter           | Tab-based: Home + Profile via `MainShell`          |

---

## Modals & UI Patterns

### Flutter
- **Navigation**: Bottom tab bar (`MainShell`) — `HomeScreen` (tab 0) + `ProfileScreen` (tab 1)
- **QR Scanner**: Full-screen `QrScannerScreen`, pushes over shell
- **Device mismatch**: `DeviceMismatchModal` — blocks scan if fingerprint mismatch detected
- **Scan result**: `ScanResultOverlay` — success/error feedback after scan attempt
- **Skeleton loading**: `SkeletonCard` shown while courses load

### React Web
- Modal dialogs for enrollment creation / course detail editing
- Responsive sidebar: collapsible with glass tooltip labels in collapsed mode
- Safe-area CSS insets for mobile browser compatibility
- Advanced Filtering: `CascadeFilterBar` for intuitive navigation in Admin Dashboard
- Batch Operations: `ProfessorMultiSelect` for efficient batch course assignments

---

## Workflow Logic

### Attendance Scan Flow (Flutter)
1. App auto-polls `/api/sessions/course/<id>/active/` to detect live sessions
2. Student taps "Scan Attendance" and picks Check-In (Start) or Check-Out (End)
3. Camera scans QR code → payload extracted
4. `ApiService` POSTs to `/api/attendance/scan/` (Check-In) or `/api/sessions/<id>/end-scan/` (Check-Out)
5. Backend validates: session active, student enrolled, fingerprint matches (for check-in)
6. Response → `ScanResultOverlay` shown (success/already marked/error)

### Auth Flow (Flutter)
1. App launches → `_SplashGate` calls `ApiService.fetchMe()`
2. Valid student token → `/dashboard` (MainShell)
3. Invalid/no token → `/login`

---

## Data Layer

### PostgreSQL (Tuned)
- `shared_buffers=2GB`, `effective_cache_size=5GB`, `work_mem=32MB`
- `max_connections=500`, `CONN_MAX_AGE=600` in Django (persistent connections)
- `CONN_HEALTH_CHECKS=True` — prevents stale socket hangs

### Redis
- Session backend: `django.contrib.sessions.backends.cache`
- Cache backend: `django_redis` with `max_connections=100`, 5s timeouts
- `maxmemory=200mb`, `allkeys-lru` eviction policy

### Django ORM
- Custom `User` model in `accounts` app
- Roles: `student`, `professor`, `admin`
- Academic Hierarchy: `StudyYear` model; `Professor` uses Many-to-Many for departments; `Student`/`Course` linked to `StudyYear`
- Enrollment model links Students ↔ Courses

---

## APIs / Integration

### Base URL (Flutter)
- Dev: `https://10.100.13.77:443/api`
- Prod: `https://alarb.attendance/api`
- Toggle: `ApiConstants._useLocalIp` (bool)

### Key Endpoints
| Endpoint                              | Method | Auth     | Description                  |
|---------------------------------------|--------|----------|------------------------------|
| `/api/auth/login/`                    | POST   | Public   | JWT token pair               |
| `/api/auth/me/`                       | GET    | JWT      | Current user info + role     |
| `/api/student/{id}/courses/`          | GET    | JWT      | Enrolled courses + stats     |
| `/api/attendance/scan/`               | POST   | JWT      | Submit QR scan (Check-in)    |
| `/api/sessions/course/{id}/active/`   | GET    | JWT      | Check for live session       |
| `/api/sessions/{id}/end-scan/`        | POST   | JWT      | Student check-out scan       |
| `/api/sessions/{id}/manual-end/`      | PATCH  | JWT      | Professor manual end with note|
| `/api/stats/`                         | GET    | JWT      | Dashboard aggregate stats    |

### CORS & CSRF
- `CORS_ALLOW_ALL_ORIGINS = True` (dev)
- `CSRF_TRUSTED_ORIGINS`: localhost, 10.100.13.77, alarb.attendance

### SSL
- Self-signed certs bypass enabled in Flutter (`MyHttpOverrides`)
- mkcert certs mounted at `./certs/cert.pem` and `./certs/key.pem`
- Nginx serves HTTPS on port 443

---

## Conventions

- **Flutter state**: `AppState` singleton (`ChangeNotifier`) — holds `themeMode`, `locale`, auth token
- **Flutter API layer**: All HTTP calls go through `ApiService` (centralized)
- **Flutter localization**: ARB files in `lib/l10n/`, supports `en` and `ar`
- **React state**: Context API only (no Redux/Zustand)
- **Backend views**: Class-based DRF views; public endpoints explicitly declare `permission_classes`
- **No inline styles** in Flutter — all decoration via `AppTheme.*` static methods/constants
- **Portrait-only**: Flutter app locked to portrait mode

---

## Constraints / Decisions

- Self-signed cert bypass active in Flutter — must be removed before production store release
- `DEBUG=True` and `ALLOWED_HOSTS=*` in docker-compose — development only
- Device fingerprinting is browser/device-bound — proxy attendance prevention mechanism
- Flutter app is **students only**; professors and admins use the React web app
- VM resources: 8 cores, 8GB RAM — Gunicorn 9 workers × 9 threads tuned accordingly
- Password hasher was temporarily switched to MD5 for load-testing — reverted to PBKDF2 in production
