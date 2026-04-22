const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../services/firebase');
const { sendInviteEmail } = require('../services/email');

function filterMemberForViewer(member, viewerUid, isViewerAdmin) {
  if (isViewerAdmin || member.uid === viewerUid) return member;
  const { email, ...rest } = member;
  return rest;
}

async function logActivity(db, { groupId, groupName, type, actorUid, actorName, detail }) {
  try {
    await db.collection('groupActivities').doc(uuidv4()).set({
      groupId, groupName, type, actorUid, actorName, detail,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error('logActivity failed:', e.message);
  }
}

// Create group
router.post('/', async (req, res) => {
  const db = getDb();
  const { name, description, members: memberList = [] } = req.body;
  // memberList: [{ email, name }]

  if (!name) return res.status(400).json({ error: 'Group name is required' });
  if (memberList.length > 29) return res.status(400).json({ error: 'Groups are limited to 30 members (including you)' });

  try {
    const now = new Date().toISOString();
    const members = [{ uid: req.user.uid, email: req.user.email, name: req.user.name, picture: req.user.picture || null, role: 'admin', joinedAt: now }];
    const pendingInvites = [];

    for (const { email, name: displayName } of memberList) {
      if (email === req.user.email) continue;
      const userSnap = await db.collection('users').where('email', '==', email).limit(1).get();
      if (userSnap.empty) {
        members.push({ uid: `pending_${email}`, email, name: displayName || email.split('@')[0], picture: null, role: 'member', pending: true, joinedAt: now });
        pendingInvites.push({ email, name: displayName || email.split('@')[0] });
      } else {
        const userData = userSnap.docs[0].data();
        members.push({ uid: userData.uid, email: userData.email, name: userData.name, picture: userData.picture || null, role: 'member', joinedAt: now });
      }
    }

    const groupId = uuidv4();
    const group = {
      id: groupId,
      name,
      description: description || '',
      createdBy: req.user.uid,
      members,
      memberUids: members.map(m => m.uid),
      totalExpenses: 0,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('groups').doc(groupId).set(group);
    logActivity(db, { groupId, groupName: name, type: 'group_created', actorUid: req.user.uid, actorName: req.user.name, detail: `${req.user.name} created the group` });

    // Send invite emails — fire and forget
    for (const invite of pendingInvites) {
      sendInviteEmail({
        toEmail: invite.email,
        toName: invite.name,
        inviterName: req.user.name,
        groupName: name,
        frontendUrl: process.env.FRONTEND_URL,
      }).catch(err => console.error('invite email failed:', err.message));
    }

    res.status(201).json({ group });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all groups for current user
router.get('/', async (req, res) => {
  const db = getDb();
  try {
    const snap = await db.collection('groups')
      .where('memberUids', 'array-contains', req.user.uid)
      .get();

    const groups = snap.docs.map(d => d.data()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    res.json({ groups });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single group
router.get('/:groupId', async (req, res) => {
  const db = getDb();
  try {
    const doc = await db.collection('groups').doc(req.params.groupId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Group not found' });
    const group = doc.data();
    if (!group.memberUids.includes(req.user.uid)) return res.status(403).json({ error: 'Not a member of this group' });

    const isAdmin = group.members.some(m => m.uid === req.user.uid && m.role === 'admin');
    const filteredMembers = group.members.map(m => filterMemberForViewer(m, req.user.uid, isAdmin));
    res.json({ group: { ...group, members: filteredMembers } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add member to group
router.post('/:groupId/members', async (req, res) => {
  const db = getDb();
  const { email, name: displayName } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const groupRef = db.collection('groups').doc(req.params.groupId);
    const groupDoc = await groupRef.get();
    if (!groupDoc.exists) return res.status(404).json({ error: 'Group not found' });
    const group = groupDoc.data();

    if (!group.memberUids.includes(req.user.uid)) return res.status(403).json({ error: 'Not a member of this group' });
    if (group.members.length >= 30) return res.status(400).json({ error: 'Group is at maximum capacity (30 members)' });

    const userSnap = await db.collection('users').where('email', '==', email).limit(1).get();
    let newMember;
    if (userSnap.empty) {
      const pendingUid = `pending_${email}`;
      if (group.memberUids.includes(pendingUid)) {
        return res.status(400).json({ error: 'User is already a member of this group' });
      }
      newMember = { uid: pendingUid, email, name: displayName || email.split('@')[0], picture: null, role: 'member', pending: true, joinedAt: new Date().toISOString() };
      sendInviteEmail({
        toEmail: email,
        toName: newMember.name,
        inviterName: req.user.name,
        groupName: group.name,
        frontendUrl: process.env.FRONTEND_URL,
      }).catch(err => console.error('invite email failed:', err.message));
    } else {
      const userData = userSnap.docs[0].data();
      if (group.memberUids.includes(userData.uid)) {
        return res.status(400).json({ error: 'User is already a member of this group' });
      }
      newMember = { uid: userData.uid, email: userData.email, name: userData.name, picture: userData.picture || null, role: 'member', joinedAt: new Date().toISOString() };
    }

    await groupRef.update({
      members: [...group.members, newMember],
      memberUids: [...group.memberUids, newMember.uid],
      updatedAt: new Date().toISOString()
    });

    logActivity(db, { groupId: req.params.groupId, groupName: group.name, type: 'member_added', actorUid: req.user.uid, actorName: req.user.name, detail: `${req.user.name} added ${newMember.name}` });
    res.json({ message: 'Member added', member: newMember });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove member from group
router.delete('/:groupId/members/:memberId', async (req, res) => {
  const db = getDb();
  try {
    const groupRef = db.collection('groups').doc(req.params.groupId);
    const groupDoc = await groupRef.get();
    if (!groupDoc.exists) return res.status(404).json({ error: 'Group not found' });
    const group = groupDoc.data();

    if (group.createdBy !== req.user.uid && req.params.memberId !== req.user.uid) {
      return res.status(403).json({ error: 'Only the group admin or the member themselves can remove a member' });
    }

    // Check if member has unsettled expenses
    const unsettledSnap = await db.collection('expenses')
      .where('groupId', '==', req.params.groupId)
      .where('settled', '==', false)
      .get();

    for (const expDoc of unsettledSnap.docs) {
      const exp = expDoc.data();
      const split = exp.splits.find(s => s.uid === req.params.memberId);
      if (split && !split.settled && split.amount > 0) {
        return res.status(400).json({ error: 'Cannot remove member with unsettled expenses. Settle their expenses first.' });
      }
    }

    const updatedMembers = group.members.filter(m => m.uid !== req.params.memberId);
    const updatedMemberUids = group.memberUids.filter(uid => uid !== req.params.memberId);

    await groupRef.update({
      members: updatedMembers,
      memberUids: updatedMemberUids,
      updatedAt: new Date().toISOString()
    });

    const removed = group.members.find(m => m.uid === req.params.memberId);
    const isSelf = req.params.memberId === req.user.uid;
    logActivity(db, { groupId: req.params.groupId, groupName: group.name, type: 'member_removed', actorUid: req.user.uid, actorName: req.user.name, detail: isSelf ? `${req.user.name} left the group` : `${req.user.name} removed ${removed?.name || 'a member'}` });

    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update group
router.patch('/:groupId', async (req, res) => {
  const db = getDb();
  const { name, description } = req.body;
  try {
    const groupRef = db.collection('groups').doc(req.params.groupId);
    const groupDoc = await groupRef.get();
    if (!groupDoc.exists) return res.status(404).json({ error: 'Group not found' });
    const group = groupDoc.data();
    if (group.createdBy !== req.user.uid) return res.status(403).json({ error: 'Only the group admin can edit group details' });

    const updates = { updatedAt: new Date().toISOString() };
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;

    await groupRef.update(updates);
    logActivity(db, { groupId: req.params.groupId, groupName: updates.name || group.name, type: 'group_updated', actorUid: req.user.uid, actorName: req.user.name, detail: `${req.user.name} updated the group details` });
    res.json({ message: 'Group updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete group
router.delete('/:groupId', async (req, res) => {
  const db = getDb();
  try {
    const groupRef = db.collection('groups').doc(req.params.groupId);
    const groupDoc = await groupRef.get();
    if (!groupDoc.exists) return res.status(404).json({ error: 'Group not found' });
    const group = groupDoc.data();
    if (group.createdBy !== req.user.uid) return res.status(403).json({ error: 'Only the group admin can delete the group' });

    const unsettledSnap = await db.collection('expenses')
      .where('groupId', '==', req.params.groupId)
      .where('settled', '==', false)
      .get();

    if (!unsettledSnap.empty) {
      return res.status(400).json({ error: 'Cannot delete group with unsettled expenses. Settle all expenses first.' });
    }

    await groupRef.delete();
    res.json({ message: 'Group deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
