import nodemailer from 'nodemailer';
import { FRONTEND_URL } from '../config/constants.js';

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

export const sendVerificationEmail = async ({ email, name, token }) => {
  const gmailUser = String(process.env.GMAIL_USER || '').trim();
  const gmailAppPassword = String(process.env.GMAIL_APP_PASSWORD || '')
    .replace(/\s/g, '');

  if (!gmailUser || !gmailAppPassword) {
    throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD are required');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });
  const appUrl = String(process.env.APP_URL || FRONTEND_URL).replace(/\/$/, '');
  const verificationUrl = new URL('/verify-email', `${appUrl}/`);
  verificationUrl.searchParams.set('token', token);
  const verificationUrlText = verificationUrl.toString();
  const safeVerificationUrl = escapeHtml(verificationUrlText);
  const safeName = escapeHtml(name);

  await transporter.sendMail({
    from: `Horse GP <${gmailUser}>`,
    to: email,
    replyTo: gmailUser,
    subject: 'Verify your Horse GP account',
    text: [
      `Hello ${name},`,
      '',
      'Please verify your email address for your Horse GP account.',
      verificationUrlText,
      '',
      'This link expires in one hour. If you did not create this account, you can ignore this email.',
    ].join('\n'),
    html: `<!doctype html>
      <html lang="en">
        <body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#172033;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:32px 16px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:32px;">
                  <tr>
                    <td>
                      <p style="margin:0 0 8px;color:#9a741e;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Horse GP Championship</p>
                      <h1 style="margin:0 0 20px;font-size:26px;line-height:1.25;">Verify your email address</h1>
                      <p style="margin:0 0 16px;line-height:1.6;">Hello ${safeName},</p>
                      <p style="margin:0 0 24px;line-height:1.6;">Please confirm this email address for your Horse GP account.</p>
                      <p style="margin:0 0 24px;text-align:center;">
                        <a href="${safeVerificationUrl}" style="display:inline-block;background:#b8892d;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 24px;border-radius:10px;">Verify email address</a>
                      </p>
                      <p style="margin:0 0 8px;color:#5f6b7a;font-size:13px;line-height:1.5;">If the button does not work, copy and paste this address into your browser:</p>
                      <p style="margin:0 0 24px;overflow-wrap:anywhere;font-size:13px;line-height:1.5;"><a href="${safeVerificationUrl}" style="color:#2457a7;">${safeVerificationUrl}</a></p>
                      <p style="margin:0;color:#5f6b7a;font-size:13px;line-height:1.5;">This link expires in one hour. If you did not create this account, you can safely ignore this email.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>`,
  });
};
