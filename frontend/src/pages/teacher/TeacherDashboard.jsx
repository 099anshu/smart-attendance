import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../utils/api';
import { BookOpen, Users, PlayCircle, BarChart3, Plus } from 'lucide-react';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    API.get('/classes/my-classes').then(r => setClasses(r.data.classes)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const totalStudents = classes.reduce((s, c) => s + (c.students?.length || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="page-title">Hello, {user?.name?.split(' ')[0]} 👋</div>
            <div className="page-subtitle">Manage your classes and attendance</div>
          </div>
          <div className="avatar">{user?.name?.[0]}</div>
        </div>
      </div>

      <div className="section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value text-accent">{classes.length}</div>
            <div className="stat-label">Classes</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--green)' }}>{totalStudents}</div>
            <div className="stat-label">Students</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--yellow)' }}>0</div>
            <div className="stat-label">Live</div>
          </div>
        </div>
      </div>

      <div className="section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="section-title">Your Classes</span>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/teacher/classes')}>
            <Plus size={14} /> New Class
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><span className="spinner" /></div>
        ) : classes.length === 0 ? (
          <div className="empty-state">
            <BookOpen /><h3>No classes yet</h3><p>Create your first class to get started</p>
            <button className="btn btn-primary" onClick={() => navigate('/teacher/classes')}><Plus size={14} /> Create Class</button>
          </div>
        ) : (
          classes.map(cls => (
            <div key={cls._id} className="class-card" onClick={() => navigate(`/teacher/class/${cls._id}`)}>
              <div className="class-card-header">
                <div>
                  <div className="class-subject">{cls.subjectName}</div>
                  <div className="class-meta">
                    <span>{cls.subjectCode}</span>
                    <span>•</span>
                    <span>Sem {cls.semester}</span>
                    <span>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Users size={11} />{cls.students?.length || 0}</span>
                  </div>
                </div>
                <span className="class-code-badge">{cls.classCode}</span>
              </div>
              <div className="class-actions">
                <button className="btn btn-success btn-sm" onClick={e => { e.stopPropagation(); navigate(`/teacher/session/${cls._id}`); }}>
                  <PlayCircle size={14} /> Start Attendance
                </button>
                <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); navigate(`/teacher/reports?classId=${cls._id}`); }}>
                  <BarChart3 size={14} /> Report
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
