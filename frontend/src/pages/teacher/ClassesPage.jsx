import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { Plus, X, BookOpen, Users, PlayCircle, Copy } from 'lucide-react';

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ subjectName: '', subjectCode: '', semester: '' });
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const load = () => {
    API.get('/classes/my-classes').then(r => setClasses(r.data.classes)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const createClass = async () => {
    if (!form.subjectName || !form.subjectCode || !form.semester) { toast.error('Fill all fields'); return; }
    setCreating(true);
    try {
      await API.post('/classes/create', form);
      toast.success('Class created!');
      setShowModal(false);
      setForm({ subjectName: '', subjectCode: '', semester: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create class');
    }
    setCreating(false);
  };

  const copyCode = (code, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    toast.success('Class code copied!');
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><div className="page-title">Classes</div><div className="page-subtitle">Manage your subjects</div></div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}><Plus size={14} /> New</button>
        </div>
      </div>

      <div className="section">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><span className="spinner" /></div>
        ) : classes.length === 0 ? (
          <div className="empty-state">
            <BookOpen /><h3>No classes yet</h3><p>Create your first class below</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={14} /> Create Class</button>
          </div>
        ) : (
          classes.map(cls => (
            <div key={cls._id} className="class-card" onClick={() => navigate(`/teacher/class/${cls._id}`)}>
              <div className="class-card-header">
                <div>
                  <div className="class-subject">{cls.subjectName}</div>
                  <div className="class-meta">
                    <span>{cls.subjectCode}</span><span>•</span><span>Sem {cls.semester}</span>
                    <span>•</span><span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Users size={11} />{cls.students?.length || 0} students</span>
                  </div>
                </div>
                <button className="class-code-badge" onClick={e => copyCode(cls.classCode, e)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {cls.classCode} <Copy size={10} />
                </button>
              </div>
              <div className="class-actions">
                <button className="btn btn-success btn-sm" onClick={e => { e.stopPropagation(); navigate(`/teacher/session/${cls._id}`); }}>
                  <PlayCircle size={14} /> Start Attendance
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div className="modal-title">Create New Class</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Subject Name</label>
                <input className="form-input" placeholder="e.g. Data Structures" value={form.subjectName} onChange={e => setForm(f => ({ ...f, subjectName: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Subject Code</label>
                <input className="form-input" placeholder="e.g. DS301" value={form.subjectCode} onChange={e => setForm(f => ({ ...f, subjectCode: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Semester</label>
                <select className="form-input form-select" value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}>
                  <option value="">Select semester</option>
                  {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select>
              </div>
              <button className="btn btn-primary btn-full" onClick={createClass} disabled={creating}>
                {creating ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Create Class'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
