# Deployment Guide (Ubuntu VM)

This guide walks you through deploying the Attendance System via Docker on an Ubuntu VM.

## 1. Install Docker and Docker Compose

Log into your Ubuntu VM, and run the following commands:
```bash
# Update packages
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker and its plugins (including Compose V2)
sudo apt-get install -y docker.io docker-buildx docker-compose-v2

# Start and enable Docker
sudo systemctl enable --now docker

# Optional: Add your user to the docker group so you don't need 'sudo' for docker commands
sudo usermod -aG docker $USER
newgrp docker
```

## 2. Transfer Project to VM
You must transfer your code to the VM. You can either:
- Push the code to a Git repository like GitHub and clone it on the VM.
- Or, use `scp` / `sftp` from your local machine to copy the directory.

Example using `scp` (from your windows machine):
```bash
scp -r "C:\Users\DQA\Ayoub Projects\Alarab_attends_system" username@<VM-IP>:/home/username/app
```

## 3. Set Up Environment Variables
Once the files are on the VM, go to the project directory:
```bash
cd /home/username/app
```

Create or verify the `.env` file in the root directory. Since your variables are currently in `backend/.env`, you can simply copy it to the root level so Docker Compose automatically picks them up for the database service too.

```bash
cp backend/.env .env
```

## 4. Build and Run Containers
Now spin up the application:

```bash
# This builds the frontend/backend, pulls postgres, and starts everything in the background
sudo docker compose up -d --build
```

You can verify that the containers are running successfully:
```bash
sudo docker compose ps
```

If you need to view logs to ensure both the backend and frontend started properly:
```bash
# View backend logs (where you should see "Starting Gunicorn...")
sudo docker compose logs -f backend

# View frontend proxy logs
sudo docker compose logs -f frontend
```

## 5. Access the Application
The application is now running and bound to port `80`.
- Open a web browser on any device (PC or Mobile) connected to the same network as the VM.
- Enter the VM's IP address: `http://<VM-IP>`

The React frontend will load immediately. Any API requests made by the frontend (like login or getting attendance lists) will cleanly route to `/api/` which Nginx securely forwards to your Django backend service.
The database is safely persisted automatically inside the Docker volume `postgres_data`, ensuring no data loss occurs across restarts.
