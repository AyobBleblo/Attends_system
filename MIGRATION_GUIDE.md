# Server Migration Guide

This guide provides step-by-step instructions to safely move your Attendance System from your current machine/VM to a new VM **without losing any database data** (users, courses, or attendance records).

## Phase 1: Backup Your Current Database

Before moving anything, you must backup your PostgreSQL database. Do this on your **current machine/VM** where the application is currently running.

1. **Create a database dump inside the container:**
   Open a terminal in your project directory and run:
   ```bash
   docker compose exec db pg_dump -U postgres -d attendance_db -F c -f /tmp/db_backup.dump
   ```
   *(Note: If your `.env` file uses a different `DB_NAME` or `DB_USER`, replace `attendance_db` and `postgres` accordingly).*

2. **Copy the backup file out of the container to your host machine:**
   ```bash
   docker compose cp db:/tmp/db_backup.dump ./db_backup.dump
   ```
   You should now see a `db_backup.dump` file in your project folder.

## Phase 2: Transfer Files to the New VM

You need to copy your entire project folder (including the backup and `.env` files) to the new VM.

From your local machine (Windows), use `scp` to copy everything over:
```bash
scp -r "C:\Users\DQA\Ayoub Projects\Alarab_attends_system" username@<NEW-VM-IP>:/home/username/app
```
*(Replace `username` with your new VM's user, and `<NEW-VM-IP>` with the new VM's IP address).*

## Phase 3: Setup the New VM

1. **SSH into the new VM:**
   ```bash
   ssh username@<NEW-VM-IP>
   ```

2. **Install Docker and Docker Compose:**
   Run the setup commands from your existing deployment guide:
   ```bash
   sudo apt-get update
   sudo apt-get upgrade -y
   sudo apt-get install -y docker.io docker-buildx docker-compose-v2
   sudo systemctl enable --now docker
   sudo usermod -aG docker $USER
   newgrp docker
   ```

3. **Navigate to the transferred project directory:**
   ```bash
   cd /home/username/app/Alarab_attends_system
   ```

4. **Verify Environment Variables:**
   Ensure your `.env` file successfully copied over. You can check by running `ls -a`. If it's not there, copy it from the backend folder: `cp backend/.env .env`.

5. **Spin up the Application:**
   This will build the containers and start an empty database.
   ```bash
   docker compose up -d --build
   ```

## Phase 4: Restore Data on the New VM

Now that the new VM is running the app, we need to load your old data into the new database.

1. **Copy the backup file into the new DB container:**
   ```bash
   docker compose cp ./db_backup.dump db:/tmp/db_backup.dump
   ```

2. **Restore the database:**
   Run the following command to restore your data (the `--clean` flag drops any empty tables before restoring):
   ```bash
   docker compose exec db pg_restore -U postgres -d attendance_db --clean --if-exists /tmp/db_backup.dump
   ```

3. **Restart the Backend:**
   To ensure Django picks up the restored data correctly, safely restart the backend service:
   ```bash
   docker compose restart backend
   ```

## Phase 5: Update DNS / IP

You are completely migrated! You can now access your application via the new VM's IP address:
`http://<NEW-VM-IP>`

*(If you are using a custom domain name, don't forget to update your DNS A-records to point to the new VM's IP address).*
