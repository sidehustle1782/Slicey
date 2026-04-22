import React, { useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/helpers';
import './SettleModal.css';

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: '💵' },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
  { id: 'other', label: 'Other', icon: '🔖' },
];

export default function SettleModal({ expense, myUid, isAdmin, onClose, onSaved }) {
  // eslint-disable-next-line no-unused-vars
  const mySplit = expense.splits.find(s => s.uid === myUid);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  // Admin can settle on behalf of others
  const [settleFor, setSettleFor] = useState(myUid);

  const unsettledSplits = expense.splits.filter(s => !s.settled && s.uid !== expense.paidBy);
  const targetSplit = expense.splits.find(s => s.uid === settleFor);

  const handleSettle = async () => {
    setSaving(true);
    try {
      const res = await api.post(`/expenses/${expense.id}/settle`, {
        uid: settleFor,
        paymentMethod,
        paymentNote: note
      });
      toast.success(res.data.message);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to settle');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal settle-modal">
        <div className="modal-header">
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>Settle Up</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Expense summary */}
          <div className="settle-expense-summary">
            <div className="settle-expense-desc">{expense.description}</div>
            <div className="settle-expense-total">{formatCurrency(expense.amount)}</div>
          </div>

          {/* If admin, let them choose who to settle for */}
          {isAdmin && unsettledSplits.length > 1 && (
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="label">Settling for</label>
              <select className="input" value={settleFor} onChange={e => setSettleFor(e.target.value)}>
                {unsettledSplits.map(s => (
                  <option key={s.uid} value={s.uid}>
                    {s.name} {s.uid === myUid ? '(you)' : ''} — {formatCurrency(s.amount)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {targetSplit && (
            <div className="settle-amount-highlight">
              <span className="text-muted text-sm">Amount to settle</span>
              <span className="settle-amount">{formatCurrency(targetSplit.amount)}</span>
              <span className="text-dim text-xs">paid to {expense.paidByName}</span>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label className="label" style={{ marginBottom: 10, display: 'block' }}>Payment method</label>
            <div className="payment-methods">
              {PAYMENT_METHODS.map(pm => (
                <button
                  key={pm.id}
                  type="button"
                  className={`payment-method-btn ${paymentMethod === pm.id ? 'payment-method-btn--active' : ''}`}
                  onClick={() => setPaymentMethod(pm.id)}
                >
                  <span>{pm.icon}</span>
                  <span>{pm.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="field" style={{ marginBottom: 4 }}>
            <label className="label">Note (optional)</label>
            <input
              className="input"
              placeholder="e.g. Sent via PayPal ref #12345"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          <p className="text-xs text-dim" style={{ marginTop: 8 }}>
            ⚠️ Make sure you've actually sent the payment before marking as settled.
            The payer will be notified.
          </p>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-success btn-lg" onClick={handleSettle} disabled={saving}>
            {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : `Mark ${formatCurrency(targetSplit?.amount || 0)} as settled`}
          </button>
        </div>
      </div>
    </div>
  );
}
