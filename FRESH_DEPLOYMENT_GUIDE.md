# Fresh Deployment Guide (With Clean Database)

This guide walks you through pulling the latest code on a new machine, starting with a completely clean database, and creating a single admin user.

## 1. Clone or Pull the Project

If this is a new machine, clone the repository:
```bash
git clone git@github.com:AyobBleblo/Attends_system.git
cd Attends_system
```

If the project is already cloned and you just need to update it:
```bash
git pull origin main
```

## 2. Prepare Environment Variables and Certs

Ensure you have your `.env` file and `certs/` ready in the project directory.
```bash
# If .env does not exist in the root, copy it from backend
cp backend/.env .env
```

## 3. Clear Existing Database (Warning: Destructive)

To ensure you have a completely fresh database, we will bring down the docker containers and delete the associated volumes (which removes all old PostgreSQL data and Redis cache).

```bash
sudo docker compose down -v
```
> **Note:** The `-v` flag is critical here as it deletes the named volumes, ensuring the database is completely wiped clean.

## 4. Build and Start the Project

Spin up the application with the fresh database:

```bash
sudo docker compose up -d --build
```

Wait about 10-15 seconds for PostgreSQL to initialize and the backend to apply all the database migrations automatically.

## 5. Create the Initial Admin User

Now that the database is fresh and the migrations are applied, run this command to create your specific admin user with the requested credentials:
- **Username:** `admin`
- **Password:** `Admin@1234`

```bash
sudo docker compose exec backend python manage.py shell -c "
from django.contrib.auth import get_user_model;
User = get_user_model();
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'Admin@1234')
    print('Superuser admin created successfully.')
else:
    user = User.objects.get(username='admin')
    user.set_password('Admin@1234')
    user.save()
    print('Superuser admin already existed. Password updated.')
"
```

## 6. Access the Application

The system is now fully deployed, clean, and ready.
- **Frontend & Admin Login:** Access via your server IP or domain.
- Log in with `admin` and `Admin@1234`. The database will have no other data.
