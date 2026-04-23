import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatCurrency, CATEGORIES, getInitials } from '../utils/helpers';
import './ExpenseModal.css';

const SPLIT_TYPES = [
  { id: 'equal', label: 'Split equally', icon: '⊜', desc: 'Each person pays the same' },
  { id: 'percentage', label: 'By percentage', icon: '%', desc: 'Set % for each person' },
  { id: 'exact', label: 'Exact amounts', icon: '$', desc: 'Set exact amount per person' },
];

export default function ExpenseModal({ group, myUid, expense, onClose, onSaved }) {
  const isEdit = !!expense;

  const [description, setDescription] = useState(expense?.description || '');
  const [amount, setAmount] = useState(expense?.amount?.toString() || '');
  const [category, setCategory] = useState(expense?.category || 'food');
  const [paidBy, setPaidBy] = useState(expense?.paidBy || myUid);
  const [splitType, setSplitType] = useState(expense?.splitType || 'equal');
  const [date, setDate] = useState(expense?.date?.split('T')[0] || new Date().toISOString().split('T')[0]);
  const [selectedMembers, setSelectedMembers] = useState(
    expense ? expense.splits.map(s => s.uid) : group.members.map(m => m.uid)
  );
  const [percentages, setPercentages] = useState({});
  const [exactAmounts, setExactAmounts] = useState({});
  const [saving, setSaving] = useState(false);

  const totalAmount = parseFloat(amount) || 0;

  // Init percentage/exact from existing expense
  useEffect(() => {
    if (expense) {
      const pcts = {}, exacts = {};
      expense.splits.forEach(s => {
        pcts[s.uid] = s.percentage || 0;
        exacts[s.uid] = s.amount || 0;
      });
      setPercentages(pcts);
      setExactAmounts(exacts);
    }
  }, [expense]);

  // Equal split auto-calc
  const eachAmount = selectedMembers.length > 0 ? totalAmount / selectedMembers.length : 0;

  const totalPercentage = selectedMembers.reduce((s, uid) => s + (parseFloat(percentages[uid]) || 0), 0);
  const totalExact = selectedMembers.reduce((s, uid) => s + (parseFloat(exactAmounts[uid]) || 0), 0);
  const exactRemaining = Math.round((totalAmount - totalExact) * 100) / 100;
  const pctRemaining = Math.round((100 - totalPercentage) * 10) / 10;

  const toggleMember = (uid) => {
    setSelectedMembers(prev =>
      prev.includes(uid) ? (prev.length > 1 ? prev.filter(u => u !== uid) : prev) : [...prev, uid]
    );
  };

  const buildSplitData = () => {
    if (splitType === 'equal') return null; // backend handles equal
    return selectedMembers.map(uid => ({
      uid,
      ...(splitType === 'percentage' ? { percentage: parseFloat(percentages[uid]) || 0 } : {}),
      ...(splitType === 'exact' ? { amount: parseFloat(exactAmounts[uid]) || 0 } : {}),
    }));
  };

  const validate = () => {
    if (!description.trim()) { toast.error('Description is required'); return false; }
    if (!totalAmount || totalAmount <= 0) { toast.error('Enter a valid amount'); return false; }
    if (selectedMembers.length === 0) { toast.error('Select at least one member'); return false; }
    if (splitType === 'percentage') {
      if (Math.abs(totalPercentage - 100) > 0.01) {
        toast.error(`Percentages must total 100% (currently ${totalPercentage.toFixed(1)}%)`);
        return false;
      }
    }
    if (splitType === 'exact') {
      if (Math.abs(totalExact - totalAmount) > 0.01) {
        toast.error(`Exact amounts must total ${formatCurrency(totalAmount)} (currently ${formatCurrency(totalExact)})`);
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        groupId: group.id,
        description: description.trim(),
        amount: totalAmount,
        category,
        paidBy,
        splitType,
        date: new Date(date).toISOString(),
        splitData: buildSplitData()
      };
      if (isEdit) {
        await api.patch(`/expenses/${expense.id}`, payload);
        toast.success('Expense updated');
      } else {
        await api.post('/expenses', payload);
        toast.success('Expense added');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal expense-modal">
        <div className="modal-header">
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>
            {isEdit ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Amount - prominent */}
          <div className="amount-input-area">
            <div className="amount-currency">$</div>
            <input
              className="amount-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              autoFocus={!isEdit}
            />
          </div>

          <div className="field" style={{ marginBottom: 16 }}>
            <label className="label">Description *</label>
            <textarea
              className="input"
              placeholder="e.g. Shuttle to airport, dinner at restaurant..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              style={{ resize: 'vertical', minHeight: 52 }}
            />
          </div>

          <div className="grid-2" style={{ marginBottom: 16 }}>
            <div className="field">
              <label className="label">Date</label>
              <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Paid by</label>
              <select className="input" value={paidBy} onChange={e => setPaidBy(e.target.value)}>
                {group.members.map(m => (
                  <option key={m.uid} value={m.uid}>{m.uid === myUid ? `${m.name} (you)` : m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field" style={{ marginBottom: 20 }}>
            <label className="label">Category</label>
            <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
            </select>
          </div>

          {/* Split type */}
          <div style={{ marginBottom: 16 }}>
            <label className="label" style={{ marginBottom: 8, display: 'block' }}>How to split</label>
            <div className="split-type-grid">
              {SPLIT_TYPES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className={`split-type-btn ${splitType === t.id ? 'split-type-btn--active' : ''}`}
                  onClick={() => setSplitType(t.id)}
                >
                  <span className="split-type-icon">{t.icon}</span>
                  <span className="split-type-label">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Members + split amounts */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <label className="label">Split between</label>
              {splitType === 'percentage' && (
                <span className={`text-xs ${Math.abs(pctRemaining) < 0.01 ? 'text-dim' : pctRemaining > 0 ? 'text-muted' : 'amount-owed'}`}>
                  {pctRemaining > 0 ? `${pctRemaining}% remaining` : pctRemaining < 0 ? `${Math.abs(pctRemaining)}% over` : '✓ 100%'}
                </span>
              )}
              {splitType === 'exact' && totalAmount > 0 && (
                <span className={`text-xs ${Math.abs(exactRemaining) < 0.01 ? 'text-dim' : exactRemaining > 0 ? 'text-muted' : 'amount-owed'}`}>
                  {exactRemaining > 0 ? `${formatCurrency(exactRemaining)} remaining` : exactRemaining < 0 ? `${formatCurrency(Math.abs(exactRemaining))} over` : '✓ Balanced'}
                </span>
              )}
            </div>

            <div className="members-split-list">
              {group.members.map(m => {
                const included = selectedMembers.includes(m.uid);
                return (
                  <div key={m.uid} className={`member-split-row ${!included ? 'member-split-row--excluded' : ''}`}>
                    <button type="button" className={`member-split-check ${included ? 'member-split-check--on' : ''}`} onClick={() => toggleMember(m.uid)}>
                      {included ? '✓' : ''}
                    </button>
                    <div className="avatar avatar-sm">
                      {m.picture ? <img src={m.picture} alt={m.name} referrerPolicy="no-referrer" /> : getInitials(m.name)}
                    </div>
                    <span className="member-split-name">{m.uid === myUid ? `${m.name} (you)` : m.name}</span>
                    <div className="member-split-amount">
                      {!included ? (
                        <span className="text-dim text-sm">excluded</span>
                      ) : splitType === 'equal' ? (
                        <span className="text-sm font-semibold">{totalAmount > 0 ? formatCurrency(eachAmount) : '—'}</span>
                      ) : splitType === 'percentage' ? (
                        <div className="input-prefix" style={{ width: 90 }}>
                          <input
                            className="input text-sm"
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            placeholder="0"
                            value={percentages[m.uid] || ''}
                            onChange={e => setPercentages(p => ({ ...p, [m.uid]: e.target.value }))}
                            style={{ paddingRight: 22, paddingLeft: 8 }}
                          />
                          <span className="prefix" style={{ right: 8, left: 'auto' }}>%</span>
                        </div>
                      ) : (
                        <div className="input-prefix" style={{ width: 100 }}>
                          <span className="prefix">$</span>
                          <input
                            className="input text-sm"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={exactAmounts[m.uid] || ''}
                            onChange={e => setExactAmounts(a => ({ ...a, [m.uid]: e.target.value }))}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : isEdit ? 'Save changes' : 'Add expense'}
          </button>
        </div>
      </div>
    </div>
  );
}
