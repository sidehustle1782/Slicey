import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../utils/api';
import './BottomNav.css';

export default function BottomNav() {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    api.get('/notifications').then(res => {
      setUnread(res.data.notifications.filter(n => !n.read).length);
    }).catch(() => {});
  }, []);

  const links = [
    { to: '/dashboard', icon: '⊞', label: 'Home' },
    { to: '/groups', icon: '◎', label: 'Groups' },
    { to: '/activity', icon: '◈', label: 'Activity' },
    { to: '/notifications', icon: '◇', label: 'Alerts', badge: unread },
  ];

  return (
    <nav className="bottom-nav">
      {links.map(l => (
        <NavLink key={l.to} to={l.to} className={({ isActive }) => `bottom-nav-link ${isActive ? 'bottom-nav-link--active' : ''}`}>
          <span className="bottom-nav-icon">{l.icon}</span>
          <span className="bottom-nav-label">{l.label}</span>
          {l.badge > 0 && <span className="bottom-nav-badge">{l.badge > 9 ? '9+' : l.badge}</span>}
        </NavLink>
      ))}
    </nav>
  );
}
