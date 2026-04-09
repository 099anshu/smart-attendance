import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { ChevronLeft, Users, PlayCircle, Upload, UserPlus, Trash2, CheckCircle, Clock, Smartphone, ShieldOff, Calendar, XCircle, ChevronDown, ChevronUp, FileSpreadsheet } from 'lucide-react';

export default function ClassDetail() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const fileRef = useRef();

  const [cls, setCls] = useState(null);
  const [approvedList, setApprovedList] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionRecords, setSessionRecords] = useState({});
  const [expandedSession, setExpandedSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('roster');
  const [uploading, setUploading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', rollNumber: '', email: '' });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    load();
    loadSessions();
  }, [classId]);

  const load = async () => {
    try {
      const [cr, sr] = await Promise.all([
        API.get(`/classes/${classId}`),
        API.get(`/classes/${classId}/students`)
      ]);
      setCls(cr.data.class);
      setApprovedList(sr.data.approvedList || []);
    } catch {}
    setLoading(false);
  };

  const loadSessions = async () => {
    try {
      const r = await API.get(`/reports/class/${classId}`);
      setSessions(r.data.sessions || []);
    } catch {}
  };

  // ── CSV/Excel upload ───────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const r = await API.post(`/classes/${classId}/upload-roster`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(r.data.message);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    }
    setUploading(false);
    e.target.value = '';
  };

  // ── Add single student ─────────────────────────────────────────────────
  const handleAddStudent = async () => {
    if (!addForm.rollNumber && !addForm.email) { toast.error('Enter roll number or email'); return; }
    setAdding(true);
    try {
      const r = await API.post(`/classes/${classId}/add-student`, addForm);
      toast.success(r.data.enrolled ? 'Student added & enrolled!' : 'Student added to roster (will enroll when they register)');
      setShowAddModal(false);
      setAddForm({ name: '', rollNumber: '', email: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add student');
    }
    setAdding(false);
  };

  // ── Remove student ─────────────────────────────────────────────────────
  const handleRemove = async (entry) => {
    if (!window.confirm(`Remove ${entry.name || entry.rollNumber || entry.email} from roster?`)) return;
    try {
      await API.delete(`/classes/${classId}/remove-student`, { data: { rollNumber: entry.rollNumber, email: entry.email } });
      toast.success('Student removed');
      load();
    } catch (err) {
      toast.error('Failed to remove');
    }
  };

  // ── Session history helpers ────────────────────────────────────────────
  const loadSessionDetail = async (sessionId) => {
    if (expandedSession === sessionId) { setExpandedSession(null); return; }
    setExpandedSession(sessionId);
    if (sessionRecords[sessionId]) return;
    setLoadingSession(sessionId);
    try {
      const r = await API.get(`/reports/session/${sessionId}`);
      setSessionRecords(prev => ({ ...prev, [sessionId]: r.data.records }));
    } catch {}
    setLoadingSession(null);
  };

  const toggleRecord = async (record, sessionId) => {
    const newStatus = record.status === 'present' ? 'absent' : 'present';
    setEditingRecord(record._id);
    try {
      await API.patch(`/attendance/record/${record._id}`, { status: newStatus });
      setSessionRecords(prev => ({ ...prev, [sessionId]: prev[sessionId].map(r => r._id === record._id ? { ...r, status: newStatus, manuallyModified: true } : r) }));
      toast.success(`Marked ${newStatus}`);
    } catch { toast.error('Failed to update'); }
    setEditingRecord(null);
  };

  const resetDevice = async (studentId, name) => {
    if (!window.confirm(`Reset device binding for ${name}?`)) return;
    try {
      await API.patch(`/auth/reset-device/${studentId}`);
      toast.success('Device binding reset');
      load();
    } catch { toast.error('Failed to reset'); }
  };

  if (loading) return <div className="loading-screen"><span className="spinner" /></div>;

  const enrolledCount = approvedList.filter(e => e.enrolled).length;
  const pendingCount  = approvedList.filter(e => !e.enrolled).length;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', display: 'flex' }}><ChevronLeft size={20} /></button>
          <div>
            <div className="page-title">{cls?.subjectName}</div>
            <div className="page-subtitle">{cls?.subjectCode} · Sem {cls?.semester}</div>
          </div>
        </div>
      </div>

      <div className="section">
        {/* Stat row */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="stat-card" style={{ flex: 1 }}>
            <div className="stat-value text-accent">{approvedList.length}</div>
            <div className="stat-label">In Roster</div>
          </div>
          <div className="stat-card" style={{ flex: 1 }}>
            <div className="stat-value" style={{ color: 'var(--green)', fontSize: 22 }}>{enrolledCount}</div>
            <div className="stat-label">Enrolled</div>
          </div>
          <div className="stat-card" style={{ flex: 1 }}>
            <div className="stat-value" style={{ color: 'var(--yellow)', fontSize: 22 }}>{pendingCount}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card" style={{ flex: 1 }}>
            <div className="stat-value" style={{ fontSize: 22 }}>{sessions.length}</div>
            <div className="stat-label">Sessions</div>
          </div>
        </div>

        <button className="btn btn-success btn-full" onClick={() => navigate(`/teacher/session/${classId}`)}>
          <PlayCircle size={16} /> Start Attendance Session
        </button>

        {/* Tabs */}
        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'roster' ? 'active' : ''}`} onClick={() => setTab('roster')}>
            <Users size={12} style={{ display: 'inline', marginRight: 4 }} />Roster
          </button>
          <button className={`auth-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
            <Calendar size={12} style={{ display: 'inline', marginRight: 4 }} />Session History
          </button>
        </div>

        {/* ── ROSTER TAB ── */}
        {tab === 'roster' && (
          <>
            {/* Upload + Add buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => fileRef.current.click()} disabled={uploading}>
                {uploading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Upload size={14} />}
                {uploading ? 'Uploading...' : 'Upload CSV/Excel'}
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setShowAddModal(true)}>
                <UserPlus size={14} /> Add Manually
              </button>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleFileUpload} />
            </div>

            {/* CSV format hint */}
            <div style={{ padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--text3)' }}>
              <FileSpreadsheet size={13} style={{ display: 'inline', marginRight: 5, color: 'var(--accent2)' }} />
              CSV columns: <strong style={{ color: 'var(--text2)' }}>name, roll_number, email</strong> — students auto-enroll when they register with matching roll no or email.
            </div>

            {/* Roster list */}
            {approvedList.length === 0 ? (
              <div className="empty-state">
                <Users /><h3>Roster is empty</h3>
                <p>Upload a CSV/Excel file or add students manually</p>
              </div>
            ) : (
              <div className="card card-sm">
                {approvedList.map((entry, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div className="avatar" style={{
                      background: entry.enrolled ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                      borderColor: entry.enrolled ? 'var(--green)' : 'var(--yellow)', fontSize: 12
                    }}>
                      {entry.name?.[0] || entry.rollNumber?.[0] || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {entry.name || '—'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {entry.rollNumber && <span>{entry.rollNumber}</span>}
                        {entry.rollNumber && entry.email && <span> · </span>}
                        {entry.email && <span>{entry.email}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span className={`badge ${entry.enrolled ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize: 10 }}>
                        {entry.enrolled ? <><CheckCircle size={9} /> Enrolled</> : <><Clock size={9} /> Pending</>}
                      </span>
                      {entry.userId && (
                        <button onClick={() => resetDevice(entry.userId, entry.name)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <ShieldOff size={10} /> Reset device
                        </button>
                      )}
                    </div>
                    <button onClick={() => handleRemove(entry)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4, display: 'flex' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── SESSION HISTORY TAB ── */}
        {tab === 'history' && (
          <>
            {sessions.length === 0 ? (
              <div className="empty-state"><Calendar /><h3>No sessions yet</h3></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sessions.map((s, i) => (
                  <div key={s._id || i} className="card card-sm" style={{ cursor: 'pointer' }} onClick={() => loadSessionDetail(s._id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--bg3)', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{new Date(s.startTime).getDate()}</span>
                        <span style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase' }}>{new Date(s.startTime).toLocaleString('en', { month: 'short' })}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{new Date(s.startTime).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(s.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ color: 'var(--green)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}><CheckCircle size={13} />{s.presentCount}</span>
                        <span style={{ color: 'var(--red)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}><XCircle size={13} />{s.absentCount}</span>
                        {expandedSession === s._id ? <ChevronUp size={15} color="var(--text3)" /> : <ChevronDown size={15} color="var(--text3)" />}
                      </div>
                    </div>
                    {expandedSession === s._id && (
                      <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 10 }}>✏️ Tap badge to manually edit</div>
                        {loadingSession === s._id ? (
                          <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}><span className="spinner" /></div>
                        ) : (
                          (sessionRecords[s._id] || []).map(r => (
                            <div key={r._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                              <div className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{r.student?.name?.[0]}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{r.student?.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.student?.rollNumber}</div>
                              </div>
                              {r.manuallyModified && <span style={{ fontSize: 9, color: 'var(--yellow)', background: 'var(--yellow-dim)', padding: '2px 6px', borderRadius: 4 }}>Edited</span>}
                              <button onClick={() => toggleRecord(r, s._id)} disabled={editingRecord === r._id}
                                className={`badge ${r.status === 'present' ? 'badge-green' : 'badge-red'}`}
                                style={{ cursor: 'pointer', border: 'none', minWidth: 72, justifyContent: 'center', gap: 4 }}>
                                {editingRecord === r._id ? <span className="spinner" style={{ width: 10, height: 10, borderTopColor: 'currentColor' }} />
                                  : r.status === 'present' ? <><CheckCircle size={10} /> Present</> : <><XCircle size={10} /> Absent</>}
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Add Student Modal ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div className="modal-title">Add Student to Roster</div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" placeholder="Student name" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Roll Number</label>
                <input className="form-input" placeholder="e.g. 21CS001" value={addForm.rollNumber} onChange={e => setAddForm(f => ({ ...f, rollNumber: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="student@email.com" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div style={{ padding: '10px 12px', background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 10, fontSize: 12, color: 'var(--text2)' }}>
                💡 If the student has already registered, they'll be enrolled instantly. Otherwise they'll be enrolled automatically when they register.
              </div>
              <button className="btn btn-primary btn-full" onClick={handleAddStudent} disabled={adding}>
                {adding ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : <><UserPlus size={14} /> Add to Roster</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
