import { Expo, ExpoPushMessage } from 'expo-server-sdk'
import { FilterQuery } from 'mongoose'
import PushToken, { IPushToken } from '../models/PushToken'

const expoClient = new Expo()
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY

type SendResult =
  | { token: string; provider: 'expo'; ticket: unknown }
  | { token: string; provider: 'fcm'; response: unknown }
  | { token: string; provider: 'fcm'; error: string }
  | { token: string; provider: 'expo'; error: string }

export async function savePushToken(payload: {
  userId: string
  token: string
  provider: 'expo' | 'fcm'
  platform?: 'ios' | 'android' | 'web' | 'unknown'
  deviceId?: string
}): Promise<IPushToken> {
  const { userId, token, provider, platform, deviceId } = payload
  const normalizedToken = token.trim()
  const filter: FilterQuery<IPushToken> =
    deviceId?.trim() ? { user: userId, deviceId: deviceId.trim() } : { token: normalizedToken }

  try {
    const doc = await PushToken.findOneAndUpdate(
      filter,
      {
        $set: {
          user: userId,
          token: normalizedToken,
          provider,
          platform: platform || 'unknown',
          deviceId: deviceId?.trim(),
          lastUsedAt: new Date()
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    return doc
  } catch (err: any) {
    // Handle duplicate token collisions by updating the existing record for that token
    if (err?.code === 11000) {
      const doc = await PushToken.findOneAndUpdate(
        { token: normalizedToken },
        {
          $set: {
            user: userId,
            provider,
            platform: platform || 'unknown',
            deviceId: deviceId?.trim(),
            lastUsedAt: new Date()
          }
        },
        { new: true }
      )
      return doc as IPushToken
    }
    throw err
  }
}

export async function sendPushToUserTokens(
  userId: string,
  message: { title: string; body?: string; data?: Record<string, any> }
): Promise<{ sent: SendResult[]; skipped: string[] }> {
  const tokens = await PushToken.find({ user: userId }).lean()
  const sent: SendResult[] = []
  const skipped: string[] = []

  const expoMessages: ExpoPushMessage[] = []
  const fcmTokens: string[] = []

  tokens.forEach(t => {
    if (t.provider === 'expo') {
      if (!Expo.isExpoPushToken(t.token)) {
        skipped.push(t.token)
        return
      }
      expoMessages.push({
        to: t.token,
        sound: 'default',
        title: message.title,
        body: message.body || '',
        data: message.data
      })
    } else if (t.provider === 'fcm') {
      fcmTokens.push(t.token)
    }
  })

  if (expoMessages.length) {
    const tickets = await expoClient.sendPushNotificationsAsync(expoMessages)
    expoMessages.forEach((msg, idx) => {
      sent.push({ token: msg.to as string, provider: 'expo', ticket: tickets[idx] })
    })
  }

  if (fcmTokens.length) {
    const results = await Promise.all(
      fcmTokens.map(async token => {
        if (!FCM_SERVER_KEY) {
          return { token, provider: 'fcm', error: 'FCM_SERVER_KEY not configured on server' } as SendResult
        }
        try {
          const res = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `key=${FCM_SERVER_KEY}`
            },
            body: JSON.stringify({
              to: token,
              priority: 'high',
              notification: {
                title: message.title,
                body: message.body
              },
              data: message.data
            })
          })
          const json = await res.json()
          return { token, provider: 'fcm', response: json } as SendResult
        } catch (err: any) {
          return { token, provider: 'fcm', error: err?.message || 'Failed to send via FCM' } as SendResult
        }
      })
    )
    sent.push(...results)
  }

  return { sent, skipped }
}
