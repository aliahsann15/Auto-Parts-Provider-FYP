import nodemailer from 'nodemailer'

type MailAttachment = {
  filename: string
  content: string | Buffer
  contentType?: string
}

type MailPayload = {
  to: string
  subject: string
  html: string
  text: string
  attachments?: MailAttachment[]
}

function getFromAddress() {
  return (
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    (process.env.SMTP_USER ? `"Autopart Provider" <${process.env.SMTP_USER}>` : `"Autopart Provider" <no-reply@autopart.io>`)
  )
}

async function getTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    })
  }

  // Fall back to ethereal in dev to keep a free preview inbox.
  const testAcct = await nodemailer.createTestAccount()
  return nodemailer.createTransport({
    host: testAcct.smtp.host,
    port: testAcct.smtp.port,
    secure: testAcct.smtp.secure,
    auth: {
      user: testAcct.user,
      pass: testAcct.pass
    }
  })
}

export async function sendMail(payload: MailPayload) {
  const transporter = await getTransporter()
  const info = await transporter.sendMail({
    from: getFromAddress(),
    ...payload
  })

  return {
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info)
  }
}

export async function sendVerificationEmail(to: string, code: string) {
  return sendMail({
    to,
    subject: 'Your Verification Code',
    text: `Your verification code is ${code}`,
    html: `<p>Use this code to verify your email: <strong>${code}</strong>.</p>`
  })
}

export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
  code: string,
  mobileDeepLink?: string
) {
  const link = mobileDeepLink || resetLink
  return sendMail({
    to,
    subject: 'Reset your password',
    text: `One-time code: ${code} (expires in 1 minute).`,
    html: `<p>Use this one-time code to reset your password (expires in 1 minute): <strong>${code}</strong>.</p>`
  })
}
