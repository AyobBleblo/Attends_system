from locust import HttpUser, task, between, events
import threading
import urllib3
# 1. إيقاف تحذيرات الشهادات غير الآمنة في الكونسول
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
# A thread-safe counter to generate unique student digits (1 to 100)
# Adjust the formatting to perfectly match how your students are seeded.
class Counter:
    def __init__(self):
        self.val = 1
        self.lock = threading.Lock()

    def get_next(self):
        with self.lock:
            val = self.val
            self.val += 1
            return val

student_counter = Counter()

class AttendanceLoadTest(HttpUser):
    # Wait 1-2 seconds between tasks (can be removed if you want them to hammer non-stop)
    wait_time = between(1, 2)

    def on_start(self):
        """
        Executed when a simulated user starts.
        1. Grab a unique student profile.
        2. Send login request to get JWT Token.
        3. Attach token to session headers.
        """
        idx = student_counter.get_next()
        self.client.verify = False
        
        # ─────────────────────────────────────────────────────────────────
        # CHANGE THESE TO MATCH YOUR SEED DATA / AUTHENTICATION LOGIC
        # ─────────────────────────────────────────────────────────────────
        # Example: student_1@university.local, student123, etc.
        self.username = f"student_{idx}@university.local" 
        self.password = "Student@1234"
        
        # Student ID that the /api/attendance/scan/ endpoint expects
        self.student_id = f"STU{idx:03d}"  

        # A valid or dummy QR token to test DB concurrency
        self.qr_token = "test-qr-token-12345"
        
        # 1. Login to retrieve the JWT Token
        response = self.client.post("/api/auth/login/", json={
            "username": self.username,
            "password": self.password
        }, name="AUTH /api/auth/login/")

        if response.status_code == 200:
            token = response.json().get("access")
            if token:
                self.client.headers.update({"Authorization": f"Bearer {token}"})
        else:
            # If login fails, log it. (Useful to see if DB is bottlenecking on auth)
            print(f"⚠️ Login Failed for {self.username} - Status: {response.status_code}")

    @task
    def scan_qr_code(self):
        """
        Send a POST request to the attendance scan endpoint.
        """
        payload = {
            "student_id": self.student_id,
            "qr_token": self.qr_token
        }

        # 2. Hit the attendance scan endpoint
        with self.client.post("/api/attendance/scan/", json=payload, name="POST /api/attendance/scan/", catch_response=True) as response:
            
            # The API might successfully register (200) or return (400) because "You have already registered"
            # Both signify the DB logic executed correctly under load, so we mark it as success to isolate true 500 errors.
            if response.status_code == 200:
                response.success()
            elif response.status_code == 400:
                # You can comment this out if you strictly want 400s to show as failures in Locust, 
                # but "Already Registered" is an expected load-test race-condition error, not an infrastructure crash.
                response.success()
            else:
                response.failure(f"Crash / Error: Status {response.status_code} - {response.text}")
