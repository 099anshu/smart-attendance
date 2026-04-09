import { createContext, useContext, useState, useEffect } from 'react';
import API from '../utils/api';
import { getDeviceId, getDeviceModel, getDeviceFingerprint } from '../utils/device';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          const res = await API.get('/auth/me');
          setUser(res.data.user);
        } catch {
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = async (email, password) => {
    const deviceId = getDeviceId();
    const deviceModel = getDeviceModel();
    const res = await API.post('/auth/login', { email, password, deviceId, deviceModel });
    localStorage.setItem('token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (data) => {
    const deviceId = getDeviceId();
    const deviceModel = getDeviceModel();
    const deviceFingerprint = getDeviceFingerprint(); // ← sends fingerprint on register
    const res = await API.post('/auth/register', { ...data, deviceId, deviceModel, deviceFingerprint });
    localStorage.setItem('token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
