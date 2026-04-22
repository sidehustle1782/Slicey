import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate, getCategoryEmoji, getInitials, isOverdue } from '../utils/helpers';
import ExpenseModal from '../components/ExpenseModal';
import SettleModal from '../components/SettleModal';
import './GroupDetail.css';

export default function GroupDetail() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('expenses'); // expenses | balances | members
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [settleTarget, setSettleTarget] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const myUid = user?.uid;

  const load = useCallback(async () => {
    try {
      const [grpRes, expRes] = await Promise.all([
        api.get(`/groups/${groupId}`),
        api.get(`/expenses/group/${groupId}`)
      ]);
      setGroup(grpRes.data.group);
      setExpenses(expRes.data.expenses);
      setBalances(expRes.data.balances);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) {
        toast.error('Group not found or you are not a member');
        navigate('/groups');
      }
    } finally { setLoading(false); }
  }, [groupId, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleDeleteExpense = async (expId) => {
    if (!window.confirm('Delete this expense? This cannot be undone.')) return;
    setDeleting(expId);
    try {
      await api.delete(`/expenses/${expId}`);
      toast.success('Expense deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    } finally { setDeleting(null); }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from this group?`)) return;
    try {
      await api.delete(`/groups/${groupId}/members/${memberId}`);
      toast.success(`${memberName} removed`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Cannot remove member');
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm(`Delete "${group.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/groups/${groupId}`);
      toast.success('Group deleted');
      navigate('/groups');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete group');
    }
  };

  if (loading) return (
    <div className="page">
      <div className="skeleton" style={{ height: 80, borderRadius: 16, marginBottom: 24 }} />
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12, marginBottom: 10 }} />)}
    </div>
  );
  if (!group) return null;

  const isAdmin = group.members.some(m => m.uid === myUid && m.role === 'admin');
  const myBalance = balances[myUid] || 0;
  const unsettledExpenses = expenses.filter(e => !e.settled);
  const settledExpenses = expenses.filter(e => e.settled);

  return (
    <div className="page group-detail-page">
      {/* Header */}
      <div className="group-detail-header">
        <button className="btn btn-ghost btn-icon" onClick={() => navigate('/groups')}>←</button>
        <div className="group-detail-title-area">
          <div className="group-detail-icon">{group.name.charAt(0).toUpperCase()}</div>
          <div>
            <h1 className="group-detail-name">{group.name}</h1>
            {group.description && <p className="text-sm text-muted">{group.description}</p>}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddExpense(true)}>
          <span>+</span> Add Expense
        </button>
        {isAdmin && (
          <Link to={`/groups/${groupId}/add-member`} className="btn btn-ghost btn-sm" title="Add member">
            + Member
          </Link>
        )}
        {isAdmin && (
          <Link to={`/groups/${groupId}/edit`} className="btn btn-ghost btn-icon" title="Edit group">✎</Link>
        )}
      </div>

      {/* My balance banner */}
      {myBalance !== 0 && (
        <div className={`balance-banner ${myBalance > 0 ? 'balance-banner--positive' : 'balance-banner--negative'}`}>
          <div>
            <strong>{formatCurrency(Math.abs(myBalance))}</strong>
            <span> — {myBalance > 0 ? "you're owed in this group" : "you owe in this group"}</span>
          </div>
          {myBalance < 0 && (
            <span className="text-sm" style={{ opacity: 0.8 }}>
              Mark expenses as settled after paying
            </span>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="group-tabs">
        {['expenses', 'balances', 'members'].map(t => (
          <button key={t} className={`group-tab ${tab === t ? 'group-tab--active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Expenses Tab */}
      {tab === 'expenses' && (
        <div>
          {expenses.length === 0 ? (
            <div className="empty-state">
              <div className="emoji">📦</div>
              <h3>No expenses yet</h3>
              <p>Add an expense to start tracking costs in this group.</p>
              <button className="btn btn-primary" onClick={() => setShowAddExpense(true)}>Add first expense</button>
            </div>
          ) : (
            <>
              {unsettledExpenses.length > 0 && (
                <div className="expense-section">
                  <div className="expense-section-label">Outstanding ({unsettledExpenses.length})</div>
                  {unsettledExpenses.map(exp => (
                    <ExpenseRow
                      key={exp.id}
                      expense={exp}
                      myUid={myUid}
                      isAdmin={isAdmin}
                      onEdit={() => setEditExpense(exp)}
                      onDelete={() => handleDeleteExpense(exp.id)}
                      onSettle={() => setSettleTarget(exp)}
                      deleting={deleting === exp.id}
                    />
                  ))}
                </div>
              )}
              {settledExpenses.length > 0 && (
                <div className="expense-section">
                  <div className="expense-section-label">Settled ({settledExpenses.length})</div>
                  {settledExpenses.map(exp => (
                    <ExpenseRow
                      key={exp.id}
                      expense={exp}
                      myUid={myUid}
                      isAdmin={isAdmin}
                      onEdit={() => setEditExpense(exp)}
                      onDelete={() => handleDeleteExpense(exp.id)}
                      onSettle={() => setSettleTarget(exp)}
                      deleting={deleting === exp.id}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Balances Tab */}
      {tab === 'balances' && (
        <div className="balances-section">
          {group.members.map(m => {
            const bal = balances[m.uid] || 0;
            return (
              <div key={m.uid} className="balance-row card card-sm">
                <div className="flex items-center gap-12" style={{ flex: 1 }}>
                  <div className="avatar">
                    {m.picture ? <img src={m.picture} alt={m.name} referrerPolicy="no-referrer" /> : getInitials(m.name)}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{m.name} {m.uid === myUid && '(you)'}</div>
                    {(isAdmin || m.uid === myUid) && m.email && (
                      <div className="text-xs text-dim">{m.email}</div>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {bal === 0 ? (
                    <span className="badge badge-green">Settled up</span>
                  ) : bal > 0 ? (
                    <div>
                      <div className="amount-lent">{formatCurrency(bal)}</div>
                      <div className="text-xs text-dim">gets back</div>
                    </div>
                  ) : (
                    <div>
                      <div className="amount-owed">{formatCurrency(Math.abs(bal))}</div>
                      <div className="text-xs text-dim">owes</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {Object.values(balances).every(b => b === 0) && (
            <div className="empty-state" style={{ padding: '32px 24px' }}>
              <div className="emoji">✅</div>
              <h3>All settled up!</h3>
              <p>Everyone in this group is square.</p>
            </div>
          )}
        </div>
      )}

      {/* Members Tab */}
      {tab === 'members' && (
        <div>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <span className="text-sm text-muted">{group.members.length}/30 members</span>
            {isAdmin && (
              <Link to={`/groups/${groupId}/add-member`} className="btn btn-ghost btn-sm">
                <span>+</span> Add member
              </Link>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {group.members.map(m => (
              <div key={m.uid} className="member-row card card-sm">
                <div className="flex items-center gap-12" style={{ flex: 1 }}>
                  <div className="avatar">
                    {m.picture ? <img src={m.picture} alt={m.name} referrerPolicy="no-referrer" /> : getInitials(m.name)}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{m.name} {m.uid === myUid && <span className="text-dim">(you)</span>}</div>
                    {(isAdmin || m.uid === myUid) && m.email && (
                      <div className="text-xs text-dim">{m.email}</div>
                    )}
                    {m.pending && <span className="badge" style={{ fontSize: 10 }}>Pending</span>}
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  {m.role === 'admin' && <span className="badge badge-amber">Admin</span>}
                  {(isAdmin || m.uid === myUid) && m.uid !== group.createdBy && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--red)', fontSize: 12 }}
                      onClick={() => handleRemoveMember(m.uid, m.name)}
                    >
                      {m.uid === myUid ? 'Leave' : 'Remove'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {isAdmin && (
            <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--red)', width: '100%' }}
                onClick={handleDeleteGroup}
              >
                Delete Group
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddExpense && (
        <ExpenseModal
          group={group}
          myUid={myUid}
          onClose={() => setShowAddExpense(false)}
          onSaved={() => { setShowAddExpense(false); load(); }}
        />
      )}
      {editExpense && (
        <ExpenseModal
          group={group}
          myUid={myUid}
          expense={editExpense}
          onClose={() => setEditExpense(null)}
          onSaved={() => { setEditExpense(null); load(); }}
        />
      )}
      {settleTarget && (
        <SettleModal
          expense={settleTarget}
          myUid={myUid}
          isAdmin={isAdmin}
          onClose={() => setSettleTarget(null)}
          onSaved={() => { setSettleTarget(null); load(); }}
        />
      )}
    </div>
  );
}

function ExpenseRow({ expense, myUid, isAdmin, onEdit, onDelete, onSettle, deleting }) {
  const mySplit = expense.splits.find(s => s.uid === myUid);
  const iPaid = expense.paidBy === myUid;
  const isMySplitSettled = mySplit?.settled ?? true;
  const canSettle = !isMySplitSettled && !iPaid;
  const overdue = isOverdue(expense.createdAt) && !expense.settled;
  const canEdit = expense.createdBy === myUid || isAdmin;

  return (
    <div className={`expense-row card card-sm ${overdue ? 'expense-row--overdue' : ''} ${expense.settled ? 'expense-row--settled' : ''}`}>
      <div className="expense-row-emoji">{getCategoryEmoji(expense.category)}</div>
      <div className="expense-row-info">
        <div className="flex items-center gap-8" style={{ flexWrap: 'wrap' }}>
          <span className="expense-row-desc">{expense.description}</span>
          {overdue && <span className="badge badge-red" style={{ fontSize: 10 }}>Overdue</span>}
          {expense.settled && <span className="badge badge-green" style={{ fontSize: 10 }}>Settled</span>}
        </div>
        <div className="expense-row-meta">
          <span>Paid by {iPaid ? 'you' : expense.paidByName}</span>
          <span>·</span>
          <span>{formatDate(expense.date)}</span>
          <span>·</span>
          <span className="badge badge-gray" style={{ padding: '2px 8px', fontSize: 11 }}>{expense.splitType}</span>
        </div>
        <div className="expense-row-splits">
          {expense.splits.map(s => (
            <span key={s.uid} className={`split-chip ${s.settled ? 'split-chip--settled' : ''} ${s.uid === myUid ? 'split-chip--me' : ''}`}>
              {getInitials(s.name)} {formatCurrency(s.amount)}
              {s.settled && ' ✓'}
            </span>
          ))}
        </div>
      </div>
      <div className="expense-row-right">
        <div className="expense-row-amount">{formatCurrency(expense.amount)}</div>
        {mySplit && !iPaid && (
          <div className={`expense-row-mine ${isMySplitSettled ? 'text-dim' : 'amount-owed'}`} style={{ fontSize: 12 }}>
            {isMySplitSettled ? `your ${formatCurrency(mySplit.amount)} paid` : `you owe ${formatCurrency(mySplit.amount)}`}
          </div>
        )}
        {iPaid && !expense.settled && (
          <div className="amount-lent" style={{ fontSize: 12 }}>you paid</div>
        )}
        <div className="expense-row-actions">
          {canSettle && (
            <button className="btn btn-success btn-sm" onClick={onSettle}>Settle</button>
          )}
          {canEdit && (
            <>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={onEdit} title="Edit">✎</button>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={onDelete} disabled={deleting} style={{ color: 'var(--red)' }} title="Delete">
                {deleting ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '✕'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
