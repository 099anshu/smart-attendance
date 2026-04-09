import { useState, useEffect, useRef } from 'react';
import API from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { getDeviceId, simulateBLEScan } from '../../utils/device';
import { Bluetooth, CheckCircle, XCircle, AlertCircle, Radio } from 'lucide-react';

const STEPS = { SELECT: 0, BLE: 1, CODE: 2, RESULT: 3 };

// Animated proximity radar — inspired by your screenshot
function ProximityRadar({ rssi, scanning, found }) {
  const bars = 5;
  const signalBars = rssi === null ? 0 : rssi >= -50 ? 5 : rssi >= -55 ? 4 : rssi >= -60 ? 3 : rssi >= -65 ? 2 : 1;
  const distance = rssi === null ? '—' : rssi >= -50 ? '~1m' : rssi >= -55 ? '~3m' : rssi >= -60 ? '~8m' : '> 8m';
  const quality = rssi === null ? '—' : rssi >= -50 ? 'excellent' : rssi >= -55 ? 'good' : rssi >= -60 ? 'fair (8m)' : 'too far';
  const ringColor = found && rssi >= -60 ? '#6c63ff' : rssi !== null ? '#ef4444' : '#3a3a50';
  const dotColor = found && rssi >= -60 ? '#22c55e' : '#6c63ff';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      {/* Radar circles */}
      <div style={{ position: 'relative', width: 200, height: 200 }}>
        {/* Rings */}
        {[180, 140, 100, 60].map((size, i) => (
          <div key={i} style={{
            position: 'absolute', top: '50%', left: '50%',
            width: size, height: size,
            transform: 'translate(-50%,-50%)',
            borderRadius: '50%',
            border: `1.5px solid ${scanning ? 'rgba(108,99,255,0.25)' : i === 0 ? 'rgba(58,58,80,0.6)' : 'rgba(58,58,80,0.4)'}`,
            animation: scanning ? `ble-pulse 2s ease-out ${i * 0.4}s infinite` : 'none',
          }} />
        ))}

        {/* "You" dot — center */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 36, height: 36, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6c63ff, #8b83ff)',
          transform: 'translate(-50%,-50%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 16px rgba(108,99,255,0.5)',
          zIndex: 2, flexDirection: 'column', gap: 1
        }}>
          <Bluetooth size={14} color="#fff" />
        </div>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, 14px)', fontSize: 9, color: 'rgba(255,255,255,0.5)', zIndex: 3, whiteSpace: 'nowrap' }}>You</div>

        {/* Teacher dot — positioned based on RSSI */}
        {!scanning && rssi !== null && (
          <div style={{
            position: 'absolute',
            top: `${rssi >= -50 ? 38 : rssi >= -55 ? 32 : rssi >= -60 ? 24 : 18}%`,
            left: `${rssi >= -50 ? 58 : rssi >= -60 ? 60 : rssi >= -68 ? 62 : 64}%`,
            width: 16, height: 16, borderRadius: '50%',
            background: dotColor,
            boxShadow: `0 0 10px ${dotColor}`,
            zIndex: 2,
            transition: 'all 0.8s ease'
          }} />
        )}
      </div>

      {/* Signal bar indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px',
        background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)'
      }}>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Signal</span>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 18 }}>
          {Array.from({ length: bars }).map((_, i) => (
            <div key={i} style={{
              width: 4, borderRadius: 2,
              height: `${(i + 1) * (18 / bars)}px`,
              background: i < signalBars
                ? (signalBars >= 4 ? 'var(--green)' : signalBars === 3 ? 'var(--yellow)' : 'var(--red)')
                : 'var(--border2)',
              transition: 'background 0.3s'
            }} />
          ))}
        </div>
        {rssi !== null && (
          <span style={{ fontSize: 12, fontWeight: 600, color: rssi >= -60 ? 'var(--green)' : 'var(--red)' }}>
            {rssi} dBm — {quality}
          </span>
        )}
        {rssi === null && scanning && (
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>Scanning…</span>
        )}
      </div>

      {/* Teacher detected card */}
      {!scanning && rssi !== null && (
        <div style={{
          width: '100%', padding: '14px 16px', borderRadius: 12,
          background: rssi >= -60 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${rssi >= -60 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            {rssi >= -60
              ? <CheckCircle size={16} color="var(--green)" />
              : <XCircle size={16} color="var(--red)" />}
            <span style={{ fontWeight: 700, fontSize: 14, color: rssi >= -60 ? 'var(--green)' : 'var(--red)' }}>
              {rssi >= -60 ? 'Teacher Detected!' : 'Signal Too Weak'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
            {[
              { label: 'DEVICE', value: "Teacher's Device" },
              { label: 'DISTANCE', value: distance },
              { label: 'RSSI', value: `${rssi} dBm` },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MarkAttendance() {
  const toast = useToast();
  const [step, setStep] = useState(STEPS.SELECT);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [session, setSession] = useState(null);
  const [bleResult, setBleResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    API.get('/classes/my-classes').then(r => setClasses(r.data.classes)).catch(() => {});
  }, []);

  const checkSession = async () => {
    if (!selectedClass) { toast.error('Select a class first'); return; }
    setError('');
    try {
      const r = await API.get(`/attendance/active/${selectedClass}`);
      if (!r.data.session) {
        setError('No active session for this class. Ask your teacher to start one.');
        return;
      }
      setSession(r.data.session);
      setStep(STEPS.BLE);
      startBLEScan(r.data.session.beaconId);
    } catch { setError('Failed to check session. Try again.'); }
  };

  const startBLEScan = async (beaconId) => {
    setScanning(true);
    setBleResult(null);
    const result = await simulateBLEScan(beaconId);
    setScanning(false);
    setBleResult(result);
    if (result.found && result.rssi >= -60) {
      setTimeout(() => setStep(STEPS.CODE), 1200);
    }
  };

  const submitAttendance = async () => {
    if (code.length !== 6) { toast.error('Enter the full 6-digit code'); return; }
    setSubmitting(true);
    setError('');
    try {
      const deviceId = getDeviceId();
      await API.post('/attendance/submit', { sessionId: session.id, code, rssi: bleResult?.rssi || -50, deviceId });
      setResult({ success: true, message: 'Attendance marked successfully!' });
      setStep(STEPS.RESULT);
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.message || 'Attendance failed. Try again.' });
      setStep(STEPS.RESULT);
    }
    setSubmitting(false);
  };

  const reset = () => {
    setStep(STEPS.SELECT); setSession(null); setBleResult(null);
    setCode(''); setResult(null); setError('');
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Mark Attendance</div>
        <div className="page-subtitle">3-layer secure verification</div>
      </div>

      {/* Step progress */}
      <div style={{ padding: '10px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {['Class', 'BLE Scan', 'Code', 'Done'].map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, flexShrink: 0, transition: 'all 0.3s',
                  background: step > i ? 'var(--green)' : step === i ? 'var(--accent)' : 'var(--bg3)',
                  color: step >= i ? '#fff' : 'var(--text3)',
                  border: `1.5px solid ${step > i ? 'var(--green)' : step === i ? 'var(--accent)' : 'var(--border)'}`,
                }}>
                  {step > i ? <CheckCircle size={13} /> : i + 1}
                </div>
                <div style={{ fontSize: 9, color: step >= i ? 'var(--accent2)' : 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{label}</div>
              </div>
              {i < 3 && <div style={{ flex: 1, height: 1.5, background: step > i ? 'var(--green)' : 'var(--border)', marginBottom: 14, marginLeft: 3, marginRight: 3, transition: 'background 0.4s' }} />}
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        {/* Step 0: Select class */}
        {step === STEPS.SELECT && (
          <div className="card" style={{ padding: 24 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <Radio size={32} style={{ color: 'var(--accent2)', marginBottom: 8 }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>Select Your Class</div>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Class</label>
              <select className="form-input form-select" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setError(''); }}>
                <option value="">Choose a class...</option>
                {classes.map(c => <option key={c._id} value={c._id}>{c.subjectName} ({c.subjectCode})</option>)}
              </select>
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom: 14 }}><AlertCircle size={14} />{error}</div>}
            <button className="btn btn-primary btn-full btn-lg" onClick={checkSession} disabled={!selectedClass}>
              Check & Continue →
            </button>
          </div>
        )}

        {/* Step 1: BLE proximity radar */}
        {step === STEPS.BLE && (
          <div className="card" style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
              {scanning ? 'Scanning for Teacher...' : bleResult?.rssi >= -60 ? '✓ Close enough! Moving to code entry...' : 'Move closer to your teacher'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 24 }}>
              {scanning ? 'Make sure you are in the classroom' : bleResult?.rssi >= -60 ? 'BLE proximity verified' : 'Signal too weak — you may be too far away'}
            </div>
            <ProximityRadar rssi={bleResult?.rssi ?? null} scanning={scanning} found={bleResult?.found} />
            {!scanning && bleResult && bleResult.rssi < -60 && (
              <button className="btn btn-secondary btn-full" style={{ marginTop: 20 }} onClick={() => startBLEScan(session?.beaconId)}>
                🔄 Retry Scan
              </button>
            )}
          </div>
        )}

        {/* Step 2: Enter code */}
        {step === STEPS.CODE && (
          <div className="card" style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <span className="badge badge-green"><CheckCircle size={11} /> BLE Verified · {bleResult?.rssi} dBm</span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Enter Attendance Code</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
              Look at your teacher's screen for the 6-digit code
            </div>
            <div className="form-group" style={{ marginBottom: 16, textAlign: 'left' }}>
              <label className="form-label">Code</label>
              <input className="form-input" type="number" placeholder="000000" value={code}
                onChange={e => setCode(e.target.value.slice(0, 6))} maxLength={6}
                style={{ fontSize: 32, fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: 10, textAlign: 'center', padding: '16px' }}
                autoFocus />
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom: 14 }}><AlertCircle size={14} />{error}</div>}
            <button className="btn btn-primary btn-full btn-lg" onClick={submitAttendance} disabled={submitting || code.length !== 6}>
              {submitting ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Submit Attendance'}
            </button>
          </div>
        )}

        {/* Step 3: Result */}
        {step === STEPS.RESULT && result && (
          <div className="card" style={{ padding: 28, textAlign: 'center' }}>
            <div className={`status-icon ${result.success ? 'success' : 'error'}`} style={{ marginBottom: 16 }}>
              {result.success ? <CheckCircle style={{ color: 'var(--green)', width: 36, height: 36 }} /> : <XCircle style={{ color: 'var(--red)', width: 36, height: 36 }} />}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
              {result.success ? 'Attendance Marked!' : 'Failed'}
            </div>
            <div style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 24 }}>{result.message}</div>

            {result.success && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24, textAlign: 'left' }}>
                {[
                  ['BLE Proximity', `${bleResult?.rssi} dBm — verified`, 'green'],
                  ['Attendance Code', 'Correct ✓', 'green'],
                  ['Device Check', 'Passed ✓', 'green'],
                  ['Time Window', 'Within limit ✓', 'green'],
                ].map(([label, val, color]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', background: 'var(--bg3)', borderRadius: 8, fontSize: 13 }}>
                    <span style={{ color: 'var(--text2)' }}>{label}</span>
                    <span style={{ color: `var(--${color})`, fontWeight: 600 }}>{val}</span>
                  </div>
                ))}
              </div>
            )}
            <button className="btn btn-secondary btn-full" onClick={reset}>Mark Another Class</button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes ble-pulse {
          0% { opacity: 0.6; transform: translate(-50%,-50%) scale(0.6); }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(1); }
        }
      `}</style>
    </div>
  );
}
