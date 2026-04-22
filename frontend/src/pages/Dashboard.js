import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { formatCurrency, formatRelative, getInitials } from '../utils/helpers';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [groups, setGroups] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]); // eslint-disable-line no-unused-vars
  const [loading, setLoading] = useState(true);

  const name = user?.profile?.name || user?.displayName || 'there';
  const firstName = name.split(' ')[0];

  useEffect(() => {
    Promise.all([
      api.get('/expenses/summary/me'),
      api.get('/groups')
    ]).then(([sumRes, grpRes]) => {
      setSummary(sumRes.data);
      setGroups(grpRes.data.groups);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page">
      <div className="skeleton" style={{ height: 32, width: 200, marginBottom: 32 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />)}
      </div>
    </div>
  );

  const net = summary?.net || 0;

  return (
    <div className="page dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-greeting">Good {getTimeOfDay()}, {firstName} ✦</h1>
          <p className="text-muted text-sm">Here's your financial snapshot</p>
        </div>
        <Link to="/groups/new" className="btn btn-primary">
          <span>+</span> New Group
        </Link>
      </div>

      {/* Summary cards */}
      <div className="dashboard-summary">
        <div className={`summary-card ${net >= 0 ? 'summary-card--positive' : 'summary-card--negative'}`}>
          <div className="summary-card-label">Net Balance</div>
          <div className="summary-card-amount">{formatCurrency(Math.abs(net))}</div>
          <div className="summary-card-sub">{net >= 0 ? "you're owed overall" : "you owe overall"}</div>
        </div>

        <div className="summary-card summary-card--owed">
          <div className="summary-card-label">You're owed</div>
          <div className="summary-card-amount amount-lent">{formatCurrency(summary?.totalOwed || 0)}</div>
          <div className="summary-card-sub">from others</div>
        </div>

        <div className="summary-card summary-card--owing">
          <div className="summary-card-label">You owe</div>
          <div className="summary-card-amount amount-owed">{formatCurrency(summary?.totalOwing || 0)}</div>
          <div className="summary-card-sub">to others</div>
        </div>
      </div>

      {/* Groups */}
      <div className="dashboard-section">
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <h2 className="section-title">Your Groups</h2>
          <Link to="/groups" className="btn btn-ghost btn-sm">View all</Link>
        </div>

        {groups.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 24px' }}>
            <div className="emoji">◎</div>
            <h3>No groups yet</h3>
            <p>Create a group to start splitting expenses with friends</p>
            <Link to="/groups/new" className="btn btn-primary">Create your first group</Link>
          </div>
        ) : (
          <div className="dashboard-groups">
            {groups.slice(0, 4).map(g => {
              const myBalance = (summary?.byGroup?.[g.id]?.owed || 0) - (summary?.byGroup?.[g.id]?.owing || 0);
              return (
                <Link key={g.id} to={`/groups/${g.id}`} className="card card-interactive dashboard-group-card">
                  <div className="flex items-center gap-12" style={{ marginBottom: 12 }}>
                    <div className="group-icon">
                      {g.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-semibold truncate">{g.name}</div>
                      <div className="text-sm text-dim">{g.members.length} members · {formatRelative(g.updatedAt)}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted">
                      {g.members.slice(0, 3).map((m, i) => (
                        <span key={i} className="avatar avatar-sm" style={{ display: 'inline-flex', marginRight: -6, border: '2px solid var(--surface)' }}>
                          {m.picture ? <img src={m.picture} alt={m.name} referrerPolicy="no-referrer" /> : getInitials(m.name)}
                        </span>
                      ))}
                      {g.members.length > 3 && <span style={{ marginLeft: 10, fontSize: 11, color: 'var(--text3)' }}>+{g.members.length - 3}</span>}
                    </div>
                    <div className={myBalance >= 0 ? 'amount-lent' : 'amount-owed'} style={{ fontSize: 15, fontWeight: 700 }}>
                      {myBalance === 0 ? <span className="text-dim text-sm">settled up</span> : formatCurrency(Math.abs(myBalance))}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick tip */}
      {summary?.totalOwing > 0 && (
        <div className="dashboard-tip">
          <span>💡</span>
          <div>
            <strong>You have {formatCurrency(summary.totalOwing)} to pay.</strong>
            <span className="text-muted"> Head to a group to mark expenses as settled after paying.</span>
          </div>
        </div>
      )}
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
