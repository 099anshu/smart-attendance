import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import API from '../../utils/api';
import { BarChart3, Users, Calendar, CheckCircle, XCircle, ChevronDown, ChevronUp, Search, Download, AlertTriangle } from 'lucide-react';

// ── Tiny Excel export (CSV that Excel opens perfectly) ──────────────────────
function exportToExcel(report, cls) {
  const subjectName = cls?.subjectName || 'Subject';
  const subjectCode = cls?.subjectCode || '';
  const teacherName = cls?.teacher?.name || '';
  const below75 = (report.studentStats || []).filter(s => s.percentage < 75);

  const rows = [
    [`AttendX – Attendance Report`],
    [`Subject:`, `${subjectName} (${subjectCode})`],
    [`Professor:`, teacherName],
    [`Total Sessions:`, report.totalSessions],
    [`Generated:`, new Date().toLocaleString('en-IN')],
    [],
    [`Students Below 75% Attendance`],
    [`Roll No`, `Name`, `Present`, `Absent`, `Total`, `Percentage`],
    ...below75.map(s => [
      s.student.rollNumber || '—',
      s.student.name,
      s.present,
      s.absent,
      s.total,
      `${s.percentage}%`
    ]),
    [],
    [`All Students`],
    [`Roll No`, `Name`, `Present`, `Absent`, `Total`, `Percentage`, `Status`],
    ...(report.studentStats || []).sort((a, b) => b.percentage - a.percentage).map(s => [
      s.student.rollNumber || '—',
      s.student.name,
      s.present,
      s.absent,
      s.total,
      `${s.percentage}%`,
      s.percentage >= 75 ? 'OK' : 'LOW'
    ])
  ];

  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${subjectCode}_attendance_report.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [searchParams] = useSearchParams();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(searchParams.get('classId') || '');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('students');

  // Search states
  const [studentSearch, setStudentSearch] = useState('');
  const [sessionDateSearch, setSessionDateSearch] = useState('');
  const [sessionNameSearch, setSessionNameSearch] = useState('');

  // Session expand
  const [expandedSession, setExpandedSession] = useState(null);
  const [sessionRecords, setSessionRecords] = useState({});
  const [loadingSession, setLoadingSession] = useState(null);

  useEffect(() => {
    API.get('/classes/my-classes').then(r => setClasses(r.data.classes)).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedClass) loadReport(selectedClass);
    else setReport(null);
  }, [selectedClass]);

  const loadReport = async (classId) => {
    setLoading(true); setReport(null);
    try {
      const r = await API.get(`/reports/class/${classId}`);
      setReport(r.data);
    } catch {}
    setLoading(false);
  };

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

  const pctColor = (pct) => pct >= 75 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)';
  const avgPct = report?.studentStats?.length > 0
    ? Math.round(report.studentStats.reduce((s, st) => s + st.percentage, 0) / report.studentStats.length) : 0;

  // Filtered student list
  const filteredStudents = useMemo(() => {
    if (!report?.studentStats) return [];
    const q = studentSearch.toLowerCase().trim();
    if (!q) return [...report.studentStats].sort((a, b) => b.percentage - a.percentage);
    return [...report.studentStats]
      .filter(s => s.student.name.toLowerCase().includes(q) || (s.student.rollNumber || '').toLowerCase().includes(q))
      .sort((a, b) => b.percentage - a.percentage);
  }, [report, studentSearch]);

  // Filtered session list
  const filteredSessions = useMemo(() => {
    if (!report?.sessions) return [];
    return report.sessions.filter(s => {
      const dateStr = new Date(s.startTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', weekday: 'long' }).toLowerCase();
      const matchDate = !sessionDateSearch || dateStr.includes(sessionDateSearch.toLowerCase());
      return matchDate;
    });
  }, [report, sessionDateSearch]);

  const selectedCls = classes.find(c => c._id === selectedClass);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="page-title">Reports</div>
            <div className="page-subtitle">Attendance analytics & export</div>
          </div>
          {report && (
            <button className="btn btn-secondary btn-sm" onClick={() => exportToExcel(report, { ...report.class, teacher: selectedCls?.teacher })}>
              <Download size={14} /> Export
            </button>
          )}
        </div>
      </div>

      <div className="section">
        {/* Class selector */}
        <div className="form-group">
          <label className="form-label">Select Class</label>
          <select className="form-input form-select" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setView('students'); setExpandedSession(null); setStudentSearch(''); setSessionDateSearch(''); }}>
            <option value="">Choose a class...</option>
            {classes.map(c => <option key={c._id} value={c._id}>{c.subjectName} ({c.subjectCode})</option>)}
          </select>
        </div>

        {!selectedClass && !loading && (
          <div className="empty-state"><BarChart3 /><h3>Select a class</h3><p>Choose a class to view reports</p></div>
        )}

        {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><span className="spinner" /></div>}

        {report && !loading && (
          <>
            {/* 4 stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {[
                { value: report.totalSessions, label: 'Sessions', color: 'var(--accent2)' },
                { value: report.class?.students?.length || 0, label: 'Students', color: 'var(--text)' },
                { value: `${avgPct}%`, label: 'Avg Att.', color: pctColor(avgPct) },
                { value: report.studentStats?.filter(s => s.percentage < 75).length || 0, label: 'Below 75%', color: 'var(--red)' },
              ].map(({ value, label, color }) => (
                <div key={label} className="stat-card">
                  <div className="stat-value" style={{ color, fontSize: 18 }}>{value}</div>
                  <div className="stat-label">{label}</div>
                </div>
              ))}
            </div>

            {/* Avg bar */}
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--text2)' }}>Class Average Attendance</span>
                <span style={{ fontWeight: 700, color: pctColor(avgPct) }}>{avgPct}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${avgPct}%`, background: pctColor(avgPct) }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text3)' }}>
                <span>0%</span><span style={{ color: 'var(--yellow)' }}>75% threshold</span><span>100%</span>
              </div>
            </div>

            {/* Below 75% alert banner */}
            {report.studentStats?.filter(s => s.percentage < 75).length > 0 && (
              <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertTriangle size={16} />
                <div>
                  <strong>{report.studentStats.filter(s => s.percentage < 75).length} student(s)</strong> below 75% attendance.
                  <button onClick={() => exportToExcel(report, { ...report.class, teacher: selectedCls?.teacher })}
                    style={{ background: 'none', border: 'none', color: 'var(--red)', textDecoration: 'underline', cursor: 'pointer', marginLeft: 8, fontSize: 12 }}>
                    Export list →
                  </button>
                </div>
              </div>
            )}

            {/* View toggle */}
            <div className="auth-tabs">
              <button className={`auth-tab ${view === 'students' ? 'active' : ''}`} onClick={() => setView('students')}>
                <Users size={13} style={{ display: 'inline', marginRight: 4 }} />Student-wise
              </button>
              <button className={`auth-tab ${view === 'sessions' ? 'active' : ''}`} onClick={() => setView('sessions')}>
                <Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />Session-wise
              </button>
            </div>

            {/* ── STUDENT-WISE VIEW ── */}
            {view === 'students' && (
              <>
                {/* Search bar */}
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                  <input
                    className="form-input"
                    placeholder="Search by name or roll number..."
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    style={{ paddingLeft: 36 }}
                  />
                </div>

                <div className="card card-sm">
                  {filteredStudents.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>
                      {studentSearch ? 'No students match your search' : 'No student data yet'}
                    </div>
                  ) : (
                    filteredStudents.map((st, i) => (
                      <div key={i} style={{ borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar" style={{
                            background: pctColor(st.percentage) === 'var(--green)' ? 'rgba(34,197,94,0.15)' : pctColor(st.percentage) === 'var(--yellow)' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                            borderColor: pctColor(st.percentage)
                          }}>{st.student.name[0]}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.student.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{st.student.rollNumber || st.student.email}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: pctColor(st.percentage) }}>{st.percentage}%</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{st.present}/{st.total} classes</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                          <div className="progress-bar" style={{ flex: 1 }}>
                            <div className="progress-fill" style={{ width: `${st.percentage}%`, background: pctColor(st.percentage) }} />
                          </div>
                          {st.percentage < 75 && <span className="badge badge-red" style={{ fontSize: 10, padding: '2px 6px' }}>Low</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* ── SESSION-WISE VIEW ── */}
            {view === 'sessions' && (
              <>
                {/* Date search */}
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                  <input
                    className="form-input"
                    placeholder="Search by date (e.g. 16 Mar, Monday...)"
                    value={sessionDateSearch}
                    onChange={e => setSessionDateSearch(e.target.value)}
                    style={{ paddingLeft: 36 }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredSessions.length === 0 ? (
                    <div className="empty-state"><Calendar /><h3>{sessionDateSearch ? 'No sessions match' : 'No sessions yet'}</h3></div>
                  ) : (
                    filteredSessions.map((s, i) => (
                      <div key={s._id || i} className="card card-sm" style={{ cursor: 'pointer' }} onClick={() => loadSessionDetail(s._id)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--bg3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{new Date(s.startTime).getDate()}</span>
                            <span style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase' }}>{new Date(s.startTime).toLocaleString('en', { month: 'short' })}</span>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>
                              {new Date(s.startTime).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                              {new Date(s.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: 'var(--green)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                              <CheckCircle size={12} />{s.presentCount}
                            </span>
                            <span style={{ color: 'var(--red)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                              <XCircle size={12} />{s.absentCount}
                            </span>
                            {expandedSession === s._id ? <ChevronUp size={15} color="var(--text3)" /> : <ChevronDown size={15} color="var(--text3)" />}
                          </div>
                        </div>

                        {/* Expanded student list — with name search inside */}
                        {expandedSession === s._id && (
                          <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }} onClick={e => e.stopPropagation()}>
                            {/* Name search inside session */}
                            <div style={{ position: 'relative', marginBottom: 10 }}>
                              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                              <input
                                className="form-input"
                                placeholder="Search student in this session..."
                                value={sessionNameSearch}
                                onChange={e => setSessionNameSearch(e.target.value)}
                                style={{ paddingLeft: 30, fontSize: 13, padding: '8px 8px 8px 30px' }}
                                onClick={e => e.stopPropagation()}
                              />
                            </div>
                            {loadingSession === s._id ? (
                              <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}><span className="spinner" /></div>
                            ) : (
                              (sessionRecords[s._id] || [])
                                .filter(r => !sessionNameSearch || r.student?.name?.toLowerCase().includes(sessionNameSearch.toLowerCase()) || (r.student?.rollNumber || '').toLowerCase().includes(sessionNameSearch.toLowerCase()))
                                .map(r => (
                                  <div key={r._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                                    <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{r.student?.name?.[0]}</div>
                                    <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{r.student?.name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.student?.rollNumber}</div>
                                    <span className={`badge ${r.status === 'present' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 10 }}>{r.status}</span>
                                  </div>
                                ))
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
