#!/bin/bash
set -e

# ─────────────────────────────────────────────────────────────────────────────
# 1. Wait for PostgreSQL to be genuinely ready (not just "up")
# ─────────────────────────────────────────────────────────────────────────────
echo "⏳  Waiting for PostgreSQL to accept connections..."
python - <<'PYEOF'
import sys, time, os
import psycopg2

db_host = os.environ.get("DB_HOST", "db")
db_port = int(os.environ.get("DB_PORT", 5432))
db_name = os.environ.get("DB_NAME", "postgres")
db_user = os.environ.get("DB_USER", "postgres")
db_pass = os.environ.get("DB_PASSWORD", "postgres")

max_attempts = 30          # 30 * 2 s = up to 60 s
attempt = 0

while attempt < max_attempts:
    try:
        conn = psycopg2.connect(
            host=db_host, port=db_port,
            dbname=db_name, user=db_user, password=db_pass,
            connect_timeout=3,
        )
        conn.close()
        print(f"✅  PostgreSQL is ready (attempt {attempt + 1})")
        sys.exit(0)
    except psycopg2.OperationalError as e:
        attempt += 1
        print(f"⚠️   Not ready yet ({attempt}/{max_attempts}): {e}")
        time.sleep(2)

print("❌  PostgreSQL did not become ready in time. Aborting.")
sys.exit(1)
PYEOF

# ─────────────────────────────────────────────────────────────────────────────
# 2. Django management commands
# ─────────────────────────────────────────────────────────────────────────────
echo "🔄  Running makemigrations..."
python manage.py makemigrations --noinput

echo "🔄  Running migrate..."
python manage.py migrate --noinput

echo "📦  Collecting static files..."
python manage.py collectstatic --noinput

echo "🌱  Seeding demo data (professors, students, courses)..."
python manage.py seed_demo

# ─────────────────────────────────────────────────────────────────────────────
# 3. Create superuser if it doesn't exist
# ─────────────────────────────────────────────────────────────────────────────
echo "👤  Ensuring superuser exists and password hash is current..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
U = get_user_model()
user, created = U.objects.get_or_create(
    username='admin',
    defaults={'email': 'admin@university.local', 'is_staff': True, 'is_superuser': True}
)
# Always re-hash so the stored hash matches the current PASSWORD_HASHERS config.
user.set_password('Admin@1234')
user.is_staff = True
user.is_superuser = True
user.save()
print('✅  Superuser created.' if created else 'ℹ️   Superuser password hash refreshed.')
"

# ─────────────────────────────────────────────────────────────────────────────
# 3b. Seed load-test students (idempotent — skips if already exist)
# ─────────────────────────────────────────────────────────────────────────────
# echo "🧪  Seeding 1000 load-test students..."
# python manage.py seed_test_students --count 1000

# ─────────────────────────────────────────────────────────────────────────────
# Gunicorn — Tuned for 8 CPU Cores / 8 GB RAM
# ─────────────────────────────────────────────────────────────────────────────
#  workers        = 9   → Formula: (2 × cores) + 1 = (2×8)+1 = 17, but we cap
#                         at 9 to control DB connections. More workers = more
#                         idle RAM consumption and more PG connections, not more
#                         throughput past a certain point on an I/O-bound workload.
#
#  worker-class   = gthread → Native POSIX threads. REQUIRED for psycopg2.
#                         Each thread holds one persistent DB connection, so:
#                         workers(9) × threads(9) = 81 active DB connections.
#                         This is well below PG max_connections=150, leaving
#                         room for admin queries and migration connections.
#
#  threads        = 9   → Matches the number of workers. Each Gunicorn process
#                         gets 9 threads, giving 81 total concurrent request
#                         handlers. At 1000 RPS burst, queue depth stays low.
#
#  timeout        = 60  → Generous enough for a burst scenario (P99 should be
#                         well under 5s after tuning). Not 120s — that just
#                         hides slow queries instead of surfacing them.
#
#  keep-alive     = 75  → Matches Nginx's keepalive_timeout (75s). Mismatching
#                         this causes Nginx to hold connections that Gunicorn
#                         has already closed, generating 502 errors.
#
#  backlog        = 2048 → OS-level listen() queue. The kernel default is 128.
#                         Setting it higher means burst requests that arrive
#                         faster than workers can accept them are queued in the
#                         kernel rather than being immediately rejected (ECONNREFUSED).
#
#  worker-tmp-dir = /dev/shm → RAM disk for worker heartbeat files. On any
#                         virtualized environment (WSL2, Docker), the default
#                         /tmp is on a slow virtual FS. Using /dev/shm
#                         (a tmpfs mount) eliminates this I/O bottleneck.
#
#  max-requests   = 500 → Workers restart after 500 requests to release any
#  max-requests-jitter=50  accumulated memory leaks. Jitter prevents all workers
#                         from restarting simultaneously under load.
# ─────────────────────────────────────────────────────────────────────────────
echo "🚀  Starting Gunicorn (9 workers, gevent class, 1000 connections)..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 9 \
    --worker-class gevent \
    --worker-connections 1000 \
    --timeout 60 \
    --keep-alive 20 \
    --worker-tmp-dir /dev/shm \
    --backlog 2048 \
    --max-requests 500 \
    --max-requests-jitter 50 \
    --forwarded-allow-ips="*" \
    --access-logfile - \
    --error-logfile - \
    --log-level info