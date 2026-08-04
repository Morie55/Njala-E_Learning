import { Resend } from 'resend'
import nodemailer from 'nodemailer'

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const RESEND_FROM = process.env.RESEND_FROM || process.env.EMAIL_FROM || 'Njala E-Learning <onboarding@resend.dev>'

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com'
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465')
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const SMTP_FROM = process.env.SMTP_FROM || `"Njala E-Learning" <${SMTP_USER}>`

let resendClient = null
function getResendClient() {
  if (!RESEND_API_KEY) return null
  if (!resendClient) {
    resendClient = new Resend(RESEND_API_KEY)
  }
  return resendClient
}

let transporter = null
function getTransporter() {
  if (!SMTP_USER || !SMTP_PASS) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  }
  return transporter
}

/**
 * Send an email using Resend API (primary) or Nodemailer SMTP (fallback).
 * Silently skips if neither is configured.
 * @param {{ to: string, subject: string, html: string, text?: string }} opts
 */
export async function sendMail({ to, subject, html, text }) {
  const resend = getResendClient()
  if (resend) {
    try {
      const response = await resend.emails.send({
        from: RESEND_FROM,
        to,
        subject,
        html,
        ...(text ? { text } : {}),
      })
      console.log('[mailer:resend] Sent:', subject, '→', to, 'ID:', response.data?.id)
      return response
    } catch (err) {
      console.error('[mailer:resend] Failed:', err.message)
    }
  }

  const t = getTransporter()
  if (t) {
    try {
      await t.sendMail({ from: SMTP_FROM, to, subject, html, text })
      console.log('[mailer:smtp] Sent:', subject, '→', to)
      return
    } catch (err) {
      console.error('[mailer:smtp] Failed:', err.message)
    }
  }

  console.warn('[mailer] Neither RESEND_API_KEY nor SMTP configured — skipping email to', to)
}

/** Email templates */
export const templates = {
  gradePosted: (studentName, courseName, assignmentTitle, score, maxScore, gradeLink) => ({
    subject: `Grade Posted — ${assignmentTitle}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden">
        <div style="background:#03224d;padding:24px 28px">
          <img src="https://njala.edu.sl/wp-content/uploads/2020/10/Njala-University-Logo.png" alt="Njala University" height="40" style="opacity:0.9"/>
          <h2 style="color:#fff;margin:12px 0 0;font-size:18px">Grade Posted</h2>
        </div>
        <div style="padding:28px">
          <p style="color:#1b1c1c;font-size:15px">Dear <strong>${studentName}</strong>,</p>
          <p style="color:#44474f;font-size:14px">Your grade for <strong>${assignmentTitle}</strong> in <strong>${courseName}</strong> has been posted.</p>
          <div style="background:#f6f3f2;border-radius:10px;padding:16px 20px;margin:16px 0;text-align:center">
            <p style="margin:0;font-size:32px;font-weight:800;color:#03224d">${score}/${maxScore}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#747780;text-transform:uppercase;letter-spacing:1px">Your Score</p>
          </div>
          <a href="${gradeLink}" style="display:inline-block;background:#03224d;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold;margin-top:8px">View My Grades →</a>
        </div>
        <div style="background:#f6f3f2;padding:16px 28px;font-size:11px;color:#747780;text-align:center">
          Njala University E-Learning Platform · Njala, Sierra Leone · <a href="mailto:support@njala.edu.sl">IT Support</a>
        </div>
      </div>`,
  }),

  assignmentCreated: (studentName, courseName, assignmentTitle, dueDate, submitLink) => ({
    subject: `New Assignment — ${assignmentTitle}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden">
        <div style="background:#086b53;padding:24px 28px">
          <h2 style="color:#fff;margin:0;font-size:18px">📚 New Assignment Posted</h2>
        </div>
        <div style="padding:28px">
          <p style="color:#1b1c1c;font-size:15px">Dear <strong>${studentName}</strong>,</p>
          <p style="color:#44474f;font-size:14px">A new assignment has been posted in <strong>${courseName}</strong>.</p>
          <div style="border-left:4px solid #086b53;padding:12px 16px;margin:16px 0;background:#f0fdf9;border-radius:0 8px 8px 0">
            <p style="margin:0;font-weight:bold;color:#03224d;font-size:15px">${assignmentTitle}</p>
            ${dueDate ? `<p style="margin:4px 0 0;color:#44474f;font-size:13px">Due: <strong>${new Date(dueDate).toLocaleDateString('en-GB', { dateStyle: 'full' })}</strong></p>` : ''}
          </div>
          <a href="${submitLink}" style="display:inline-block;background:#086b53;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold;margin-top:8px">Submit Assignment →</a>
        </div>
        <div style="background:#f6f3f2;padding:16px 28px;font-size:11px;color:#747780;text-align:center">
          Njala University E-Learning Platform · <a href="mailto:support@njala.edu.sl">IT Support</a>
        </div>
      </div>`,
  }),

  announcementPosted: (studentName, courseName, lecturerName, announcementTitle, body, link) => ({
    subject: `Announcement in ${courseName}: ${announcementTitle}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden">
        <div style="background:#1a4fd8;padding:24px 28px">
          <h2 style="color:#fff;margin:0;font-size:18px">📣 New Announcement</h2>
        </div>
        <div style="padding:28px">
          <p style="color:#1b1c1c;font-size:15px">Dear <strong>${studentName}</strong>,</p>
          <p style="color:#44474f;font-size:14px"><strong>${lecturerName}</strong> posted an announcement in <strong>${courseName}</strong>.</p>
          <div style="border:1px solid #e0e0e0;border-radius:10px;padding:16px 20px;margin:16px 0">
            <p style="margin:0 0 8px;font-weight:bold;color:#1a4fd8;font-size:15px">${announcementTitle}</p>
            <p style="margin:0;color:#44474f;font-size:14px;line-height:1.6">${body?.slice(0, 400) ?? ''}${body?.length > 400 ? '…' : ''}</p>
          </div>
          <a href="${link}" style="display:inline-block;background:#1a4fd8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold">View Announcement →</a>
        </div>
        <div style="background:#f6f3f2;padding:16px 28px;font-size:11px;color:#747780;text-align:center">
          Njala University E-Learning Platform · <a href="mailto:support@njala.edu.sl">IT Support</a>
        </div>
      </div>`,
  }),

  paymentReceipt: (studentName, amount, feeType, reference, date) => ({
    subject: `Payment Receipt — ${feeType} Fee`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden">
        <div style="background:#03224d;padding:24px 28px;display:flex;justify-content:space-between;align-items:center">
          <h2 style="color:#fff;margin:0;font-size:18px">✅ Payment Confirmed</h2>
          <span style="color:#a0f3d4;font-size:12px;font-weight:bold">OFFICIAL RECEIPT</span>
        </div>
        <div style="padding:28px">
          <p style="color:#1b1c1c;font-size:15px">Dear <strong>${studentName}</strong>,</p>
          <p style="color:#44474f;font-size:14px">Your payment has been successfully received.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
            <tr style="border-bottom:1px solid #e0e0e0"><td style="padding:10px 0;color:#44474f">Fee Type</td><td style="padding:10px 0;font-weight:bold;text-align:right;color:#03224d">${feeType}</td></tr>
            <tr style="border-bottom:1px solid #e0e0e0"><td style="padding:10px 0;color:#44474f">Amount Paid</td><td style="padding:10px 0;font-weight:bold;text-align:right;color:#03224d">SLE ${Number(amount).toLocaleString()}</td></tr>
            <tr style="border-bottom:1px solid #e0e0e0"><td style="padding:10px 0;color:#44474f">Reference</td><td style="padding:10px 0;font-weight:bold;text-align:right;color:#03224d">${reference}</td></tr>
            <tr><td style="padding:10px 0;color:#44474f">Date</td><td style="padding:10px 0;text-align:right;color:#03224d">${new Date(date).toLocaleString('en-GB')}</td></tr>
          </table>
          <div style="background:#a0f3d4/20;border:1px solid #086b53;border-radius:8px;padding:12px 16px;margin-top:8px">
            <p style="margin:0;font-size:12px;color:#086b53">Please keep this email as proof of payment for your records.</p>
          </div>
        </div>
        <div style="background:#f6f3f2;padding:16px 28px;font-size:11px;color:#747780;text-align:center">
          Njala University · Finance Office · <a href="mailto:support@njala.edu.sl">IT Support</a>
        </div>
      </div>`,
  }),

  broadcastAnnouncement: (userName, postedByName, announcementTitle, body, link) => ({
    subject: `[University Announcement] ${announcementTitle || 'Important Update'}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden">
        <div style="background:#03224d;padding:24px 28px">
          <h2 style="color:#fff;margin:0;font-size:18px">📢 University Broadcast Announcement</h2>
        </div>
        <div style="padding:28px">
          <p style="color:#1b1c1c;font-size:15px">Dear <strong>${userName}</strong>,</p>
          <p style="color:#44474f;font-size:14px">An official announcement has been broadcast by <strong>${postedByName}</strong>:</p>
          <div style="border:1px solid #c4c6d0;border-left:4px solid #03224d;border-radius:8px;padding:16px 20px;margin:16px 0;background:#f6f3f2">
            <p style="margin:0;color:#1b1c1c;font-size:15px;line-height:1.6;white-space:pre-wrap">${body}</p>
          </div>
          <a href="${link || 'https://nelms.njala.edu.sl/dashboard'}" style="display:inline-block;background:#03224d;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold">Open E-Learning Platform →</a>
        </div>
        <div style="background:#f6f3f2;padding:16px 28px;font-size:11px;color:#747780;text-align:center">
          Njala University E-Learning Platform · <a href="mailto:support@njala.edu.sl">IT Support</a>
        </div>
      </div>`,
  }),
}

