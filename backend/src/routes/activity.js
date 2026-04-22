const express = require('express');
const router = express.Router();
const { getDb } = require('../services/firebase');

// Get unified activity feed: group events for all groups the user belongs to
router.get('/', async (req, res) => {
  const db = getDb();
  try {
    // Get user's group IDs
    const groupsSnap = await db.collection('groups')
      .where('memberUids', 'array-contains', req.user.uid)
      .get();

    if (groupsSnap.empty) return res.json({ activities: [] });

    const groupIds = groupsSnap.docs.map(d => d.id);

    // Firestore 'in' supports up to 30 values
    const chunks = [];
    for (let i = 0; i < groupIds.length; i += 30) chunks.push(groupIds.slice(i, i + 30));

    const snaps = await Promise.all(
      chunks.map(chunk =>
        db.collection('groupActivities').where('groupId', 'in', chunk).get()
      )
    );

    const activities = snaps
      .flatMap(s => s.docs.map(d => d.data()))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 100);

    res.json({ activities });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
