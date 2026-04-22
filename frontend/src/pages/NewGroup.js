import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { getInitials } from '../utils/helpers';
import './NewGroup.css';

export default function NewGroup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  // Pending name prompt state
  const [pendingEmail, setPendingEmail] = useState(null);
  const [pendingName, setPendingName] = useState('');

  const myEmail = user?.email || user?.profile?.email;
  const myName = user?.profile?.name || user?.displayName || myEmail;

  const addMember = async () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    if (email === myEmail) { toast.error("You're already in the group!"); return; }
    if (members.find(m => m.email === email)) { toast.error('Already added'); return; }
    if (members.length >= 29) { toast.error('Maximum 30 members (including you)'); return; }

    setSearching(true);
    try {
      const res = await api.get(`/users/search?email=${encodeURIComponent(email)}`);
      if (res.data.pending) {
        // Unknown user — ask for their name before adding
        setPendingEmail(email);
        setPendingName('');
        setEmailInput('');
      } else {
        setMembers(prev => [...prev, res.data.user]);
        setEmailInput('');
        toast.success(`${res.data.user.name} added!`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add member');
    } finally {
      setSearching(false);
    }
  };

  const confirmPending = () => {
    const name = pendingName.trim() || pendingEmail.split('@')[0];
    setMembers(prev => [...prev, { uid: `pending_${pendingEmail}`, email: pendingEmail, name, pending: true, picture: null }]);
    toast.success(`${name} added — they'll get an invite email when the group is created.`);
    setPendingEmail(null);
    setPendingName('');
  };

  const removeMember = (uid) => setMembers(prev => prev.filter(m => m.uid !== uid));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Group name is required'); return; }
    setSaving(true);
    try {
      const res = await api.post('/groups', {
        name: name.trim(),
        description: description.trim(),
        members: members.map(m => ({ email: m.email, name: m.name })),
      });
      toast.success('Group created!');
      navigate(`/groups/${res.data.group.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create group');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page new-group-page">
      <div className="flex items-center gap-12" style={{ marginBottom: 28 }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>←</button>
        <div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700 }}>New Group</h1>
          <p className="text-muted text-sm">Split expenses with up to 30 people</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="new-group-form">
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 className="form-section-title">Group Details</h2>

          <div className="field" style={{ marginBottom: 16 }}>
            <label className="label">Group Name *</label>
            <input
              className="input"
              placeholder="e.g. Bali Trip 2025, Apartment 4B"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={60}
              autoFocus
            />
          </div>

          <div className="field">
            <label className="label">Description</label>
            <input
              className="input"
              placeholder="Optional description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={200}
            />
          </div>
        </div>

        {/* Members */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 className="form-section-title">Members <span className="text-dim text-sm">({members.length + 1}/30)</span></h2>

          {/* Add member input */}
          <div className="add-member-row">
            <input
              className="input"
              type="email"
              placeholder="Enter email address"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addMember())}
              disabled={searching || !!pendingEmail}
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={addMember}
              disabled={searching || !emailInput.trim() || !!pendingEmail}
            >
              {searching ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Add'}
            </button>
          </div>

          {/* Pending name prompt */}
          {pendingEmail && (
            <div className="card" style={{ marginBottom: 12, padding: '12px 14px', background: 'var(--surface-2, #1a1916)', border: '1px solid var(--border)' }}>
              <p className="text-xs text-dim" style={{ marginBottom: 8 }}>
                <strong style={{ color: 'var(--text)' }}>{pendingEmail}</strong> isn't on Slicey yet. Enter their name so others know who they are — an invite will be sent when the group is created.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  placeholder="Their name (optional)"
                  value={pendingName}
                  onChange={e => setPendingName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), confirmPending())}
                  autoFocus
                />
                <button type="button" className="btn btn-primary btn-sm" onClick={confirmPending}>Confirm</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPendingEmail(null)}>Cancel</button>
              </div>
            </div>
          )}

          <p className="text-xs text-dim" style={{ marginBottom: 16 }}>
            Enter any email. Non-members will get an invite to join.
          </p>

          {/* Members list */}
          <div className="members-list">
            {/* Self */}
            <div className="member-item">
              <div className="avatar">
                {user?.photoURL ? <img src={user.photoURL} alt={myName} referrerPolicy="no-referrer" /> : getInitials(myName)}
              </div>
              <div style={{ flex: 1 }}>
                <div className="font-semibold text-sm">{myName}</div>
                <div className="text-xs text-dim">{myEmail}</div>
              </div>
              <span className="badge badge-amber">You · Admin</span>
            </div>

            {members.map(m => (
              <div key={m.uid} className="member-item">
                <div className="avatar">
                  {m.picture ? <img src={m.picture} alt={m.name} referrerPolicy="no-referrer" /> : getInitials(m.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="font-semibold text-sm">{m.name}</div>
                  {/* Email shown only for admin (you), hidden for regular members */}
                  <div className="text-xs text-dim">{m.email}</div>
                </div>
                {m.pending && <span className="badge" style={{ marginRight: 8 }}>Pending</span>}
                <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => removeMember(m.uid)} style={{ color: 'var(--red)' }}>✕</button>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-lg" disabled={saving} style={{ width: '100%' }}>
          {saving ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Creating...</> : `Create Group with ${members.length + 1} member${members.length !== 0 ? 's' : ''}`}
        </button>
      </form>
    </div>
  );
}
