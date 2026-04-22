import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { formatCurrency, formatRelative } from '../utils/helpers';
import './Groups.css';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/groups'), api.get('/expenses/summary/me')])
      .then(([g, s]) => { setGroups(g.data.groups); setSummary(s.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="flex items-center justify-between" style={{ marginBottom: 28 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>Groups</h1>
          <p className="text-muted text-sm">{groups.length} group{groups.length !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/groups/new" className="btn btn-primary">
          <span>+</span> New Group
        </Link>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">◎</div>
          <h3>No groups yet</h3>
          <p>Create a group and invite up to 29 people to split expenses together.</p>
          <Link to="/groups/new" className="btn btn-primary">Create your first group</Link>
        </div>
      ) : (
        <div className="groups-list">
          {groups.map(g => {
            const myBalance = (summary?.byGroup?.[g.id]?.owed || 0) - (summary?.byGroup?.[g.id]?.owing || 0);
            return (
              <Link key={g.id} to={`/groups/${g.id}`} className="group-row card card-interactive">
                <div className="group-row-icon">{g.name.charAt(0).toUpperCase()}</div>
                <div className="group-row-info">
                  <div className="group-row-name">{g.name}</div>
                  {g.description && <div className="group-row-desc text-sm text-muted truncate">{g.description}</div>}
                  <div className="group-row-meta">
                    <span>{g.members.length} members</span>
                    <span>·</span>
                    <span>Updated {formatRelative(g.updatedAt)}</span>
                  </div>
                </div>
                <div className="group-row-balance">
                  {myBalance === 0 ? (
                    <span className="badge badge-green">Settled</span>
                  ) : myBalance > 0 ? (
                    <div>
                      <div className="amount-lent" style={{ fontSize: 15, fontWeight: 700 }}>{formatCurrency(myBalance)}</div>
                      <div className="text-xs text-dim">you're owed</div>
                    </div>
                  ) : (
                    <div>
                      <div className="amount-owed" style={{ fontSize: 15, fontWeight: 700 }}>{formatCurrency(Math.abs(myBalance))}</div>
                      <div className="text-xs text-dim">you owe</div>
                    </div>
                  )}
                  <span className="group-row-arrow">›</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
