import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { getInitials } from '../utils/helpers';

export default function AddMember() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  // Pending name prompt
  const [pendingEmail, setPendingEmail] = useState(null);
  const [pendingName, setPendingName] = useState('');

  useEffect(() => {
    api.get(`/groups/${groupId}`).then(r => setGroup(r.data.group)).catch(() => navigate(-1));
  }, [groupId, navigate]);

  const myUid = user?.uid || user?.profile?.uid;
  const isAdmin = group?.members?.some(m => m.uid === myUid && m.role === 'admin');

  const handleCheckEmail = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    if (group.members.find(m => m.email === trimmed)) {
      toast.error('This person is already in the group');
      return;
    }
    if (group.members.length >= 30) {
      toast.error('Group is at maximum capacity (30 members)');
      return;
    }
    setSearching(true);
    try {
      const res = await api.get(`/users/search?email=${encodeURIComponent(trimmed)}`);
      if (res.data.pending) {
        setPendingEmail(trimmed);
        setPendingName('');
        setEmail('');
      } else {
        await doAdd(trimmed, res.data.user.name);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to look up email');
    } finally {
      setSearching(false);
    }
  };

  const doAdd = async (emailToAdd, nameToAdd) => {
    setAdding(true);
    try {
      const res = await api.post(`/groups/${groupId}/members`, { email: emailToAdd, name: nameToAdd });
      if (res.data.member.pending) {
        toast.success(`${res.data.member.name} added — an invite has been sent to ${emailToAdd}.`);
      } else {
        toast.success(`${res.data.member.name} added to group!`);
      }
      setEmail('');
      setPendingEmail(null);
      setPendingName('');
      api.get(`/groups/${groupId}`).then(r => setGroup(r.data.group));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  const confirmPending = () => {
    const name = pendingName.trim() || pendingEmail.split('@')[0];
    doAdd(pendingEmail, name);
  };

  if (!group) return <div className="page"><div className="skeleton" style={{ height: 200, borderRadius: 16 }} /></div>;

  return (
    <div className="page" style={{ maxWidth: 540 }}>
      <div className="flex items-center gap-12" style={{ marginBottom: 28 }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate(`/groups/${groupId}`)}>←</button>
        <div>
          <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700 }}>Add Member</h1>
          <p className="text-muted text-sm">{group.name} · {group.members.length}/30 members</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="field" style={{ marginBottom: 12 }}>
          <label className="label">Email Address</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              className="input"
              type="email"
              placeholder="friend@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCheckEmail()}
              disabled={!!pendingEmail}
              autoFocus
            />
            <button className="btn btn-primary" onClick={handleCheckEmail} disabled={searching || adding || !email.trim() || !!pendingEmail}>
              {searching ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Add'}
            </button>
          </div>
        </div>

        {/* Pending name prompt */}
        {pendingEmail && (
          <div style={{ background: 'var(--surface-2, #1a1916)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
            <p className="text-xs text-dim" style={{ marginBottom: 8 }}>
              <strong style={{ color: 'var(--text)' }}>{pendingEmail}</strong> isn't on Slicey yet. Enter their name — an invite email will be sent to them.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                placeholder="Their name (optional)"
                value={pendingName}
                onChange={e => setPendingName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmPending()}
                autoFocus
              />
              <button className="btn btn-primary btn-sm" onClick={confirmPending} disabled={adding}>
                {adding ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Confirm'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setPendingEmail(null)}>Cancel</button>
            </div>
          </div>
        )}

        <p className="text-xs text-dim">Enter any email. If they aren't on Slicey yet, they'll receive an invite.</p>
      </div>

      <div className="card">
        <h3 className="form-section-title" style={{ fontSize: 14, marginBottom: 14 }}>Current Members ({group.members.length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {group.members.map(m => (
            <div key={m.uid} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="avatar">
                {m.picture ? <img src={m.picture} alt={m.name} referrerPolicy="no-referrer" /> : getInitials(m.name)}
              </div>
              <div style={{ flex: 1 }}>
                <div className="font-semibold text-sm">{m.name}</div>
                {/* Email visible only to admin or self */}
                {(isAdmin || m.uid === myUid) && m.email && (
                  <div className="text-xs text-dim">{m.email}</div>
                )}
              </div>
              {m.role === 'admin' && <span className="badge badge-amber">Admin</span>}
              {m.pending && <span className="badge">Pending</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
