import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { GraduationCap, BookOpen, Eye, EyeOff, Smartphone, ShieldX, Mail, RefreshCw } from 'lucide-react';
import API from '../../utils/api';

// ── Device blocked screen ────────────────────────────────────────────────────
function DeviceBlockedScreen({ onBack }) {
  return (
    <div className="auth-page">
      <div style={{ width: '100%', maxWidth: 400, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 32, textAlign: 'center' }}>
        <div style={{ width: 70, height: 70, borderRadius: '50%', margin: '0 auto 20px', background: 'rgba(239,68,68,0.08)', border: '2px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldX size={30} color="var(--red)" />
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Wrong Device</div>
        <div style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>This account is already linked to another device.</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: 'var(--accent-glow)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'var(--accent2)' }}>1</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Use your registered device</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>Log in from the phone or device you originally used to create this account.</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--text3)', letterSpacing: 1, textTransform: 'uppercase' }}>— or —</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'var(--green)' }}>2</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Ask your teacher to reset</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>Your teacher can reset your device binding from the class portal — then log in from your new device.</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 20, background: 'rgba(108,99,255,0.07)', border: '1px solid rgba(108,99,255,0.15)', fontSize: 12, color: 'var(--text3)', lineHeight: 1.5, textAlign: 'left' }}>
          🔒 <strong style={{ color: 'var(--text2)' }}>Why is this happening?</strong><br />
          AttendX links each student account to one device to prevent proxy attendance.
        </div>
        <button className="btn btn-secondary btn-full" onClick={onBack}>← Try a different account</button>
      </div>
    </div>
  );
}

// ── Main Login/Register page ─────────────────────────────────────────────────
export default function LoginPage() {
  const [tab, setTab] = useState('login');
  const [role, setRole] = useState('student');
  const [form, setForm] = useState({ name: '', email: '', password: '', rollNumber: '', otp: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [error, setError] = useState('');
  const [deviceBlocked, setDeviceBlocked] = useState(false);
  const [deviceTaken, setDeviceTaken] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  // Send OTP to teacher email
  const handleSendOTP = async () => {
    if (!form.email || !form.name) { setError('Enter your name and email first'); return; }
    setSendingOtp(true);
    setError('');
    try {
      await API.post('/auth/send-otp', { email: form.email, name: form.name });
      setOtpSent(true);
      toast.success(`Code sent to ${form.email}!`);
      // 60 second cooldown
      setOtpCooldown(60);
      const interval = setInterval(() => {
        setOtpCooldown(c => {
          if (c <= 1) { clearInterval(interval); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send email');
    }
    setSendingOtp(false);
  };

  const handleSubmit = async () => {
    setError('');
    setDeviceBlocked(false);
    if (!form.email || !form.password) { setError('Email and password are required'); return; }
    if (tab === 'register') {
      if (!form.name) { setError('Name is required'); return; }
      if (role === 'teacher' && !otpSent) { setError('Please verify your email first'); return; }
      if (role === 'teacher' && !form.otp) { setError('Enter the verification code sent to your email'); return; }
    }
    setLoading(true);
    try {
      let user;
      if (tab === 'login') {
        user = await login(form.email, form.password);
      } else {
        user = await register({ ...form, role });
      }
      toast.success(`Welcome, ${user.name}!`);
      navigate(user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
    } catch (err) {
      if (err.response?.data?.deviceBlocked) {
        setDeviceBlocked(true);
      } else if (err.response?.data?.deviceTaken) {
        setDeviceTaken(true);
      } else {
        setError(err.response?.data?.message || 'Something went wrong');
      }
    }
    setLoading(false);
  };

  if (deviceTaken) return (
    <div className="auth-page">
      <div style={{ width: '100%', maxWidth: 400, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 32, textAlign: 'center' }}>
        <div style={{ width: 70, height: 70, borderRadius: '50%', margin: '0 auto 20px', background: 'rgba(245,158,11,0.08)', border: '2px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Smartphone size={30} color="var(--yellow)" />
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
          Device Already Registered
        </div>
        <div style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
          A student account already exists on this device. Only <strong>one student account</strong> is allowed per device.
        </div>
        <div style={{ padding: '12px 14px', borderRadius: 10, marginBottom: 24, background: 'rgba(108,99,255,0.07)', border: '1px solid rgba(108,99,255,0.15)', fontSize: 12, color: 'var(--text3)', lineHeight: 1.6, textAlign: 'left' }}>
          🔒 <strong style={{ color: 'var(--text2)' }}>Why is this happening?</strong><br />
          AttendX allows only one student account per device to prevent proxy attendance. Please log in with your existing account instead.
        </div>
        <button className="btn btn-primary btn-full" style={{ marginBottom: 10 }} onClick={() => { setDeviceTaken(false); setTab('login'); setError(''); setForm({ name: '', email: '', password: '', rollNumber: '', teacherCode: '' }); }}>
          Sign In Instead
        </button>
        <button className="btn btn-secondary btn-full" onClick={() => { setDeviceTaken(false); setError(''); }}>
          ← Go Back
        </button>
      </div>
    </div>
  );

  if (deviceBlocked) return (
    <DeviceBlockedScreen onBack={() => { setDeviceBlocked(false); setDeviceTaken(false); setError(''); setForm({ name: '', email: '', password: '', rollNumber: '', teacherCode: '' }); }} />
  );

  return (
    <div className="auth-page">
      <div className="auth-logo">Attend<span>X</span></div>
      <p className="auth-tagline">Smart attendance. Zero proxy. Secure by design.</p>

      <div className="auth-card">
        {/* Tab switcher */}
        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError(''); setOtpSent(false); }}>Sign In</button>
          <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setError(''); setOtpSent(false); }}>Register</button>
        </div>

        {/* Role selector — register only */}
        {tab === 'register' && (
          <div className="form-group">
            <span className="form-label">I am a</span>
            <div className="role-tabs">
              <button className={`role-tab ${role === 'student' ? 'active' : ''}`} onClick={() => { setRole('student'); setOtpSent(false); setError(''); }}>
                <GraduationCap size={20} /> Student
              </button>
              <button className={`role-tab ${role === 'teacher' ? 'active' : ''}`} onClick={() => { setRole('teacher'); setOtpSent(false); setError(''); }}>
                <BookOpen size={20} /> Teacher
              </button>
            </div>
          </div>
        )}

        {/* Name — register only */}
        {tab === 'register' && (
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" placeholder="Enter your name" value={form.name} onChange={set('name')} />
          </div>
        )}

        {/* Roll number — student register only */}
        {tab === 'register' && role === 'student' && (
          <>
            <div className="form-group">
              <label className="form-label">Roll Number</label>
              <input className="form-input" placeholder="e.g. 21CS001" value={form.rollNumber} onChange={set('rollNumber')} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 10, fontSize: 12, color: 'var(--text2)' }}>
              <Smartphone size={14} style={{ color: 'var(--accent2)', marginTop: 1, flexShrink: 0 }} />
              <span>Your account will be <strong style={{ color: 'var(--accent2)' }}>linked to this device</strong>. You must use this device to log in and mark attendance.</span>
            </div>
          </>
        )}

        {/* Email */}
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" placeholder="you@example.com" value={form.email}
            onChange={e => { set('email')(e); setOtpSent(false); }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>

        {/* Password */}
        <div className="form-group">
          <label className="form-label">Password</label>
          <div style={{ position: 'relative' }}>
            <input className="form-input" type={showPass ? 'text' : 'password'} placeholder="Min 6 characters"
              value={form.password} onChange={set('password')} style={{ paddingRight: 44 }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            <button onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', display: 'flex', cursor: 'pointer' }}>
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* ── Teacher email verification section ── */}
        {tab === 'register' && role === 'teacher' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ height: 1, background: 'var(--border)' }} />

            {/* Info notice */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 10, fontSize: 12, color: 'var(--text2)' }}>
              <Mail size={14} style={{ color: 'var(--accent2)', marginTop: 1, flexShrink: 0 }} />
              <span>Teacher accounts require <strong style={{ color: 'var(--accent2)' }}>email verification</strong> to prevent unauthorised access.</span>
            </div>

            {/* Send OTP button */}
            {!otpSent ? (
              <button className="btn btn-secondary btn-full" onClick={handleSendOTP} disabled={sendingOtp || !form.email || !form.name}>
                {sendingOtp
                  ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Sending...</>
                  : <><Mail size={14} /> Send Verification Code to Email</>}
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Success notice */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, fontSize: 12, color: 'var(--green)' }}>
                  ✓ Code sent to <strong>{form.email}</strong> — check your inbox
                </div>

                {/* OTP input */}
                <div className="form-group">
                  <label className="form-label">6-Digit Verification Code</label>
                  <input className="form-input" type="number" placeholder="000000" value={form.otp} onChange={set('otp')} maxLength={6}
                    style={{ fontSize: 24, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: 8, textAlign: 'center' }}
                    autoFocus />
                </div>

                {/* Resend */}
                <button onClick={handleSendOTP} disabled={otpCooldown > 0 || sendingOtp}
                  style={{ background: 'none', border: 'none', color: otpCooldown > 0 ? 'var(--text3)' : 'var(--accent2)', fontSize: 12, cursor: otpCooldown > 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                  <RefreshCw size={12} />
                  {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend code'}
                </button>
              </div>
            )}
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {/* Submit — disabled for teacher register until OTP sent */}
        <button className="btn btn-primary btn-full btn-lg" onClick={handleSubmit} disabled={loading || (tab === 'register' && role === 'teacher' && !otpSent)}>
          {loading
            ? <span className="spinner" style={{ borderTopColor: '#fff' }} />
            : tab === 'login' ? 'Sign In' : role === 'teacher' && !otpSent ? 'Verify Email First' : 'Create Account'}
        </button>
      </div>
    </div>
  );
}
