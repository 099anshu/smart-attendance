import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import { BookOpen, Clock } from 'lucide-react';

export default function StudentClasses() {
  const [classes, setClasses] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const r = await API.get('/classes/my-classes');
      const cls = r.data.classes;
      setClasses(cls);
      const results = await Promise.allSettled(
        cls.map(c => API.get(`/attendance/my-attendance/${c._id}`))
      );
      const map = {};
      results.forEach((res, i) => {
        if (res.status === 'fulfilled') map[cls[i]._id] = res.value.data.summary;
      });
      setAttendanceMap(map);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pctColor = (p) => p >= 75 ? 'var(--green)' : p >= 50 ? 'var(--yellow)' : 'var(--red)';

  return (
    <div>
      <div className="page-header">
        <div className="page-title">My Classes</div>
        <div className="page-subtitle">Enrolled by your teacher</div>
      </div>

      <div className="section">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><span className="spinner" /></div>
        ) : classes.length === 0 ? (
          <div className="empty-state">
            <Clock />
            <h3>No classes yet</h3>
            <p>Your teacher will enroll you into your subjects. Make sure you registered with your correct roll number and email.</p>
          </div>
        ) : (
          classes.map(cls => {
            const att = attendanceMap[cls._id];
            const pct = att?.percentage ?? null;
            return (
              <div key={cls._id} className="class-card" onClick={() => navigate(`/student/class/${cls._id}`)}>
                <div className="class-card-header">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="class-subject">{cls.subjectName}</div>
                    <div className="class-meta">
                      <span>{cls.subjectCode}</span><span>•</span><span>Sem {cls.semester}</span>
                      {cls.teacher && <><span>•</span><span>{cls.teacher.name}</span></>}
                    </div>
                  </div>
                  {pct !== null ? (
                    <div style={{ textAlign: 'center', flexShrink: 0, paddingLeft: 12 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: pctColor(pct), lineHeight: 1 }}>{pct}%</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>{att.present}/{att.total} classes</div>
                      {pct < 75 && <span className="badge badge-red" style={{ fontSize: 9, padding: '2px 6px', marginTop: 5 }}>Low</span>}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0, paddingLeft: 12 }}>No data</div>
                  )}
                </div>
                {pct !== null && (
                  <div className="progress-bar" style={{ marginTop: 8 }}>
                    <div className="progress-fill" style={{ width: `${pct}%`, background: pctColor(pct) }} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
