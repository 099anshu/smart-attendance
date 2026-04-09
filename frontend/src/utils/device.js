// ── Device ID ─────────────────────────────────────────────────────────────
// Stable per-browser ID stored in localStorage
export const getDeviceId = () => {
  let id = localStorage.getItem('device_id');
  if (id) return id;

  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
    navigator.platform || 'unknown',
  ].join('|');

  let hash = 0;
  for (let i = 0; i < components.length; i++) {
    const char = components.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const salt = Math.random().toString(36).substr(2, 8);
  id = Math.abs(hash).toString(36) + '_' + components.length + '_' + salt;
  localStorage.setItem('device_id', id);
  return id;
};

// ── Device Fingerprint ────────────────────────────────────────────────────
// Broader fingerprint based purely on hardware/browser signals.
// This catches multiple accounts on the same device even if localStorage is cleared.
export const getDeviceFingerprint = () => {
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.languages?.join(',') || '',
    screen.width + 'x' + screen.height + 'x' + screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || '',
    navigator.platform || '',
    navigator.vendor || '',
    // Canvas fingerprint (unique per device/browser combination)
    (() => {
      try {
        const c = document.createElement('canvas');
        const ctx = c.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('AttendX🔒', 2, 2);
        return c.toDataURL().slice(-32);
      } catch { return 'no-canvas'; }
    })(),
  ].join('|||');

  // Simple hash
  let hash = 5381;
  for (let i = 0; i < components.length; i++) {
    hash = ((hash << 5) + hash) + components.charCodeAt(i);
    hash = hash & hash;
  }
  return 'fp_' + Math.abs(hash).toString(36) + '_' + components.length;
};

// ── Device Model ──────────────────────────────────────────────────────────
export const getDeviceModel = () => {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) {
    const match = ua.match(/Android.*?;\s(.+?)\sBuild/);
    return match ? match[1] : 'Android Device';
  }
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  return 'Web Browser';
};

// ── BLE Scan Simulation ───────────────────────────────────────────────────
// RSSI threshold changed to -65 dBm ≈ 8 meters
export const simulateBLEScan = (beaconId) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (beaconId) {
        // Simulate RSSI between -35 (very close) and -80 (far)
        const rssi = -35 - Math.floor(Math.random() * 45);
        resolve({ found: true, rssi, beaconId });
      } else {
        resolve({ found: false, rssi: -95 });
      }
    }, 2000);
  });
};
