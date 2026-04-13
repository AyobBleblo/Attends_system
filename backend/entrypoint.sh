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

max_attempts = 30          # 30 × 2 s = up to 60 s
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
echo "🧪  Seeding 1000 load-test students..."
python manage.py seed_test_students --count 1000

# ─────────────────────────────────────────────────────────────────────────────
#    workers      = 9 (optimized for 12 cores + Locust)
#    worker-class = gthread (native threads — avoids gevent monkey-patching issues)
#    threads      = 2 per worker (18 concurrent request slots)
#    timeout      = 120 s  (covers heavy PDF/report endpoints)
#    access-logfile - = stream access logs to stdout (Docker/K8s friendly)
# ─────────────────────────────────────────────────────────────────────────────
echo "🚀  Starting Gunicorn (9 gthread workers × 2 threads, 120 s timeout)..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 9 \
    --worker-class gthread \
    --threads 2 \
    --timeout 120 \
    --keep-alive 5 \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
