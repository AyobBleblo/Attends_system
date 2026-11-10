<div align="center">

<img src="./Alarab_image_white mode.png" alt="Alarab Logo" width="180"/>

# 🎓 Alarab Attendance System

**A production-ready, QR-based university attendance platform built for real classrooms.**

[![Django](https://img.shields.io/badge/Django-6.0-092E20?style=flat-square&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![Nginx](https://img.shields.io/badge/Nginx-TLS%20%2B%20HTTP%2F2-009639?style=flat-square&logo=nginx&logoColor=white)](https://nginx.org/)

</div>

---

## 📌 Overview

The **Alarab Attendance System** replaces paper-based roll calls with a secure, real-time QR code workflow. A professor opens a session on their device — a rotating QR code appears on the projector — and students scan it with their phones. Attendance is recorded instantly.

The system is designed to be **fraud-resistant** and **scalable**:
- **Device fingerprinting** locks each student account to a single trusted browser — no proxying or sharing sessions.
- **Redis caching** absorbs 1,000-student burst scans without hitting the database more than once per session.
- **Rotating QR tokens** (15-min TTL, manual refresh) prevent screenshot sharing between classes.
- **Gunicorn + gevent** handles 1,000+ concurrent WebSocket-free connections on a single VM.

---

## 🏗️ Architecture

```
                        ┌──────────────────────────────────────┐
  Browser / Phone ──►   │  Nginx (TLS/HTTP2 · port 443/80)     │
                        │  React SPA + API Reverse Proxy        │
                        └──────────────┬───────────────────────┘
                                       │ /api/*  /admin/*
                        ┌──────────────▼───────────────────────┐
                        │  Gunicorn  (9 workers · gevent)       │
                        │  Django 6 REST API + Admin            │
                        └──────┬──────────────┬────────────────┘
                               │              │
               ┌───────────────▼──┐    ┌──────▼─────────────────┐
               │  PostgreSQL 15   │    │  Redis 7                │
               │  (attendance DB) │    │  (session QR cache)     │
               └──────────────────┘    └────────────────────────┘
```

| Layer | Technology | Role |
|---|---|---|
| **Frontend** | React 18 + Vite + Tailwind CSS | Student & professor SPA |
| **API** | Django 6 + Django REST Framework | Business logic & data layer |
| **Auth** | Simple JWT (8 h access / 7 d refresh) | Stateless token auth |
| **Cache** | Redis 7 (LRU · 200 MB cap) | QR session validation cache |
| **Database** | PostgreSQL 15 (tuned) | Persistent data store |
| **Reverse Proxy** | Nginx (TLS 1.2/1.3 · HTTP/2 · gzip) | Edge, SSL termination, static serving |
| **Runtime** | Gunicorn + gevent | Async WSGI for 1 K+ concurrent requests |
| **Containers** | Docker Compose | One-command deployment |

---

## ✨ Key Features

| Feature | Details |
|---|---|
| 📱 **QR Attendance** | Per-session rotating QR codes with 15-minute TTL |
| 🔒 **Anti-Proxy Lock** | Device fingerprint (FingerprintJS) bound to each student account |
| 🚀 **Redis Cache-Aside** | Session metadata cached for 15 min — zero DB hits after first scan |
| 📊 **Live Reports** | Real-time session attendance list; per-course analytics; CSV export |
| 🎓 **Role-Based Access** | Admin / Professor / Student permissions enforced at view level |
| 🔔 **Compliance Alerts** | Background notifications when professors fall behind lecture targets |
| 📲 **Mobile Flutter App** | `alarab_student_app/` — companion app for student scanning |
| 🔐 **HTTPS Everywhere** | Nginx enforces HTTPS on all routes; required for camera API (`getUserMedia`) |

---

## 🗂️ Project Structure

```
.
├── backend/                   # Django REST API
│   ├── accounts/              # Student & Professor models, JWT auth
│   ├── attendance/            # Sessions, QR scanning service, reports
│   ├── courses/               # Courses, assignments, compliance tracking
│   ├── core/                  # Departments, semesters, notifications
│   ├── config/                # Django settings, URL root
│   ├── Dockerfile             # Python 3.12-slim image
│   └── entrypoint.sh          # Migrate → collectstatic → seed → Gunicorn
│
├── frontend/                  # React 18 SPA
│   ├── src/
│   │   ├── pages/             # Professor dashboard, student scan view, admin
│   │   ├── components/        # QR display, attendance table, modals
│   │   └── context/           # Auth context (JWT storage)
│   ├── nginx.conf             # Production Nginx config (TLS, gzip, proxy)
│   └── Dockerfile             # Multi-stage: Node build → Nginx serve
│
├── alarab_student_app/        # Flutter mobile companion app
├── certs/                     # TLS certificates (mkcert — not committed)
├── docker-compose.yml         # Production deployment (8-core VM)
└── FRESH_DEPLOYMENT_GUIDE.md  # Step-by-step fresh deploy instructions
```

---

## 🐳 Docker Deployment

### 🖥️ Deployment

#### Prerequisites

- Docker ≥ 24 and Docker Compose v2 installed
- `mkcert` installed ([install guide](https://github.com/FiloSottile/mkcert#installation))

#### Step 1 — Clone the repository

```bash
git clone https://github.com/AyobBleblo/Attends_system.git
cd Attends_system
```

#### Step 2 — Generate TLS certificates

The frontend container requires HTTPS so the browser's camera API (`getUserMedia`) works on student phones.

```bash
# Install the local CA into your OS/browser trust store (run once per machine)
mkcert -install

# Generate the certificate for your local domain
mkcert alarb.attendance "*.alarb.attendance" localhost 127.0.0.1

# Rename the output files and place them in certs/
mkdir -p certs
mv alarb.attendance+3.pem         certs/cert.pem
mv alarb.attendance+3-key.pem     certs/key.pem
```

> [!NOTE]
> Add `alarb.attendance` to your `/etc/hosts` (Linux/Mac) or `C:\Windows\System32\drivers\etc\hosts` (Windows):
> ```
> 127.0.0.1   alarb.attendance
> ```

#### Step 3 — Configure environment variables

```bash
cp backend/.env .env
```

Edit `.env` and set your secrets:

```env
SECRET_KEY=your-very-long-random-secret-key-here
DB_NAME=attendance_db
DB_USER=postgres
DB_PASSWORD=a_strong_database_password
```

> [!CAUTION]
> Never commit your `.env` file. It is listed in `.gitignore` by default.

#### Step 4 — Build and start

```bash
docker compose up -d --build
```

The `entrypoint.sh` will automatically:
1. ⏳ Wait for PostgreSQL to accept connections (up to 60 s)
2. 🔄 Apply all Django migrations
3. 📦 Collect static files
4. 🌱 Seed demo data (professors, students, courses)
5. 👤 Create the `admin` superuser
6. 🚀 Start Gunicorn (9 workers · gevent · 1,000 connections)

#### Step 5 — Verify everything is running

```bash
docker compose ps
```

You should see four containers with status `Up`:

```
NAME                STATUS
attends_db          Up (healthy)
attends_redis       Up
attends_backend     Up
attends_frontend    Up
```

#### Step 6 — Access the application

| URL | Description |
|---|---|
| `https://alarb.attendance` | Main application (student & professor views) |
| `https://alarb.attendance/admin/` | Django admin panel |
| `https://alarb.attendance/api/` | REST API root |

**Default admin credentials:**
```
Username: admin
Password: Admin@1234
```

> [!WARNING]
> Change the admin password immediately after first login in a production environment.

---

### 🔧 Common Docker Commands

```bash
# View real-time logs for all services
docker compose logs -f

# View logs for a specific service
docker compose logs -f backend

# Restart a single service without rebuild
docker compose restart backend

# Run a Django management command
docker compose exec backend python manage.py <command>

# Open a Django shell
docker compose exec backend python manage.py shell

# Stop all containers (data preserved)
docker compose down

# ⚠️  Stop and wipe ALL data (destructive — resets the database)
docker compose down -v
```

---

### 🏗️ Container Resource Allocation (Production)

The `docker-compose.yml` enforces explicit CPU and memory limits so no single service can starve the others:

```
┌─────────────┬──────────┬────────────┬─────────────────────────────────────┐
│ Container   │ CPU Limit│ RAM Limit  │ Notes                               │
├─────────────┼──────────┼────────────┼─────────────────────────────────────┤
│ backend     │ 6 cores  │ 3.5 GB     │ 9 Gunicorn workers × gevent         │
│ db          │ 2 cores  │ 2 GB       │ shared_buffers=2 GB (I/O-bound)     │
│ frontend    │ 2 cores  │ 512 MB     │ Nginx event-driven — extremely lean │
│ redis       │ 1 core   │ 256 MB     │ Single-threaded; LRU eviction       │
└─────────────┴──────────┴────────────┴─────────────────────────────────────┘
  Total        11 cores   6.25 GB     Leaves 25% CPU headroom on 8-core host
```

---

## ⚙️ Backend Configuration

### Gunicorn Tuning

The backend is tuned for high-concurrency burst scenarios (1,000 simultaneous student scans):

| Parameter | Value | Rationale |
|---|---|---|
| `--workers` | 9 | `(2 × 4 cores) + 1`, capped to control DB connections |
| `--worker-class` | gevent | Async I/O — handles scan burst without blocking |
| `--worker-connections` | 1,000 | Max concurrent connections per worker |
| `--worker-tmp-dir` | `/dev/shm` | RAM disk for heartbeat files — eliminates virtual FS latency |
| `--backlog` | 2,048 | OS-level connection queue; prevents `ECONNREFUSED` on burst |
| `--max-requests` | 500 | Workers recycle after 500 requests to prevent memory leaks |
| `--keep-alive` | 20 s | Matches Nginx `keepalive_timeout` to avoid 502 errors |

### PostgreSQL Tuning (Production)

| Parameter | Value | Rationale |
|---|---|---|
| `shared_buffers` | 2 GB | 25% of RAM — PostgreSQL's primary I/O cache |
| `effective_cache_size` | 5 GB | Tells planner how much OS page cache is available |
| `work_mem` | 32 MB | Per-sort allocation; `150 × 32 MB = 4.8 GB` worst case |
| `wal_buffers` | 64 MB | Reduces fsync pressure during 1,000-INSERT burst |
| `max_connections` | 500 | Leaves slots for admin + migrations beyond Gunicorn's 81 |
| `random_page_cost` | 1.1 | Treats Docker volume as near-sequential (SSD); uses index scans |

---

## 🔌 API Overview

Full documentation is in [`backend/BACKEND_EXPLAINED.md`](./backend/BACKEND_EXPLAINED.md).

### Authentication

```http
POST /api/auth/login/        # → { access, refresh }
POST /api/auth/refresh/      # Rotate access token
GET  /api/auth/me/           # Current user profile + role
```

All protected endpoints require:
```http
Authorization: Bearer <access_token>
```

### Core Endpoints

```
GET  /api/core/stats/                           Dashboard metrics
POST /api/attendance/sessions/create/           Start a lecture session
GET  /api/attendance/sessions/<id>/qr/          Get live QR code (base64 PNG)
POST /api/attendance/sessions/<id>/refresh-qr/  Rotate QR token
POST /api/attendance/attendance/scan/           Student submits scan
GET  /api/attendance/attendance/course-report/<id>/  Full attendance matrix
GET  /api/attendance/export/course/<id>/        Export CSV
```

---

## 🛡️ Security Design

```
┌─────────────────────────────────────────────────────────────────┐
│  Anti-Fraud Layers                                               │
├─────────────────────────────────────────────────────────────────┤
│  1. JWT authentication   — stateless, 8-hour expiry             │
│  2. Device fingerprint   — one trusted device per student        │
│  3. Rotating QR tokens   — 15-min TTL, manual rotation on demand │
│  4. DB unique_together   — no duplicate attendance at DB level   │
│  5. TLS everywhere       — HTTPS enforced, HTTP redirected       │
│  6. Enrollment check     — only enrolled students can scan       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧪 Load Testing

A k6 load test script is included at [`k6_script.js`](./k6_script.js) to simulate 1,000 concurrent student scans.

```bash
# Run with k6 (https://k6.io/)
k6 run k6_script.js
```

The system is profiled to handle **1,000 simultaneous POST `/api/attendance/attendance/scan/`** requests within a single burst window with P99 latency under 5 seconds.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push and open a Pull Request

---

## 📄 License

This project was built as an academic capstone for Alarab University. All rights reserved.

---

<div align="center">

Built with ❤️ by **Ayoub** · Powered by Django, React & Docker

</div>

