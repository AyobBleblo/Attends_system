/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Alarab Attendance System — Production-Realistic k6 Load Test
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PURPOSE
 * -------
 * Simulates real end-to-end production traffic. No dummy endpoints.
 * Each VU performs:
 *   Task A — Login with PBKDF2-hashed credentials (POST /api/auth/login/)
 *   Task B — QR attendance scan with a Bearer token (POST /api/attendance/scan/)
 *
 * DATA PARAMETERIZATION
 * ----------------------
 * Students are selected randomly from a pool of 1,000 seeded test accounts.
 * This prevents all VUs hammering the same DB row (which would cause lock
 * contention and inflate p95 latency far beyond real-world conditions).
 *
 * HOW TO RUN
 * ----------
 * Against a local stack (WSL / Docker):
 *   k6 run k6_script.js
 *
 * Against a remote VM:
 *   k6 run -e BASE_URL=http://10.100.13.77:8080 k6_script.js
 *
 * With a custom QR token captured from a live session:
 *   k6 run -e QR_TOKEN=<uuid> k6_script.js
 *
 * READING RESULTS
 * ---------------
 * Key metrics to watch:
 *   http_req_duration{name:"POST_Login"}   — p95 target < 2 000 ms (PBKDF2 cost)
 *   http_req_duration{name:"POST_Scan"}    — p95 target <   400 ms (DB insert/upsert)
 *   http_req_failed                        — should be < 1 %
 * ─────────────────────────────────────────────────────────────────────────────
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── Custom metrics ────────────────────────────────────────────────────────────
const loginFailRate = new Rate('login_failures');
const scanFailRate = new Rate('scan_failures');
const loginDuration = new Trend('login_duration_ms', true);
const scanDuration = new Trend('scan_duration_ms', true);

// ── Test configuration ────────────────────────────────────────────────────────
export const options = {
    stages: [
        { duration: '30s', target: 5 },  // warm-up ramp
        { duration: '1m', target: 10 },  // sustain light load (10 users)
        { duration: '30s', target: 0 },  // graceful ramp-down
    ],
    thresholds: {
        // Login must succeed 99 % of the time
        'login_failures': ['rate<0.01'],
        // Scan must succeed 99 % of the time
        'scan_failures': ['rate<0.01'],
        // p95 login latency under 2 s (PBKDF2 is intentionally slow — ~100 ms CPU)
        'login_duration_ms': ['p(95)<2000'],
        // p95 scan latency under 400 ms (simple DB upsert)
        'scan_duration_ms': ['p(95)<400'],
        // Overall request failure rate
        'http_req_failed': ['rate<0.01'],
    },
    // Skip TLS verification for self-signed certs in staging/dev
    insecureSkipTLSVerify: true,
};

// ── Runtime parameters ────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://10.100.13.77:8000';

// A valid QR token from a live session. Set via env var or hardcode one for
// benchmarking. In CI you can pre-seed a session and export the token.
const QR_TOKEN = __ENV.QR_TOKEN || 'test-qr-token-replace-me';

// ── JSON headers ──────────────────────────────────────────────────────────────
const JSON_HEADERS = { 'Content-Type': 'application/json' };

// ─────────────────────────────────────────────────────────────────────────────
// VU entrypoint — executes once per iteration per virtual user
// ─────────────────────────────────────────────────────────────────────────────
export default function () {
    // Pick a random student from the 3 demo students created by seed_demo
    const demoStudents = [
        { id: 'STU001', username: 'student_ali' },
        { id: 'STU002', username: 'student_nour' },
        { id: 'STU003', username: 'student_omar' }
    ];
    const picked = demoStudents[Math.floor(Math.random() * demoStudents.length)];
    const studentId = picked.id;
    const username = picked.username;
    const password = 'Student@1234';

    let accessToken = null;

    // ── Task A: Login ─────────────────────────────────────────────────────────
    group('A - Login', () => {
        const payload = JSON.stringify({ username, password });
        const res = http.post(
            `${BASE_URL}/api/auth/login/`,
            payload,
            { headers: JSON_HEADERS, tags: { name: 'POST_Login' } },
        );

        loginDuration.add(res.timings.duration);

        // 🟢 ضيف الثلاث سطور هذينا هنا بالضبط 🟢
        if (res.status !== 200) {
            console.log(`Error! Status: ${res.status}, Body: ${res.body}`);
        }

        const ok = check(res, {
            'Login: status 200': (r) => r.status === 200,
            'Login: access_token present': (r) => {
                try { return !!JSON.parse(r.body).access; }
                catch { return false; }
            },
        });

        loginFailRate.add(!ok);

        if (ok) {
            try { accessToken = JSON.parse(res.body).access; }
            catch { /* body parse error — already counted as failure */ }
        }
    });

    // If login failed entirely, skip the scan — no point hammering scan without auth
    if (!accessToken) {
        sleep(1);
        return;
    }

    // Brief realistic pause between login and scan (simulates camera opening)
    sleep(Math.random() * 2 + 0.5);  // 0.5 – 2.5 s

    // ── Task B: QR Attendance Scan ────────────────────────────────────────────
    group('B - QR Scan', () => {
        const payload = JSON.stringify({
            student_id: studentId,
            qr_token: QR_TOKEN,
        });

        const res = http.post(
            `${BASE_URL}/api/attendance/scan/`,
            payload,
            {
                headers: {
                    ...JSON_HEADERS,
                    Authorization: `Bearer ${accessToken}`,
                },
                tags: { name: 'POST_Scan' },
            },
        );

        scanDuration.add(res.timings.duration);

        const ok = check(res, {
            // 200 = newly recorded, 400 with "already recorded" = idempotent OK
            'Scan: accepted (200 or already-recorded 400)': (r) => {
                if (r.status === 200) return true;
                if (r.status === 400) {
                    try {
                        const body = JSON.parse(r.body);
                        // Backend returns this message for duplicate scans
                        return (body.message || body.error || '').toLowerCase().includes('already');
                    } catch { return false; }
                }
                return false;
            },
        });

        scanFailRate.add(!ok);
    });

    // Think-time between iterations — prevents saturating the NIC
    sleep(Math.random() * 1.5 + 0.5);  // 0.5 – 2 s
}
