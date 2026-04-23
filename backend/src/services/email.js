const { Resend } = require('resend');

async function sendInviteEmail({ toEmail, toName, inviterName, groupName, frontendUrl }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ Invite email skipped: RESEND_API_KEY not set');
    return;
  }
  console.log(`📧 Sending invite email to ${toEmail}...`);

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.SMTP_FROM || 'Slicey <onboarding@resend.dev>',
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

  if (error) {
    console.error(`❌ Invite email failed for ${toEmail}:`, error.message);
    throw new Error(error.message);
  }
  console.log(`✅ Invite email sent to ${toEmail}`);
}

module.exports = { sendInviteEmail };
