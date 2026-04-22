const express = require('express');
const router = express.Router();
const { getDb } = require('../services/firebase');
const { sendWeeklyReminders } = require('../services/notifications');

// Get notifications for current user
router.get('/', async (req, res) => {
  const db = getDb();
  try {
    const snap = await db.collection('notifications')
      .where('userId', '==', req.user.uid)
      .get();

    const notifications = snap.docs.map(d => d.data())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50);
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark notification as read
router.patch('/:notifId/read', async (req, res) => {
  const db = getDb();
  try {
    const ref = db.collection('notifications').doc(req.params.notifId);
    const doc = await ref.get();
    if (!doc.exists || doc.data().userId !== req.user.uid) return res.status(404).json({ error: 'Notification not found' });
    await ref.update({ read: true, readAt: new Date().toISOString() });
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark all notifications as read
router.post('/read-all', async (req, res) => {
  const db = getDb();
  try {
    const snap = await db.collection('notifications')
      .where('userId', '==', req.user.uid)
      .where('read', '==', false)
      .get();
    const batch = db.batch();
    snap.docs.forEach(doc => batch.update(doc.ref, { read: true, readAt: new Date().toISOString() }));
    await batch.commit();
    res.json({ message: 'All notifications marked as read', count: snap.size });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin trigger: manually run reminders
router.post('/trigger-reminders', async (req, res) => {
  try {
    const result = await sendWeeklyReminders();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
