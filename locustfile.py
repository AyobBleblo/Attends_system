from locust import FastHttpUser, task, between
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

class AttendanceLoadTest(FastHttpUser):
    # Set wait_time to 0 for maximum throughput per user
    wait_time = between(0, 0)

    def on_start(self):
        """
        Setup unique student credentials. We don't login here anymore, 
        since the user requested a specific task for login attacks.
        """
        # Ensure we stay within our seeded data range (e.g., 1 to 1000)
        raw_idx = student_counter.get_next()
        idx = ((raw_idx - 1) % 1000) + 1
        
        self.username = f"student_{idx}@university.local" 
        self.password = "Student@1234" # This uses MD5 matching in settings.py

    @task(1)
    def test_baseline_performance(self):
        """
        Hits the Performance_test_view to measure raw network and worker 
        throughput without database overhead.
        """
        with self.client.get("/api/attendance/performance-test/", name="GET_Baseline_View", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Baseline Failed: {response.status_code}")

    @task(1)
    def test_login_performance(self):
        """
        Attacks the login endpoint with MD5 hashed passwords.
        """
        with self.client.post("/api/auth/login/", json={
            "username": self.username,
            "password": self.password
        }, name="POST_Login_MD5", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Login Failed: {response.status_code}")