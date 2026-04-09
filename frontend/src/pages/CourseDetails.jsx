import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { QRCodeSVG } from 'qrcode.react';
import { PlayCircle, StopCircle, Users, ArrowLeft, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function CourseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Live session state
  const [activeSession, setActiveSession] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [attendanceList, setAttendanceList] = useState([]);

  const fetchHistory = () => {
    setLoading(true);
    api.get(`/sessions/course/${id}/`)
      .then(res => {
        setSessions(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHistory();
  }, [id]);

  useEffect(() => {
    let qrInterval, attendInterval;
    if (activeSession) {
      // Auto-refresh QR every 30 seconds
      qrInterval = setInterval(() => {
        startSession(activeSession.course);
      }, 30000);

      // Poll attendance count every 5 seconds
      attendInterval = setInterval(() => {
        api.get(`/attendance/session/${activeSession.id}/`)
          .then(res => {
            setAttendanceCount(res.data.length);
            setAttendanceList(res.data);
          })
          .catch(console.error);
      }, 5000);

      return () => {
        clearInterval(qrInterval);
        clearInterval(attendInterval);
      };
    }
  }, [activeSession]);

  const startSession = (courseId) => {
    api.post('/sessions/create/', {
      professor_id: user.id,
      course_id: courseId,
    })
      .then(res => {
        setActiveSession({ ...res.data, course: courseId });
        setQrCode(res.data.qr_token);
        setAttendanceCount(0);
        setAttendanceList([]);
      })
      .catch(err => alert('Error starting session: ' + (err.response?.data?.error || err.message)));
  };

  const endSession = () => {
    setActiveSession(null);
    setQrCode(null);
    fetchHistory(); // Refresh history
  };

  const exportCSV = async () => {
    try {
      const response = await api.get(`/export/course/${id}/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `course_${id}_attendance.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export CSV. Make sure you have attendance data.');
    }
  };

  const selectedCourseName = sessions.length > 0 ? sessions[0].course_code : `Course #${id}`;

  return (
    <div className="dashboard-container fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button className="btn" onClick={() => navigate('/professor')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ArrowLeft size={18} /> Back
        </button>
        <h1 style={{ margin: 0 }}>{selectedCourseName} Dashboard</h1>
      </div>

      {!activeSession ? (
        <div className="card p-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0 }}>Session History</h2>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={exportCSV}
                className="btn"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)' }}
              >
                <Download size={18} /> Export Course CSV
              </button>
              <button
                className="btn btn-success"
                onClick={() => startSession(id)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <PlayCircle size={18} /> Start New Session
              </button>
            </div>
          </div>

          {loading ? (
            <p>Loading history...</p>
          ) : (
            <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '0.75rem' }}>Date & Time</th>
                  <th style={{ padding: '0.75rem' }}>Professor</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem' }}>{new Date(s.date_time).toLocaleString()}</td>
                    <td style={{ padding: '0.75rem' }}>{s.professor_name}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--success)' }}>Completed</td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No history found. Start a new session!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
          {/* QR Code Panel */}
          <div className="card" style={{ textAlign: 'center' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>Live QR Code</h2>
            <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Auto-refreshes every 30 seconds
            </p>
            <div className="qr-container" style={{ display: 'inline-block', padding: '1rem', background: '#fff', borderRadius: '12px' }}>
              {qrCode && (
                <QRCodeSVG value={qrCode} size={220} level="H" includeMargin={true} />
              )}
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <h3>Students Present: <span style={{ color: 'var(--success)', fontSize: '2rem' }}>{attendanceCount}</span></h3>
            </div>
            <button
              className="btn"
              style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', width: '100%', background: '#ef4444', color: '#fff' }}
              onClick={endSession}
            >
              <StopCircle size={18} /> End Session
            </button>
          </div>

          {/* Live Attendance List */}
          <div className="card p-4">
            <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} /> Live Attendance
            </h2>
            {attendanceList.length === 0 ? (
              <p className="text-muted">Waiting for students to scan...</p>
            ) : (
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.5rem' }}>Student ID</th>
                    <th style={{ padding: '0.5rem' }}>Name</th>
                    <th style={{ padding: '0.5rem' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceList.map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.5rem' }}>{a.student_id}</td>
                      <td style={{ padding: '0.5rem' }}>{a.student_name}</td>
                      <td style={{ padding: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {new Date(a.scanned_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CourseDetails;
