import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../utils/api';
import { BookOpen, Bluetooth, ClipboardList, TrendingUp } from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    API.get('/classes/my-classes').then(r => setClasses(r.data.classes)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="page-title">Hello, {user?.name?.split(' ')[0]} 👋</div>
            <div className="page-subtitle">{user?.rollNumber || user?.email}</div>
          </div>
          <div className="avatar">{user?.name?.[0]}</div>
        </div>
      </div>

      <div className="section">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="stat-card">
            <div className="stat-value text-accent">{classes.length}</div>
            <div className="stat-label">Enrolled</div>
          </div>
          <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/student/attendance')}>
            <div className="stat-value" style={{ color: 'var(--green)' }}>Mark</div>
            <div className="stat-label">Attendance</div>
          </div>
        </div>
      </div>

      <div className="section">
        <button className="btn btn-primary btn-full btn-lg" onClick={() => navigate('/student/attendance')} style={{ gap: 12 }}>
          <Bluetooth size={20} />
          Mark Attendance Now
        </button>
      </div>

      <div className="section">
        <span className="section-title">My Classes</span>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><span className="spinner" /></div>
        ) : classes.length === 0 ? (
          <div className="empty-state">
            <BookOpen /><h3>No classes joined</h3><p>Join a class using your class code</p>
            <button className="btn btn-primary" onClick={() => navigate('/student/classes')}>Join Class</button>
          </div>
        ) : (
          classes.map(cls => (
            <div key={cls._id} className="class-card" onClick={() => navigate(`/student/class/${cls._id}`)}>
              <div className="class-card-header">
                <div>
                  <div className="class-subject">{cls.subjectName}</div>
                  <div className="class-meta">
                    <span>{cls.subjectCode}</span>
                    <span>•</span>
                    <span>Sem {cls.semester}</span>
                    {cls.teacher && <><span>•</span><span>{cls.teacher.name}</span></>}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
