const { getStore } = require('@netlify/blobs');

async function sendResendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY || !to) return false;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RECOVERY_FROM_EMAIL || 'Kigali FreshCart <onboarding@resend.dev>',
      to: [to],
      subject,
      html
    })
  });
  if (!response.ok) throw new Error(`Resend email failed: ${response.status}`);
  return true;
}

async function sendTwilioSMS({ to, body }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from || !to) return false;
  const params = new URLSearchParams({ From: from, To: to, Body: body });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });
  if (!response.ok) throw new Error(`Twilio SMS failed: ${response.status}`);
  return true;
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ ok: false, message: 'Method not allowed.' }) };

  try {
    const body = JSON.parse(event.body || '{}');
    const store = getStore('freshcart');
    const config = (await store.get('config', { type: 'json' })) || {};
    const business = config.business || {};
    const admin = config.admin || {};
    const ownerEmail = process.env.OWNER_RECOVERY_EMAIL || business.email || body.email || 'kigalifreshcart@gmail.com';
    const ownerPhone = process.env.OWNER_RECOVERY_PHONE || business.phoneDisplay || body.phone || '+250727725180';
    const site = process.env.URL || 'https://kigalifreshcart.com';
    const passwordHint = admin.password ? `<p><b>Current admin password:</b> ${String(admin.password).replace(/[<>&]/g, '')}</p>` : '<p>No online admin password was found yet. Use the default password from the deployed data file.</p>';
    const html = `<h2>Kigali FreshCart Admin Recovery</h2><p>A password recovery request was initiated from the admin panel.</p>${passwordHint}<p>Admin login: <a href="${site}/admin.html">${site}/admin.html</a></p><p>Request time: ${new Date().toISOString()}</p>`;

    let emailSent = false, smsSent = false;
    try { emailSent = await sendResendEmail({ to: ownerEmail, subject: 'Kigali FreshCart admin password recovery', html }); } catch (e) { console.error(e); }
    try { smsSent = await sendTwilioSMS({ to: String(ownerPhone).replace(/\s/g, ''), body: `Kigali FreshCart recovery requested. Open ${site}/admin.html. Check recovery email for password details.` }); } catch (e) { console.error(e); }

    const message = emailSent || smsSent
      ? 'Recovery request sent through the configured backend channel.'
      : 'Recovery backend is active. To send automatic email/SMS, add RESEND_API_KEY or Twilio environment variables in Netlify. Use the contacts below for now.';
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, message, emailSent, smsSent }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, message: error.message }) };
  }
};
