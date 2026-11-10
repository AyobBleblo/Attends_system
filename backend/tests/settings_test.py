"""
Test-only Django settings.

Inherits everything from the main config.settings, then overrides:
  - DATABASES → PostgreSQL VM at 10.100.13.77  (Django auto-creates/drops test_attendance_db)
  - CACHES     → Django in-process LocMemCache  (no Redis dependency, best-practice for unit tests)
  - PASSWORD_HASHERS → MD5 only (makes test user creation ~500x faster)
  - SESSION_ENGINE   → database (no cache dependency)
"""
import os
import sys
from pathlib import Path
from dotenv import dotenv_values

# ── Make sure the backend package root is importable ────────────────────────
# When pytest is run from backend/tests/, Django can't find the apps without this.
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# ── Import everything from the real settings ─────────────────────────────────
from config.settings import *  # noqa: F401, F403

# ── Read .env credentials DIRECTLY (bypasses any already-set env vars) ──────
# config.settings calls load_dotenv() which only sets vars if NOT already in env.
# On some systems DB_HOST/DB_PASSWORD may already be set to Docker values.
# dotenv_values() reads the file directly without touching os.environ, so we
# always get the file's actual content.
_ENV_FILE = Path(BACKEND_DIR) / ".env"
_env = dotenv_values(_ENV_FILE) if _ENV_FILE.exists() else {}

# ── Database: PostgreSQL VM ──────────────────────────────────────────────────
# NOTE: The .env file sets DB_HOST=postgres (Docker container alias).
# We hard-code 10.100.13.77 here so tests ALWAYS connect to the real VM.
# We use _env (read directly from the .env file) for credentials to avoid
# picking up Docker-injected environment variables.
#
# IMPORTANT: If the DB_PASSWORD in .env does not match the running container,
# set TEST_DB_PASSWORD as an environment variable to override it.
_TEST_DB_PASSWORD = os.environ.get(
    "TEST_DB_PASSWORD",          # explicit override wins
    _env.get("DB_PASSWORD", "postgres"),  # fallback: read from .env
)

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        # Django prepends "test_" automatically → creates test_attendance_db
        "NAME": _env.get("DB_NAME", "attendance_db"),
        "USER": _env.get("DB_USER", "postgres"),
        "PASSWORD": _TEST_DB_PASSWORD,
        "HOST": "10.100.13.77",   # VM IP — intentionally not from env var
        "PORT": _env.get("DB_PORT", "5432"),
        # No persistent connections in tests — each test run is short-lived
        "CONN_MAX_AGE": 0,
        "CONN_HEALTH_CHECKS": False,
        "TEST": {
            "NAME": "test_attendance_db",
        },
    }
}


# ── Cache: in-process memory (no Redis needed) ───────────────────────────────
# Best practice: unit tests mock external services. Redis integration tests
# are a separate optional phase when you need to test cache behaviour itself.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "test-cache",
    }
}

# ── Session: use DB-backed sessions (avoids cache dependency) ────────────────
SESSION_ENGINE = "django.contrib.sessions.backends.db"
SESSION_CACHE_ALIAS = None

# ── Password hasher: MD5 only ────────────────────────────────────────────────
# PBKDF2 (the production default) is intentionally slow to brute-force.
# In tests we create dozens of users per run — switch to MD5 so test
# setup finishes in milliseconds not seconds.
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# ── Disable Django's cache middleware in tests ────────────────────────────────
# cache_page decorators still run but hit LocMemCache which is test-isolated.

# ── Secret key (fixed for reproducibility) ───────────────────────────────────
SECRET_KEY = "test-secret-key-not-for-production"

# ── Email: suppress outgoing mail ────────────────────────────────────────────
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
