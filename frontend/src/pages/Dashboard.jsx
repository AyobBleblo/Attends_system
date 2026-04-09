import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Link } from 'react-router-dom';
import { Users, BookOpen, UserCheck, Activity } from 'lucide-react';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/stats/')
      .then(res => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching stats", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div>
      <h1>System Dashboard</h1>
      {stats?.active_semester && (
        <div className="card" style={{ background: 'var(--primary)', color: 'white' }}>
          <h2>Current Active Semester: {stats.active_semester}</h2>
        </div>
      )}

      <div className="grid">
        <div className="card">
          <h3><Users size={20} /> Total Students</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats?.total_students || 0}</p>
        </div>
        <div className="card">
          <h3><UserCheck size={20} /> Total Professors</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats?.total_professors || 0}</p>
        </div>
        <div className="card">
          <h3><BookOpen size={20} /> Total Courses</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats?.total_courses || 0}</p>
        </div>
      </div>

      <h2 style={{ marginTop: '2rem' }}>Quick Actions</h2>
      <div className="grid">
        <Link to="/professor" className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
          <div style={{ background: 'var(--primary)', padding: '1rem', borderRadius: '8px', color: 'white' }}>
            <Activity size={24} />
          </div>
          <div>
            <h3>Start Session</h3>
            <p className="text-muted">For Professors to generate QR codes</p>
          </div>
        </Link>
        
        <Link to="/scan" className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
          <div style={{ background: 'var(--success)', padding: '1rem', borderRadius: '8px', color: 'white' }}>
            <UserCheck size={24} />
          </div>
          <div>
            <h3>Scan Attendance</h3>
            <p className="text-muted">For Students to scan QR codes</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default Dashboard;
