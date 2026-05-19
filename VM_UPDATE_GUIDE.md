# VM Deployment & Update Guide

Follow these steps to safely push your new University Hierarchy features to your production VM (`10.100.13.77`) and apply the database migrations without losing any data.

### Step 1: Push your local code
Since you just committed your code (`"Current project work greate"`), push it to your remote Git repository:
```bash
git push origin main
```
*(If you transfer files via `scp` instead of Git, use `scp` to copy your updated folders to the VM just like in your `DEPLOYMENT.md`).*

### Step 2: Access the VM & Update Code
SSH into your Ubuntu VM:
```bash
ssh username@10.100.13.77
```
Navigate to your project folder and pull the latest code:
```bash
cd /home/username/app
git pull origin main
```

### Step 3: Rebuild the Docker Containers
Because we added new frontend components (React) and new backend logic, you must rebuild the containers:
```bash
sudo docker compose up -d --build
```
> [!NOTE]
> This command will download any new Python dependencies, rebuild the Vite/React frontend, and restart the containers in the background.

### Step 4: Apply Database Migrations (CRITICAL)
Once the containers are running again, you must run the new database migrations we generated. This will add the `StudyYear` table and cleanly migrate the `Professor` departments.

Run this command to execute the migrations inside the running backend container:
```bash
sudo docker compose exec backend python manage.py migrate
```

> [!IMPORTANT]
> Because of the custom data migrations we wrote, running the above command will automatically:
> 1. Create the `StudyYear` table and populate it with "First Year" -> "Eighth Year".
> 2. Create the `Professor` M2M table.
> 3. Safely copy every professor's old single department into the new list.
> 4. Drop the old legacy column.

### Step 5: Verify

Once the migration completes successfully, open your browser: `http://10.100.13.77`

Log into the Admin Dashboard and verify that you see the new **Cascade Filter Bar** and the **Study Year** options in your creation modals!

---

### Step 6: Fix Frontend SSL Certificates (If needed)

If the frontend container fails to start due to `PEM_read_bio` errors, follow these steps to regenerate the SSL certificates:

1. **Go to your project folder:**
   ```bash
   cd ~/Alarab_attends_system
   ```

2. **Delete the broken certificate folders/files:**
   ```bash
   rm -rf certs/cert.pem certs/key.pem
   ```

3. **Generate new SSL certificates using mkcert:** 
   *(Since you are using mkcert for local HTTPS as per your docker-compose file)*
   ```bash
   # Generate the certificates
   mkcert alarb.attendance "*.alarb.attendance" localhost 127.0.0.1

   # Move and rename them into your certs folder so Docker can mount them
   mv alarb.attendance+3.pem certs/cert.pem
   mv alarb.attendance+3-key.pem certs/key.pem
   ```

4. **Restart the frontend container:**
   ```bash
   sudo docker compose restart frontend
   ```

> **Tip:** After doing this, run `sudo docker compose logs -f frontend`. You should see it start up successfully without the `PEM_read_bio` error!