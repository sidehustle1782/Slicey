const express = require('express');
const router = express.Router();
const { getDb, getAuth } = require('../services/firebase');

// Upsert user profile on login
router.post('/sync', async (req, res) => {
  const db = getDb();
  const { uid, email, name, picture } = req.user;

  try {
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    const userData = {
      uid,
      email,
      name: name || email.split('@')[0],
      picture: picture || null,
      updatedAt: new Date().toISOString()
    };

    if (!userDoc.exists) {
      userData.createdAt = new Date().toISOString();
      userData.notificationPreferences = { weeklyReminders: true, pushEnabled: false };
    }

    await userRef.set(userData, { merge: true });
    res.json({ user: { ...userDoc.data(), ...userData } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user profile
router.get('/me', async (req, res) => {
  const db = getDb();
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
    res.json({ user: userDoc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search users by email (for adding to group)
router.get('/search', async (req, res) => {
  const db = getDb();
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const userSnap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!userSnap.empty) {
      return res.json({ user: userSnap.docs[0].data() });
    }

    // User not in system yet — return a pending placeholder so the caller can proceed
    res.json({
      user: { uid: `pending_${email}`, email, name: email.split('@')[0], pending: true },
      pending: true
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
