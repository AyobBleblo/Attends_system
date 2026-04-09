# Complete User Journey Scenario

This document traces the complete end-to-end workflow of the University Attendance System, highlighting user actions and the corresponding API behaviors.

## Phase 1: Administration & Setup

Before any classes begin, the university administration sets up the semester via the Django Admin interface (or utilizing the provided seed script).

**Actions:**
1. A new `Semester` ("Fall 2025") is created and marked as `is_active=True`. The system automatically deactivates any previously active semester.
2. `Department` structures (e.g., Computer Science, IT) are populated.
3. `Course`, `Professor`, and `Student` records are imported.
4. Professors are assigned to courses (`CourseAssignment`), and students are enrolled (`Enrollment`).

*Result*: The foundational data is intact.

---

## Phase 2: Professor Initiates an Active Session

Dr. Ahmed walks into the lecture hall to teach **CS301 (Database Systems)**.

**Actions:**
1. Dr. Ahmed logs into the frontend portal and clicks **Professor Dashboard**.
2. He selects his name from the dropdown. 
    `GET http://localhost:8000/api/professor/1/courses/`
    *Response:* Returns his assigned courses for the active semester.
3. He clicks **"Start Session"** next to CS301.
    `POST http://localhost:8000/api/sessions/create/`
    *Payload:* `{ "professor_id": "1", "course_id": "1" }`
    *Response:* `{ "id": 45, "qr_token": "a1b2c3d4-e5f6...", "qr_expires_at": "2025-10-14T09:15:00Z" }`
4. The React app immediately displays a large QR code on the projector screen using `qrcode.react`.
5. *Auto-Refresh*: Every 30 seconds, the React app silently requests a new session/token to prevent students from taking a picture of the QR code and sending it to friends at home.

---

## Phase 3: Student Scans the QR Code

Tariq (Student ID: `S1003`) arrives at the lecture hall, sits down, and opens the student portal on his smartphone.

**Actions:**
1. Tariq navigates to **"Scan Attendance"**.
2. He enters his Student ID `S1003`.
3. In a production environment, he clicks the camera logo to use `react-qr-reader` and physically points his camera at the projector screen. (For testing, the QR UUID string can be pasted into the manual fallback input field).
4. Tariq clicks **"Submit Attendance"**.
    `POST http://localhost:8000/api/attendance/scan/`
    *Payload:* `{ "student_id": "S1003", "qr_token": "a1b2c3d4-e5f6..." }`

**Backend Validation Check Sequence:**
- *Check 1*: Does token `a1b2...` map to a valid `Session`? (Yes)
- *Check 2*: Is `now()` < `qr_expires_at` (15-minute window)? (Yes)
- *Check 3*: Is the session tied to the current globally active semester? (Yes)
- *Check 4*: Is `S1003` actually enrolled in CS301 this semester? (Yes)
- *Check 5*: Has Tariq already scanned today for this session? (No)
- *Result*: The `Attendance` record is created successfully.

*Response:* `{ "success": true, "message": "Attendance recorded for Tariq." }`

Tariq's phone flashes a green checkbox. He is marked Present.

---

## Phase 4: Dealing with Bad Actors

**Scenario A: The "Photographer"**
Ali skips class. Tariq takes a picture of the projector screen at 9:02 AM and sends it to Ali on WhatsApp. Ali tries to upload it or use the token at 9:08 AM.
*Result*: The backend rejects the request: `"error": "This QR code has expired."` (Because the frontend forced a completely new UUID session at 9:02:30 AM, invalidating the old one).

**Scenario B: The Unenrolled Student**
Mona (an IT student taking different courses) sits in on Dr. Ahmed's class for fun and tries to scan the QR code to get free attendance points.
*Result*: Backend rejects request: `"error": "Student is not enrolled in CS301."`

---

## Phase 5: Administration & Reporting

The semester winds down, and the continuous evaluation center needs attendance reports.

**Actions:**
1. An admin clicks **Reports**.
2. They select "CS301" from the course filter dropdown.
    `GET http://localhost:8000/api/attendance/report/?course_id=1`
    *Response:* Returns a JSON array of all scan instances alongside summary statistics (Total present vs Enrollments).
3. The Admin clicks **Export CSV**.
4. The browser generates `attendance_report_16900...csv` containing standard spreadsheet formatting for easy grading integration.
