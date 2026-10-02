import twilio from 'twilio'

export async function sendResetSms(to: string, resetLink: string, code: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID

  if (!accountSid || !authToken || !messagingServiceSid) {
    console.warn('Twilio env vars missing — skipping SMS send')
    return { skipped: true, reason: 'TWILIO env vars not set' }
  }

  const client = twilio(accountSid, authToken)
  const message = await client.messages.create({
    to,
    messagingServiceSid,
    body: `Reset your Auto Parts password: ${resetLink}\nOne-time code: ${code} (expires in 15 minutes)`
  })

  return { sid: message.sid }
}
