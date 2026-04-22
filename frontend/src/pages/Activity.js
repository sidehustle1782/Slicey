import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { formatCurrency, formatRelative, getCategoryEmoji, isOverdue } from '../utils/helpers';
import './Activity.css';

const EVENT_ICON = {
  group_created: '✦',
  group_updated: '✎',
  member_added: '◎',
  member_removed: '◇',
};

export default function Activity() {
  const { user } = useAuth();
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | expenses | events | unsettled | overdue

  useEffect(() => {
    const load = async () => {
      try {
        const [groupsRes, activityRes] = await Promise.all([
          api.get('/groups'),
          api.get('/activity'),
        ]);

        const grps = groupsRes.data.groups;
        const groupMap = Object.fromEntries(grps.map(g => [g.id, g.name]));

        const expPromises = grps.map(g =>
          api.get(`/expenses/group/${g.id}`)
            .then(r => r.data.expenses.map(e => ({ ...e, _type: 'expense', groupName: g.name })))
            .catch(() => [])
        );
        const expenses = (await Promise.all(expPromises)).flat();

        const events = activityRes.data.activities.map(a => ({
          ...a,
          _type: 'event',
          groupName: groupMap[a.groupId] || a.groupName,
        }));

        const merged = [...expenses, ...events].sort((a, b) => {
          const dateA = a._type === 'expense' ? a.date : a.createdAt;
          const dateB = b._type === 'expense' ? b.date : b.createdAt;
          return new Date(dateB) - new Date(dateA);
        });

        setAllItems(merged);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const myUid = user?.uid;

  const filtered = allItems.filter(item => {
    if (filter === 'expenses') return item._type === 'expense';
    if (filter === 'events') return item._type === 'event';
    if (filter === 'unsettled') return item._type === 'expense' && !item.settled;
    if (filter === 'overdue') return item._type === 'expense' && isOverdue(item.createdAt) && !item.settled;
    return true;
  });

  const overdueCount = allItems.filter(i => i._type === 'expense' && isOverdue(i.createdAt) && !i.settled).length;

  return (
    <div className="page activity-page">
      <div style={{ marginBottom: 24 }}>
        <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>Activity</h1>
        <p className="text-muted text-sm">Expenses and group events across your groups</p>
      </div>

      <div className="activity-filters">
        {[
          { id: 'all', label: 'All' },
          { id: 'expenses', label: 'Expenses' },
          { id: 'events', label: 'Group Events' },
          { id: 'unsettled', label: 'Unsettled' },
          { id: 'overdue', label: `Overdue${overdueCount > 0 ? ` (${overdueCount})` : ''}` },
        ].map(f => (
          <button
            key={f.id}
            className={`activity-filter-btn ${filter === f.id ? 'activity-filter-btn--active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">{filter === 'overdue' ? '✅' : '◈'}</div>
          <h3>{filter === 'overdue' ? 'No overdue expenses!' : 'Nothing here yet'}</h3>
          <p>{filter === 'overdue' ? 'Great job keeping up with payments.' : 'Activity across all your groups will appear here.'}</p>
        </div>
      ) : (
        <div className="activity-list">
          {filtered.map(item => {
            if (item._type === 'event') {
              return (
                <Link
                  key={item.id || `${item.groupId}-${item.createdAt}`}
                  to={`/groups/${item.groupId}`}
                  className="activity-item card card-sm card-interactive"
                >
                  <div className="activity-emoji" style={{ fontSize: 18 }}>{EVENT_ICON[item.type] || '◈'}</div>
                  <div className="activity-info">
                    <div className="activity-desc">{item.detail}</div>
                    <div className="activity-meta">
                      <span className="activity-group">{item.groupName}</span>
                      <span>·</span>
                      <span>{formatRelative(item.createdAt)}</span>
                    </div>
                  </div>
                  <span className="badge" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>
                    {item.type === 'group_created' ? 'Created' :
                     item.type === 'group_updated' ? 'Updated' :
                     item.type === 'member_added' ? 'Member Added' : 'Member Removed'}
                  </span>
                </Link>
              );
            }

            const mySplit = item.splits?.find(s => s.uid === myUid);
            const iPaid = item.paidBy === myUid;
            const overdue = isOverdue(item.createdAt) && !item.settled;

            return (
              <Link
                key={item.id}
                to={`/groups/${item.groupId}`}
                className={`activity-item card card-sm card-interactive ${overdue ? 'activity-item--overdue' : ''}`}
              >
                <div className="activity-emoji">{getCategoryEmoji(item.category)}</div>
                <div className="activity-info">
                  <div className="activity-desc">
                    {item.description}
                    {overdue && <span className="badge badge-red" style={{ marginLeft: 8, fontSize: 10 }}>Overdue</span>}
                    {item.settled && <span className="badge badge-green" style={{ marginLeft: 8, fontSize: 10 }}>Settled</span>}
                  </div>
                  <div className="activity-meta">
                    <span className="activity-group">{item.groupName}</span>
                    <span>·</span>
                    <span>{iPaid ? 'You paid' : `${item.paidByName} paid`}</span>
                    <span>·</span>
                    <span>{formatRelative(item.date)}</span>
                  </div>
                </div>
                <div className="activity-amounts">
                  <div className="activity-total">{formatCurrency(item.amount)}</div>
                  {mySplit && !iPaid && (
                    <div className={mySplit.settled ? 'amount-settled text-xs' : 'amount-owed text-xs'}>
                      {mySplit.settled ? `your ${formatCurrency(mySplit.amount)} paid` : `you owe ${formatCurrency(mySplit.amount)}`}
                    </div>
                  )}
                  {iPaid && <div className="amount-lent text-xs">you paid</div>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
