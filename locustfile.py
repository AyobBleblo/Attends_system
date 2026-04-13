from locust import HttpUser, task, between, events
from locust.exception import StopUser
import urllib3
import threading

# 1. Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

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
    # Set wait_time to 0 for maximum throughput per user
    wait_time = between(0, 0)

    def on_start(self):
        """
        Setup unique student credentials and authenticate.
        """
        self.client.verify = False
        
        # Get unique index
        raw_idx = student_counter.get_next()
        # Ensure we stay within our seeded data range (e.g., 1 to 1000)
        idx = ((raw_idx - 1) % 1000) + 1
        
        self.username = f"student_{idx}@university.local" 
        self.password = "Student@1234"
        self.student_id = f"STU{idx:04d}"
        self.qr_token = "test-qr-token-12345"

        # Login Logic
        with self.client.post("/api/auth/login/", json={
            "username": self.username,
            "password": self.password
        }, name="AUTH_Login", catch_response=True) as response:
            if response.status_code == 200:
                token = response.json().get("access")
                if token:
                    self.client.headers.update({"Authorization": f"Bearer {token}"})
                else:
                    response.failure("Login successful but no token received")
            else:
                response.failure(f"Login Failed: {response.status_code}")

    @task
    def scan_qr_code(self):
        payload = {
            "student_id": self.student_id,
            "qr_token": self.qr_token
        }

        # catch_response=True allows us to treat 400 as a success 
        # (e.g., "Already Scanned" is a valid business logic response)
        with self.client.post("/api/attendance/scan/", json=payload, name="POST_Scan_QR", catch_response=True) as response:
            if response.status_code == 200 or response.status_code == 201:
                response.success()
            elif response.status_code == 400:
                # If 400 means "Already marked present", it's a success in terms of server load
                response.success() 
            else:
                response.failure(f"Server Error: {response.status_code} - {response.text}")

        # Stop the user after one task to simulate real-world 'scan and leave' behavior
        raise StopUser()