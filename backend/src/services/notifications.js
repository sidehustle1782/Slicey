const { getDb } = require('./firebase');

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Send weekly reminders for overdue splits (>2 weeks old and unsettled)
 */
async function sendWeeklyReminders() {
  const db = getDb();
  const now = Date.now();
  const twoWeeksAgo = new Date(now - TWO_WEEKS_MS).toISOString();

  try {
    // Find expenses older than 2 weeks with unsettled splits
    const expSnap = await db.collection('expenses')
      .where('settled', '==', false)
      .where('createdAt', '<', twoWeeksAgo)
      .get();

    const notificationsByUser = {};

    for (const doc of expSnap.docs) {
      const expense = doc.data();
      for (const split of expense.splits) {
        if (!split.settled && split.uid !== expense.paidBy) {
          if (!notificationsByUser[split.uid]) {
            notificationsByUser[split.uid] = [];
          }
          notificationsByUser[split.uid].push({
            expenseId: expense.id,
            description: expense.description,
            amount: split.amount,
            currency: expense.currency,
            paidByName: expense.paidByName,
            groupId: expense.groupId,
            createdAt: expense.createdAt
          });
        }
      }
    }

    // Write notifications to Firestore (frontend can read these)
    const batch = db.batch();
    for (const [uid, reminders] of Object.entries(notificationsByUser)) {
      const notifRef = db.collection('notifications').doc();
      batch.set(notifRef, {
        id: notifRef.id,
        userId: uid,
        type: 'reminder',
        title: `You have ${reminders.length} unsettled expense${reminders.length > 1 ? 's' : ''}`,
        message: `You owe money on ${reminders.length} expense${reminders.length > 1 ? 's' : ''} that ${reminders.length === 1 ? 'is' : 'are'} overdue by more than 2 weeks.`,
        data: reminders,
        read: false,
        createdAt: new Date().toISOString()
      });
    }
    await batch.commit();

    console.log(`✅ Sent reminders to ${Object.keys(notificationsByUser).length} users`);
    return { notified: Object.keys(notificationsByUser).length };
  } catch (err) {
    console.error('Error sending reminders:', err);
    throw err;
  }
}

module.exports = { sendWeeklyReminders };
