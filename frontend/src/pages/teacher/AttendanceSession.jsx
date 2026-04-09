import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { Radio, Users, Clock, CheckCircle, XCircle, StopCircle, ChevronLeft } from 'lucide-react';

function TimerRing({ timeLeft, duration }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const progress = timeLeft / duration;
  const offset = circ * (1 - progress);
  const color = progress > 0.5 ? 'var(--accent)' : progress > 0.2 ? 'var(--yellow)' : 'var(--red)';

  return (
    <div className="timer-wrap">
      <div className="timer-ring">
        <svg width="80" height="80">
          <circle className="timer-ring-bg" cx="40" cy="40" r={r} />
          <circle className="timer-ring-progress" cx="40" cy="40" r={r}
            style={{ stroke: color, strokeDasharray: circ, strokeDashoffset: offset }} />
        </svg>
        <div className="timer-number">{timeLeft}s</div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1 }}>remaining</div>
    </div>
  );
}

export default function AttendanceSession() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [cls, setCls] = useState(null);
  const [session, setSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [duration, setDuration] = useState(40);
  const [timeLeft, setTimeLeft] = useState(0);
  const pollRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    API.get(`/classes/${classId}`).then(r => setCls(r.data.class)).catch(() => {});
    checkActive();
    return () => { clearInterval(pollRef.current); clearInterval(timerRef.current); };
  }, [classId]);

  const checkActive = async () => {
    try {
      const r = await API.get(`/attendance/active/${classId}`);
      if (r.data.session) {
        setSession(r.data.session);
        setTimeLeft(r.data.session.timeRemaining);
        startPolling(r.data.session.id);
        startTimer(r.data.session.timeRemaining);
      }
    } catch {}
    setLoading(false);
  };

  const startTimer = (seconds) => {
    clearInterval(timerRef.current);
    let t = seconds;
    timerRef.current = setInterval(() => {
      t--;
      setTimeLeft(t);
      if (t <= 0) { clearInterval(timerRef.current); setSession(null); fetchRecords(); }
    }, 1000);
  };

  const startPolling = (sessionId) => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchRecords(sessionId), 3000);
  };

  const fetchRecords = async (sessionId) => {
    if (!sessionId && !session?.id) return;
    const id = sessionId || session?.id;
    try {
      const r = await API.get(`/attendance/session/${id}`);
      setRecords(r.data.records || []);
    } catch {}
  };

  const startSession = async () => {
    setStarting(true);
    try {
      const r = await API.post('/attendance/start', { classId, duration });
      const s = r.data.session;
      setSession({ ...s, timeRemaining: s.duration });
      setTimeLeft(s.duration);
      startPolling(s.id);
      startTimer(s.duration);
      toast.success('Attendance session started!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start session');
    }
    setStarting(false);
  };

  const endSession = async () => {
    try {
      await API.patch(`/attendance/end/${session.id}`);
      clearInterval(pollRef.current);
      clearInterval(timerRef.current);
      setSession(null);
      setTimeLeft(0);
      fetchRecords(session.id);
      toast.success('Session ended');
    } catch (err) {
      toast.error('Failed to end session');
    }
  };

  const toggleRecord = async (record) => {
    const newStatus = record.status === 'present' ? 'absent' : 'present';
    try {
      await API.patch(`/attendance/record/${record._id}`, { status: newStatus });
      setRecords(rs => rs.map(r => r._id === record._id ? { ...r, status: newStatus, manuallyModified: true } : r));
      toast.success(`Marked ${newStatus}`);
    } catch { toast.error('Failed to update'); }
  };

  const present = records.filter(r => r.status === 'present');
  const absent = records.filter(r => r.status === 'absent');

  if (loading) return <div className="loading-screen"><span className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', display: 'flex' }}><ChevronLeft size={20} /></button>
          <div>
            <div className="page-title">{cls?.subjectName || 'Attendance'}</div>
            <div className="page-subtitle">{cls?.subjectCode} • {session ? 'Session Active' : 'No Active Session'}</div>
          </div>
        </div>
      </div>

      {!session ? (
        <div className="section">
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <Radio size={40} style={{ color: 'var(--accent2)', margin: '0 auto 16px' }} />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Start New Session</div>
            <div style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 24 }}>Students must be physically near you and enter the code</div>
            <div className="form-group" style={{ marginBottom: 20, textAlign: 'left' }}>
              <label className="form-label">Session Duration</label>
              <select className="form-input form-select" value={duration} onChange={e => setDuration(Number(e.target.value))}>
                <option value={30}>30 seconds</option>
                <option value={40}>40 seconds</option>
                <option value={60}>1 minute</option>
                <option value={120}>2 minutes</option>
                <option value={300}>5 minutes</option>
                <option value={600}>10 minutes</option>
              </select>
            </div>
            <button className="btn btn-primary btn-full btn-lg" onClick={startSession} disabled={starting}>
              {starting ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : <><Radio size={18} /> Start Attendance</>}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="section">
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(108,99,255,0.05))', borderColor: 'rgba(108,99,255,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge badge-accent"><Radio size={10} /> LIVE</span>
                </div>
                <TimerRing timeLeft={timeLeft} duration={session.duration || duration} />
              </div>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Attendance Code</div>
                <div className="code-display">{session.code}</div>
              </div>
              <div className="stats-grid" style={{ marginBottom: 16 }}>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: 'var(--green)' }}>{present.length}</div>
                  <div className="stat-label">Present</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: 'var(--red)' }}>{absent.length}</div>
                  <div className="stat-label">Absent</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{records.length}</div>
                  <div className="stat-label">Total</div>
                </div>
              </div>
              <button className="btn btn-danger btn-full" onClick={endSession}>
                <StopCircle size={16} /> End Session
              </button>
            </div>
          </div>

          <div className="progress-bar" style={{ margin: '0 20px' }}>
            <div className="progress-fill" style={{ width: records.length ? `${(present.length/records.length)*100}%` : '0%' }} />
          </div>
        </>
      )}

      {records.length > 0 && (
        <div className="section">
          <div className="section-title">
            Attendance List {session && <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(auto-refreshing)</span>}
          </div>
          <div className="card card-sm">
            {records.map(record => (
              <div key={record._id} className="student-row">
                <div className="avatar">{record.student?.name?.[0]}</div>
                <div className="student-info">
                  <div className="student-name">{record.student?.name}</div>
                  <div className="student-roll">{record.student?.rollNumber || record.student?.email}</div>
                </div>
                {record.manuallyModified && <span style={{ fontSize: 10, color: 'var(--yellow)' }}>Edited</span>}
                <button onClick={() => toggleRecord(record)} className={`badge ${record.status === 'present' ? 'badge-green' : 'badge-red'}`} style={{ cursor: 'pointer', border: 'none' }}>
                  {record.status === 'present' ? <CheckCircle size={11} /> : <XCircle size={11} />}
                  {record.status}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
