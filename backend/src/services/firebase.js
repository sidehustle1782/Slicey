const admin = require('firebase-admin');
const path = require('path');

let db;

function initFirebase() {
  if (admin.apps.length > 0) return;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  let serviceAccount;
  if (!raw) {
    serviceAccount = require('../../firebase-service-account.json');
  } else if (raw.trim().startsWith('{')) {
    serviceAccount = JSON.parse(raw);
  } else {
    // Treat as a file path relative to the backend root (where npm run dev is executed)
    serviceAccount = require(path.resolve(process.cwd(), raw));
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });

  db = admin.firestore();
  console.log('✅ Firebase Admin initialized');
}

function getDb() {
  if (!db) throw new Error('Firebase not initialized');
  return db;
}

function getAuth() {
  return admin.auth();
}

module.exports = { initFirebase, getDb, getAuth };
