import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import { ChevronLeft, Bluetooth, CheckCircle, XCircle, Calendar, Clock } from 'lucide-react';

export default function StudentClassDetail() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [cls, setCls] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      API.get(`/classes/${classId}`),
      API.get(`/attendance/my-attendance/${classId}`)
    ]).then(([cr, ar]) => {
      setCls(cr.data.class);
      setAttendance(ar.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [classId]);

  const pctColor = (p) => p >= 75 ? 'var(--green)' : p >= 50 ? 'var(--yellow)' : 'var(--red)';
  const pct = attendance?.summary?.percentage ?? 0;

  if (loading) return <div className="loading-screen"><span className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', display: 'flex' }}>
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="page-title">{cls?.subjectName}</div>
            <div className="page-subtitle">
              {cls?.subjectCode} · Sem {cls?.semester}
              {cls?.teacher ? ` · ${cls.teacher.name}` : ''}
            </div>
          </div>
        </div>
      </div>

      <div className="section">

        {/* Circular % + summary */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>

            {/* SVG circle progress */}
            <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
              <svg width="90" height="90" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="45" cy="45" r="38" fill="none" stroke="var(--border)" strokeWidth="6" />
                <circle
                  cx="45" cy="45" r="38" fill="none"
                  stroke={pctColor(pct)} strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 38}
                  strokeDashoffset={2 * Math.PI * 38 * (1 - pct / 100)}
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, color: pctColor(pct), lineHeight: 1 }}>
                  {pct}%
                </div>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 12 }}>
                Attendance Summary
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--green)' }}>
                    {attendance?.summary?.present || 0}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Present</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--red)' }}>
                    {attendance?.summary?.absent || 0}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Absent</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>
                    {attendance?.summary?.total || 0}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total</div>
                </div>
              </div>
            </div>
          </div>

          {pct < 75 && attendance?.summary?.total > 0 && (
            <div className="alert alert-error" style={{ marginTop: 14 }}>
              ⚠️ Your attendance is below 75%. You need to attend more classes.
            </div>
          )}
        </div>

        {/* Mark attendance button */}
        <button className="btn btn-primary btn-full" onClick={() => navigate('/student/attendance')}>
          <Bluetooth size={16} /> Mark Today's Attendance
        </button>

        {/* Attendance history with date AND time */}
        <div className="section-title" style={{ marginTop: 4 }}>Attendance History</div>

        {!attendance?.records?.length ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <Calendar />
            <h3>No sessions yet</h3>
            <p>Your attendance history will appear here</p>
          </div>
        ) : (
          <div className="card card-sm">
            {attendance.records.map(r => {
              const sessionDate = r.session?.startTime ? new Date(r.session.startTime) : null;
              return (
                <div key={r._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>

                  {/* Status icon box */}
                  <div style={{
                    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: r.status === 'present' ? 'var(--green-dim)' : 'var(--red-dim)'
                  }}>
                    {r.status === 'present'
                      ? <CheckCircle size={17} color="var(--green)" />
                      : <XCircle size={17} color="var(--red)" />}
                  </div>

                  <div style={{ flex: 1 }}>
                    {/* Date */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, fontSize: 14 }}>
                      <Calendar size={12} color="var(--text3)" />
                      {sessionDate
                        ? sessionDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                        : r.date || '—'}
                    </div>
                    {/* Time */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>
                      <Clock size={11} />
                      {sessionDate
                        ? sessionDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                        : 'Time not recorded'}
                    </div>
                  </div>

                  <span className={`badge ${r.status === 'present' ? 'badge-green' : 'badge-red'}`}>
                    {r.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}