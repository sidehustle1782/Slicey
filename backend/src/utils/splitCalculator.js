/**
 * Calculate splits for an expense
 * @param {number} totalAmount
 * @param {string} splitType - 'equal' | 'percentage' | 'exact'
 * @param {Array} members - [{uid, email, name}]
 * @param {Array} splitData - For percentage: [{uid, percentage}], for exact: [{uid, amount}]
 * @param {string} paidByUid - UID of member who paid
 * @returns {Array} splits - [{uid, email, name, amount, owes, settled}]
 */
function calculateSplits(totalAmount, splitType, members, splitData, paidByUid) {
  const memberMap = {};
  members.forEach(m => { memberMap[m.uid] = m; });

  let splits = [];

  if (splitType === 'equal') {
    const perPerson = Math.round((totalAmount / members.length) * 100) / 100;
    const remainder = Math.round((totalAmount - perPerson * members.length) * 100);

    splits = members.map((m, idx) => ({
      uid: m.uid,
      email: m.email,
      name: m.name,
      picture: m.picture || null,
      // Distribute rounding remainder to first person
      amount: idx === 0 ? Math.round((perPerson + remainder / 100) * 100) / 100 : perPerson,
      settled: m.uid === paidByUid,
      settledAt: m.uid === paidByUid ? new Date().toISOString() : null
    }));

  } else if (splitType === 'percentage') {
    const totalPercentage = splitData.reduce((sum, s) => sum + (s.percentage || 0), 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error(`Percentages must add up to 100% (currently ${totalPercentage}%)`);
    }

    let runningTotal = 0;
    splits = splitData.map((s, idx) => {
      const member = memberMap[s.uid];
      if (!member) throw new Error(`Member with uid ${s.uid} not found in group`);

      let amount;
      if (idx === splitData.length - 1) {
        // Last person gets the remainder to avoid rounding issues
        amount = Math.round((totalAmount - runningTotal) * 100) / 100;
      } else {
        amount = Math.round((totalAmount * s.percentage / 100) * 100) / 100;
        runningTotal += amount;
      }

      return {
        uid: s.uid,
        email: member.email,
        name: member.name,
        picture: member.picture || null,
        percentage: s.percentage,
        amount,
        settled: s.uid === paidByUid,
        settledAt: s.uid === paidByUid ? new Date().toISOString() : null
      };
    });

  } else if (splitType === 'exact') {
    const totalExact = splitData.reduce((sum, s) => sum + (s.amount || 0), 0);
    if (Math.abs(totalExact - totalAmount) > 0.01) {
      throw new Error(`Exact amounts must add up to total ($${totalAmount}). Current sum: $${totalExact.toFixed(2)}`);
    }

    splits = splitData.map(s => {
      const member = memberMap[s.uid];
      if (!member) throw new Error(`Member with uid ${s.uid} not found in group`);
      return {
        uid: s.uid,
        email: member.email,
        name: member.name,
        picture: member.picture || null,
        amount: Math.round(s.amount * 100) / 100,
        settled: s.uid === paidByUid,
        settledAt: s.uid === paidByUid ? new Date().toISOString() : null
      };
    });

  } else {
    throw new Error('Invalid split type. Must be: equal, percentage, or exact');
  }

  return splits;
}

/**
 * Calculate net balances for a group
 * Positive = owed money, Negative = owes money
 */
function calculateBalances(expenses, currentUid) {
  const balanceMap = {};

  for (const expense of expenses) {
    if (expense.settled) continue;

    const paidByUid = expense.paidBy;

    for (const split of expense.splits) {
      if (split.settled) continue;
      if (split.uid === paidByUid) continue; // Payer doesn't owe themselves

      // split.uid owes paidByUid the split amount
      if (!balanceMap[split.uid]) balanceMap[split.uid] = 0;
      if (!balanceMap[paidByUid]) balanceMap[paidByUid] = 0;

      balanceMap[split.uid] -= split.amount; // Owes money
      balanceMap[paidByUid] += split.amount; // Is owed money
    }
  }

  return balanceMap;
}

module.exports = { calculateSplits, calculateBalances };
