import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatRelative, formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';
import './Notifications.css';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get('/notifications')
      .then(res => setNotifications(res.data.notifications))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All marked as read');
    } catch (err) {
      toast.error('Failed to update notifications');
    }
  };

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="page notifications-page">
      <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>Notifications</h1>
          {unreadCount > 0 && <p className="text-muted text-sm">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all read</button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">◇</div>
          <h3>All quiet here</h3>
          <p>You'll get reminders here when expenses are overdue by more than 2 weeks.</p>
        </div>
      ) : (
        <div className="notif-list">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`notif-item card card-sm ${!n.read ? 'notif-item--unread' : ''}`}
              onClick={() => !n.read && markRead(n.id)}
            >
              <div className="notif-icon">
                {n.type === 'reminder' ? '⏰' : '◇'}
              </div>
              <div className="notif-content">
                <div className="notif-title">{n.title}</div>
                <div className="notif-msg text-sm text-muted">{n.message}</div>
                {n.data && n.data.length > 0 && (
                  <div className="notif-items">
                    {n.data.slice(0, 3).map((item, i) => (
                      <div key={i} className="notif-expense-item">
                        <span className="text-xs text-muted">{item.description}</span>
                        <span className="text-xs amount-owed">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    {n.data.length > 3 && (
                      <div className="text-xs text-dim">+ {n.data.length - 3} more expenses</div>
                    )}
                  </div>
                )}
                <div className="notif-time text-xs text-dim">{formatRelative(n.createdAt)}</div>
              </div>
              {!n.read && <div className="notif-dot" />}
            </div>
          ))}
        </div>
      )}

      {/* Reminder info */}
      <div className="notif-info-box">
        <div className="notif-info-icon">💡</div>
        <div className="text-sm text-muted">
          <strong style={{ color: 'var(--text2)' }}>Weekly reminders</strong> are sent every Monday for expenses unpaid for more than 2 weeks. Pay up and mark as settled to stop reminders.
        </div>
      </div>
    </div>
  );
}
