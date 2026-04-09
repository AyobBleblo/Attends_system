#!/bin/bash
set -e

echo "Waiting for PostgreSQL to start..."
sleep 5

echo "Running makemigrations..."
python manage.py makemigrations --noinput

echo "Running migrate..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Seeding demo data (professors, students, courses)..."
python manage.py seed_demo

echo "Creating superuser if not exists..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
U = get_user_model()
if not U.objects.filter(username='admin').exists():
    U.objects.create_superuser('admin', 'admin@university.local', 'Admin@1234')
    print('Superuser created.')
else:
    print('Superuser already exists.')
"

echo "Starting Gunicorn..."
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3

