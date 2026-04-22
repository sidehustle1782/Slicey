# ✦ SplitEase

> Split expenses, not friendships.

A clean, fast, mobile-first expense splitting app for groups up to 30 people. Built with React, Express, and Firebase — addressing the most common complaints about Splitwise and similar apps.

---

## 🎯 Features

- **Google Sign-in** — no passwords, no friction. One tap to log in.
- **Groups up to 30 people** — create a group, invite by email (members must have signed in first).
- **3 split types:**
  - **Equal** — divide evenly (rounding handled automatically)
  - **Percentage** — e.g. 40/30/30 (must total 100%)
  - **Exact amounts** — specify exact amount per person (must total expense amount)
- **Modify splits** — edit expense amounts, split type, who's included, at any time.
- **Remove members** — blocked if they have unsettled expenses (prevents data corruption).
- **Settle up** — mark your share as settled with a payment method note. Can be done by payer or admin on behalf of others.
- **Overdue reminders** — weekly cron job (Monday 9am) sends in-app notifications for expenses unpaid > 2 weeks.
- **Dashboard** — net balance, total owed, total owing at a glance.
- **Activity feed** — all expenses across all groups, filterable by unsettled/settled/overdue.
- **Mobile PWA** — installable on iOS and Android, with bottom navigation.

---

## ✅ Problems Fixed vs Splitwise

| Splitwise complaint | SplitEase solution |
|---|---|
| Confusing balance display | Clear "you owe / you're owed" with amounts per group |
| Hard to see who owes what | Per-expense split chips showing settled/unsettled per person |
| Can't easily modify splits | Edit expense button recalculates splits, preserves settled portions |
| Rounding errors | Remainder assigned to first person automatically |
| No context on payments | Payment method + note logged when settling |
| Annoying email notifications | In-app only; weekly reminders only after 2 weeks |
| Removing members breaks things | Blocked if unsettled expenses exist, with clear error |
| Slow mobile experience | PWA, dark theme, minimal data fetching |

---

## 🚀 Setup

### Prerequisites
- Node.js 18+
- Firebase project (Blaze plan for Cloud Functions, Spark for Firestore/Auth only)
- Google Cloud project linked to Firebase

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Authentication** → Sign-in method → **Google**
4. Enable **Firestore Database** (start in production mode)
5. Deploy Firestore rules:
   ```bash
   firebase deploy --only firestore:rules
   firebase deploy --only firestore:indexes
   ```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
npm install
```

Edit `.env`:
```
PORT=5000
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}  # paste from Firebase > Project Settings > Service Accounts
FRONTEND_URL=http://localhost:3000
```

**Getting your service account:**
- Firebase Console → Project Settings → Service Accounts → Generate new private key
- Either paste the JSON as a string in `FIREBASE_SERVICE_ACCOUNT` or save as `backend/firebase-service-account.json`

```bash
npm run dev   # starts with nodemon
```

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env
npm install
```

Edit `.env`:
```
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
REACT_APP_FIREBASE_APP_ID=...
REACT_APP_API_URL=http://localhost:5000
```

**Getting Firebase web config:**
- Firebase Console → Project Settings → Your apps → Add web app → copy config

```bash
npm start   # starts on port 3000
```

### 4. Run Both Together

From root:
```bash
npm install
npm run dev   # starts both frontend and backend concurrently
```

---

## 📁 Project Structure

```
splitease/
├── frontend/
│   ├── public/
│   │   ├── index.html          # Mobile-optimized HTML
│   │   └── manifest.json       # PWA manifest
│   └── src/
│       ├── components/
│       │   ├── Sidebar.js/.css       # Desktop sidebar nav
│       │   ├── BottomNav.js/.css     # Mobile bottom nav
│       │   ├── ExpenseModal.js/.css  # Add/edit expense
│       │   ├── SettleModal.js/.css   # Settle up flow
│       │   └── ProtectedRoute.js
│       ├── context/
│       │   └── AuthContext.js        # Firebase auth state
│       ├── pages/
│       │   ├── Login.js/.css         # Google sign-in
│       │   ├── Dashboard.js/.css     # Overview + balances
│       │   ├── Groups.js/.css        # Group list
│       │   ├── GroupDetail.js/.css   # Group hub (expenses/balances/members)
│       │   ├── NewGroup.js/.css      # Create group + add members
│       │   ├── AddMember.js          # Add member to existing group
│       │   ├── Activity.js/.css      # Cross-group expense feed
│       │   └── Notifications.js/.css # Reminders + notifications
│       ├── styles/
│       │   └── global.css            # Design tokens + base styles
│       ├── utils/
│       │   ├── api.js                # Axios instance with auth
│       │   └── helpers.js            # Formatters, constants
│       ├── firebase.js               # Firebase client config
│       ├── App.js                    # Router + shell
│       └── index.js
│
├── backend/
│   └── src/
│       ├── middleware/
│       │   └── auth.js               # Firebase token verification
│       ├── routes/
│       │   ├── users.js              # Profile sync, user search
│       │   ├── groups.js             # CRUD + member management
│       │   ├── expenses.js           # CRUD + split calc + settle
│       │   └── notifications.js      # In-app notifications
│       ├── services/
│       │   ├── firebase.js           # Firebase Admin SDK
│       │   └── notifications.js      # Weekly reminder cron logic
│       ├── utils/
│       │   └── splitCalculator.js    # Split math (equal/pct/exact)
│       └── server.js                 # Express app + cron job
│
├── firestore.rules                   # Security rules
├── firestore.indexes.json            # Composite indexes
└── firebase.json                     # Firebase CLI config
```

---

## 🔌 API Reference

### Auth
All endpoints require `Authorization: Bearer <firebase-id-token>`

### Users
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/users/sync` | Upsert user profile on login |
| GET | `/api/users/me` | Get own profile |
| GET | `/api/users/search?email=` | Search user by email |

### Groups
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/groups` | Create group |
| GET | `/api/groups` | List my groups |
| GET | `/api/groups/:id` | Get group detail |
| PATCH | `/api/groups/:id` | Update group name/desc |
| DELETE | `/api/groups/:id` | Delete group (admin only, all settled) |
| POST | `/api/groups/:id/members` | Add member by email |
| DELETE | `/api/groups/:id/members/:uid` | Remove member |

### Expenses
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/expenses` | Create expense |
| GET | `/api/expenses/group/:groupId` | List expenses + balances for group |
| GET | `/api/expenses/summary/me` | My net summary across all groups |
| PATCH | `/api/expenses/:id` | Edit expense/split |
| DELETE | `/api/expenses/:id` | Delete expense |
| POST | `/api/expenses/:id/settle` | Mark split as settled |
| POST | `/api/expenses/:id/unsettle` | Unsettle a split |

### Notifications
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notifications` | Get my notifications |
| PATCH | `/api/notifications/:id/read` | Mark as read |
| POST | `/api/notifications/read-all` | Mark all as read |

---

## 🚀 Deployment

### Frontend (Firebase Hosting)
```bash
cd frontend && npm run build
firebase deploy --only hosting
```

### Backend (Railway / Render / Fly.io)
```bash
# Example: Railway
railway login
railway init
railway up
# Set environment variables in dashboard
```

### Environment Variables (Production)
```
NODE_ENV=production
PORT=5000
FIREBASE_SERVICE_ACCOUNT=<json string>
FRONTEND_URL=https://your-app.web.app
```

---

## 📱 Mobile (PWA)

To install on iOS:
1. Open in Safari → Share → Add to Home Screen

To install on Android:
1. Open in Chrome → Menu → Add to Home Screen (or banner prompt)

---

## 🔮 Future: Payment Integration

The settle flow has a `paymentMethod` field ready. To add real payments:
1. Integrate Stripe Connect or PayPal Payouts
2. Add `/api/payments` route
3. On settle, initiate transfer before marking as settled
4. Update `SettleModal.js` to show live payment options

---

## License
MIT
