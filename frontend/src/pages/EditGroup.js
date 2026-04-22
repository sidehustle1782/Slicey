import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function EditGroup() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get(`/groups/${groupId}`).then(r => {
      const g = r.data.group;
      if (g.createdBy !== user?.uid) {
        toast.error('Only the group admin can edit this group');
        navigate(`/groups/${groupId}`);
        return;
      }
      setGroup(g);
      setName(g.name);
      setDescription(g.description || '');
    }).catch(() => navigate('/groups'));
  }, [groupId, user, navigate]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Group name is required'); return; }
    setSaving(true);
    try {
      await api.patch(`/groups/${groupId}`, { name: name.trim(), description: description.trim() });
      toast.success('Group updated');
      navigate(`/groups/${groupId}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${group.name}"? This cannot be undone. All settled expenses will be removed.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/groups/${groupId}`);
      toast.success('Group deleted');
      navigate('/groups');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Cannot delete group');
    } finally { setDeleting(false); }
  };

  if (!group) return (
    <div className="page" style={{ maxWidth: 540 }}>
      <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
    </div>
  );

  return (
    <div className="page" style={{ maxWidth: 540 }}>
      <div className="flex items-center gap-12" style={{ marginBottom: 28 }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate(`/groups/${groupId}`)}>←</button>
        <div>
          <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700 }}>Edit Group</h1>
          <p className="text-muted text-sm">{group.members.length} members</p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="field" style={{ marginBottom: 16 }}>
            <label className="label">Group Name *</label>
            <input
              className="input"
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

        <div className="flex gap-12" style={{ marginBottom: 32 }}>
          <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => navigate(`/groups/${groupId}`)}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saving}>
            {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Danger zone */}
      <div className="card" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)', marginBottom: 8 }}>⚠️ Danger Zone</h3>
        <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
          Deleting a group is permanent. You can only delete if all expenses are settled.
        </p>
        <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
          {deleting ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Delete Group'}
        </button>
      </div>
    </div>
  );
}
