import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, BookOpen, ClipboardList, BarChart3, LogOut, Users, Bluetooth } from 'lucide-react';

const teacherNav = [
  { to: '/teacher/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/teacher/classes', icon: BookOpen, label: 'Classes' },
  { to: '/teacher/reports', icon: BarChart3, label: 'Reports' },
];

const studentNav = [
  { to: '/student/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/student/classes', icon: BookOpen, label: 'Classes' },
  { to: '/student/attendance', icon: ClipboardList, label: 'Attend' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = user?.role === 'teacher' ? teacherNav : studentNav;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="app-shell">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">Attend<span>X</span></div>
        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-item" style={{ marginBottom: 8 }}>
            <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{user?.name?.[0]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{user?.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="sidebar-item btn-secondary" style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">{children}</main>

      {/* Bottom Nav (mobile) */}
      <nav className="bottom-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
            <Icon /><span>{label}</span>
          </NavLink>
        ))}
        <button onClick={handleLogout} className="bottom-nav-item" style={{ background: 'none', border: 'none', flex: 1 }}>
          <LogOut style={{ width: 22, height: 22 }} /><span>Logout</span>
        </button>
      </nav>
    </div>
  );
}
