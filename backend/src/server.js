require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cron = require('node-cron');

const { initFirebase } = require('./services/firebase');
const authMiddleware = require('./middleware/auth');
const groupRoutes = require('./routes/groups');
const expenseRoutes = require('./routes/expenses');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');
const activityRoutes = require('./routes/activity');
const { sendWeeklyReminders } = require('./services/notifications');

const app = express();
const PORT = process.env.PORT || 5000;

// Init Firebase Admin
initFirebase();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/groups', authMiddleware, groupRoutes);
app.use('/api/expenses', authMiddleware, expenseRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);
app.use('/api/activity', authMiddleware, activityRoutes);

// Weekly reminder cron: every Monday at 9am
cron.schedule('0 9 * * 1', async () => {
  console.log('Running weekly reminder job...');
  await sendWeeklyReminders();
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.listen(PORT, () => {
  console.log(`✅ Slicey backend running on port ${PORT}`);
});

module.exports = app;
