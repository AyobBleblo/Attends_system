import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Download } from 'lucide-react';

function AttendanceReport() {
  const [courses, setCourses] = useState([]);
  const [filter, setFilter] = useState({ course_id: '' });
  const [data, setData] = useState({ results: [], summary: {} });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch courses for filter dropdown
    api.get('/courses/')
      .then(res => setCourses(res.data))
      .catch(console.error);
  }, []);

  const fetchReport = () => {
    setLoading(true);
    let url = '/attendance/report/';
    if (filter.course_id) url += `?course_id=${filter.course_id}`;
    
    api.get(url)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReport();
  }, [filter]);

  const handleExport = () => {
    if (!data.results.length) return alert("No data to export");
    const headers = ['Student ID', 'Student Name', 'Course', 'Date', 'Status'];
    const csvContent = [
      headers.join(','),
      ...data.results.map(r => [
        r.student_id, 
        r.student_name, 
        r.course_code, 
        new Date(r.scanned_at).toLocaleString(), 
        r.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `attendance_report_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Attendance Reports</h1>
        <button className="btn" onClick={handleExport} disabled={!data.results.length}>
          <Download size={18} /> Export CSV
        </button>
      </div>

      <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>Filter by Course</label>
          <select 
            className="select" 
            style={{ marginBottom: 0 }}
            value={filter.course_id}
            onChange={(e) => setFilter({ course_id: e.target.value })}
          >
            <option value="">All Courses</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <p className="text-muted">Total Records</p>
          <h2>{data.summary.total_records || 0}</h2>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <p className="text-muted">Total Present</p>
          <h2 style={{ color: 'var(--success)' }}>{data.summary.total_present || 0}</h2>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading report...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Course</th>
                <th>Scan Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.results.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No attendance records found.</td>
                </tr>
              ) : (
                data.results.map(row => (
                  <tr key={row.id}>
                    <td><strong>{row.student_id}</strong></td>
                    <td>{row.student_name}</td>
                    <td><span className="badge" style={{ background: 'var(--bg)', color: 'var(--text-main)', border: '1px solid var(--border)' }}>{row.course_code}</span></td>
                    <td>{new Date(row.scanned_at).toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-${row.status}`}>
                        {row.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AttendanceReport;
