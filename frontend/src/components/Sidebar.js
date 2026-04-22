import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/helpers';
import api from '../utils/api';
import './Sidebar.css';

const NAV = [
  { to: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { to: '/groups', icon: '◎', label: 'Groups' },
  { to: '/activity', icon: '◈', label: 'Activity' },
  { to: '/notifications', icon: '◇', label: 'Notifications', badge: true },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    api.get('/notifications').then(res => {
      setUnread(res.data.notifications.filter(n => !n.read).length);
    }).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const profile = user?.profile || user;
  const name = profile?.name || profile?.displayName || user?.email || 'User';
  const photo = profile?.picture || profile?.photoURL;

  return (
    <>
      {/* Mobile hamburger */}
      <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu">
        <span /><span /><span />
      </button>

      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <span className="logo-mark">✦</span>
          <span className="logo-text">Slicey</span>
        </div>

        {/* User */}
        <div className="sidebar-user">
          <div className="avatar avatar-lg">
            {photo ? <img src={photo} alt={name} referrerPolicy="no-referrer" /> : getInitials(name)}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name truncate">{name}</span>
            <span className="sidebar-user-email truncate">{profile?.email || user?.email}</span>
          </div>
        </div>

        <div className="divider" style={{ margin: '0 16px 12px' }} />

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && unread > 0 && (
                <span className="sidebar-badge">{unread > 9 ? '9+' : unread}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={handleLogout}>
            <span>↪</span> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
