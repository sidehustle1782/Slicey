const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendInviteEmail({ toEmail, toName, inviterName, groupName, frontendUrl }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"Slicey" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `${inviterName} added you to "${groupName}" on Slicey`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0f0e0c;color:#f5f4f0;border-radius:16px">
        <h2 style="margin:0 0 8px">You've been added to <strong>${groupName}</strong></h2>
        <p style="color:#a0998a;margin:0 0 24px">
          ${inviterName} added you to a group on Slicey — a simple way to split expenses with friends.
        </p>
        <a href="${frontendUrl}/login" style="display:inline-block;background:#e8b84b;color:#0f0e0c;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:8px">
          Join Slicey to view your group
        </a>
        <p style="color:#666;font-size:12px;margin-top:32px">
          Sign in with the Google account associated with ${toEmail}.
        </p>
      </div>
    `,
  });
}

module.exports = { sendInviteEmail };
