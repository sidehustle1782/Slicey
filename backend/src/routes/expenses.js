const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../services/firebase');
const { calculateSplits, calculateBalances } = require('../utils/splitCalculator');

// Create expense
router.post('/', async (req, res) => {
  const db = getDb();
  const { groupId, description, amount, currency = 'USD', category = 'general', paidBy, splitType, splitData, date } = req.body;

  if (!groupId) return res.status(400).json({ error: 'groupId is required' });
  if (!description) return res.status(400).json({ error: 'Description is required' });
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount is required' });
  if (!paidBy) return res.status(400).json({ error: 'paidBy is required' });
  if (!splitType) return res.status(400).json({ error: 'splitType is required (equal, percentage, exact)' });

  try {
    const groupDoc = await db.collection('groups').doc(groupId).get();
    if (!groupDoc.exists) return res.status(404).json({ error: 'Group not found' });
    const group = groupDoc.data();

    if (!group.memberUids.includes(req.user.uid)) return res.status(403).json({ error: 'Not a member of this group' });

    // Validate paidBy is a member
    const payer = group.members.find(m => m.uid === paidBy);
    if (!payer) return res.status(400).json({ error: 'paidBy user is not a member of this group' });

    // Determine which members are included in the split
    let splitMembers = group.members;
    if (splitData && splitData.length > 0) {
      // Only include members specified in splitData
      const splitUids = splitData.map(s => s.uid);
      splitMembers = group.members.filter(m => splitUids.includes(m.uid));

      // Validate all split UIDs exist in group
      for (const s of splitData) {
        if (!group.memberUids.includes(s.uid)) {
          return res.status(400).json({ error: `User ${s.uid} is not a member of this group` });
        }
      }
    }

    const splits = calculateSplits(parseFloat(amount), splitType, splitMembers, splitData || [], paidBy);

    const expenseId = uuidv4();
    const expense = {
      id: expenseId,
      groupId,
      description,
      amount: parseFloat(amount),
      currency,
      category,
      paidBy,
      paidByName: payer.name,
      paidByEmail: payer.email,
      splitType,
      splits,
      settled: false,
      date: date || new Date().toISOString(),
      createdBy: req.user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.collection('expenses').doc(expenseId).set(expense);
    await db.collection('groups').doc(groupId).update({
      totalExpenses: (group.totalExpenses || 0) + parseFloat(amount),
      updatedAt: new Date().toISOString()
    });

    res.status(201).json({ expense });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get expenses for a group
router.get('/group/:groupId', async (req, res) => {
  const db = getDb();
  try {
    const groupDoc = await db.collection('groups').doc(req.params.groupId).get();
    if (!groupDoc.exists) return res.status(404).json({ error: 'Group not found' });
    const group = groupDoc.data();
    if (!group.memberUids.includes(req.user.uid)) return res.status(403).json({ error: 'Not a member of this group' });

    const expSnap = await db.collection('expenses')
      .where('groupId', '==', req.params.groupId)
      .get();

    const expenses = expSnap.docs.map(d => d.data()).sort((a, b) => b.date.localeCompare(a.date));
    const balances = calculateBalances(expenses, req.user.uid);

    res.json({ expenses, balances });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single expense
router.get('/:expenseId', async (req, res) => {
  const db = getDb();
  try {
    const doc = await db.collection('expenses').doc(req.params.expenseId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Expense not found' });
    const expense = doc.data();

    const groupDoc = await db.collection('groups').doc(expense.groupId).get();
    if (!groupDoc.data().memberUids.includes(req.user.uid)) return res.status(403).json({ error: 'Not authorized' });

    res.json({ expense });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update expense (modify split, description, amount)
router.patch('/:expenseId', async (req, res) => {
  const db = getDb();
  const { description, amount, category, splitType, splitData, paidBy } = req.body;

  try {
    const expRef = db.collection('expenses').doc(req.params.expenseId);
    const expDoc = await expRef.get();
    if (!expDoc.exists) return res.status(404).json({ error: 'Expense not found' });
    const expense = expDoc.data();

    const groupDoc = await db.collection('groups').doc(expense.groupId).get();
    const group = groupDoc.data();
    if (!group.memberUids.includes(req.user.uid)) return res.status(403).json({ error: 'Not authorized' });

    // Only creator or group admin can edit
    if (expense.createdBy !== req.user.uid && group.createdBy !== req.user.uid) {
      return res.status(403).json({ error: 'Only the expense creator or group admin can edit this expense' });
    }

    const updates = { updatedAt: new Date().toISOString() };
    if (description) updates.description = description;
    if (category) updates.category = category;

    // Recalculate splits if relevant fields changed
    const newAmount = amount ? parseFloat(amount) : expense.amount;
    const newSplitType = splitType || expense.splitType;
    const newPaidBy = paidBy || expense.paidBy;

    if (amount || splitType || splitData || paidBy) {
      let splitMembers = group.members;
      let effectiveSplitData = splitData || [];

      if (splitData && splitData.length > 0) {
        const splitUids = splitData.map(s => s.uid);
        splitMembers = group.members.filter(m => splitUids.includes(m.uid));
        for (const s of splitData) {
          if (!group.memberUids.includes(s.uid)) {
            return res.status(400).json({ error: `User ${s.uid} is not a member of this group` });
          }
        }
      }

      const newSplits = calculateSplits(newAmount, newSplitType, splitMembers, effectiveSplitData, newPaidBy);

      // Preserve any already-settled splits
      for (const newSplit of newSplits) {
        const oldSplit = expense.splits.find(s => s.uid === newSplit.uid);
        if (oldSplit && oldSplit.settled) {
          newSplit.settled = true;
          newSplit.settledAt = oldSplit.settledAt;
        }
      }

      updates.splits = newSplits;
      updates.splitType = newSplitType;
      updates.amount = newAmount;
      updates.paidBy = newPaidBy;

      if (paidBy) {
        const payer = group.members.find(m => m.uid === paidBy);
        if (payer) {
          updates.paidByName = payer.name;
          updates.paidByEmail = payer.email;
        }
      }

      // Recalculate group total
      const totalDiff = newAmount - expense.amount;
      if (totalDiff !== 0) {
        await groupDoc.ref.update({ totalExpenses: (group.totalExpenses || 0) + totalDiff });
      }
    }

    // Check if all splits are settled
    const finalSplits = updates.splits || expense.splits;
    updates.settled = finalSplits.every(s => s.settled);

    await expRef.update(updates);
    const updated = await expRef.get();
    res.json({ expense: updated.data() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete expense
router.delete('/:expenseId', async (req, res) => {
  const db = getDb();
  try {
    const expRef = db.collection('expenses').doc(req.params.expenseId);
    const expDoc = await expRef.get();
    if (!expDoc.exists) return res.status(404).json({ error: 'Expense not found' });
    const expense = expDoc.data();

    const groupDoc = await db.collection('groups').doc(expense.groupId).get();
    const group = groupDoc.data();
    if (!group.memberUids.includes(req.user.uid)) return res.status(403).json({ error: 'Not authorized' });
    if (expense.createdBy !== req.user.uid && group.createdBy !== req.user.uid) {
      return res.status(403).json({ error: 'Only the expense creator or group admin can delete this expense' });
    }

    await expRef.delete();
    await groupDoc.ref.update({
      totalExpenses: Math.max(0, (group.totalExpenses || 0) - expense.amount),
      updatedAt: new Date().toISOString()
    });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark a user's split as settled
router.post('/:expenseId/settle', async (req, res) => {
  const db = getDb();
  const { uid, paymentMethod, paymentNote } = req.body;
  const settleUid = uid || req.user.uid;

  try {
    const expRef = db.collection('expenses').doc(req.params.expenseId);
    const expDoc = await expRef.get();
    if (!expDoc.exists) return res.status(404).json({ error: 'Expense not found' });
    const expense = expDoc.data();

    // Only the person settling, the payer, or group admin can mark as settled
    const groupDoc = await db.collection('groups').doc(expense.groupId).get();
    const group = groupDoc.data();
    if (settleUid !== req.user.uid && expense.paidBy !== req.user.uid && group.createdBy !== req.user.uid) {
      return res.status(403).json({ error: 'Not authorized to settle this expense' });
    }

    const updatedSplits = expense.splits.map(s => {
      if (s.uid === settleUid) {
        return { ...s, settled: true, settledAt: new Date().toISOString(), paymentMethod: paymentMethod || 'external', paymentNote: paymentNote || '' };
      }
      return s;
    });

    const allSettled = updatedSplits.every(s => s.settled);

    await expRef.update({
      splits: updatedSplits,
      settled: allSettled,
      updatedAt: new Date().toISOString()
    });

    res.json({ message: allSettled ? 'Expense fully settled!' : 'Your portion marked as settled', allSettled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unsettle (mark as unsettled again)
router.post('/:expenseId/unsettle', async (req, res) => {
  const db = getDb();
  const { uid } = req.body;
  const unsettleUid = uid || req.user.uid;

  try {
    const expRef = db.collection('expenses').doc(req.params.expenseId);
    const expDoc = await expRef.get();
    if (!expDoc.exists) return res.status(404).json({ error: 'Expense not found' });
    const expense = expDoc.data();

    const groupDoc = await db.collection('groups').doc(expense.groupId).get();
    const group = groupDoc.data();
    if (unsettleUid !== req.user.uid && expense.paidBy !== req.user.uid && group.createdBy !== req.user.uid) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updatedSplits = expense.splits.map(s => {
      if (s.uid === unsettleUid) {
        return { ...s, settled: false, settledAt: null, paymentMethod: null, paymentNote: null };
      }
      return s;
    });

    await expRef.update({ splits: updatedSplits, settled: false, updatedAt: new Date().toISOString() });
    res.json({ message: 'Marked as unsettled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get summary - what current user owes and is owed across all groups
router.get('/summary/me', async (req, res) => {
  const db = getDb();
  try {
    const expSnap = await db.collection('expenses')
      .where('settled', '==', false)
      .get();

    let totalOwed = 0;    // Others owe me
    let totalOwing = 0;   // I owe others
    const byGroup = {};

    for (const doc of expSnap.docs) {
      const exp = doc.data();
      const groupId = exp.groupId;

      // Check if current user is involved
      const mySplit = exp.splits.find(s => s.uid === req.user.uid);
      if (!mySplit && exp.paidBy !== req.user.uid) continue;

      if (!byGroup[groupId]) byGroup[groupId] = { owed: 0, owing: 0 };

      if (exp.paidBy === req.user.uid) {
        // I paid - everyone else unsettled owes me
        for (const split of exp.splits) {
          if (split.uid !== req.user.uid && !split.settled) {
            totalOwed += split.amount;
            byGroup[groupId].owed += split.amount;
          }
        }
      } else if (mySplit && !mySplit.settled) {
        // I owe the payer
        totalOwing += mySplit.amount;
        byGroup[groupId].owing += mySplit.amount;
      }
    }

    res.json({
      totalOwed: Math.round(totalOwed * 100) / 100,
      totalOwing: Math.round(totalOwing * 100) / 100,
      net: Math.round((totalOwed - totalOwing) * 100) / 100,
      byGroup
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
