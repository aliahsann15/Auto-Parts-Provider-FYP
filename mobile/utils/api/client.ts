import Constants from 'expo-constants'

type RequestOptions = {
  method?: string
  body?: unknown
  token?: string | null
}

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.18.35:4001/api'

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '')



const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value)

const IMAGE_PATH_PREFIXES = ['/images/', '/uploads/']

const resolveImageUrl = (value: string): string => {
  try {
    const parsed = new URL(value)
    for (const prefix of IMAGE_PATH_PREFIXES) {
      if (parsed.pathname.startsWith(prefix)) {
        return `${API_ORIGIN}${parsed.pathname}${parsed.search}${parsed.hash}`
      }
    }
  } catch {
    // ignore invalid URLs
  }
  return value
}

const normalizeImageValue = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(normalizeImageValue)
  }
  if (value && typeof value === 'object') {
    Object.keys(value).forEach(key => {
      (value as any)[key] = normalizeImageValue((value as any)[key])
    })
    return value
  }
  if (typeof value === 'string') {
    if (isAbsoluteUrl(value)) return resolveImageUrl(value)
    for (const prefix of IMAGE_PATH_PREFIXES) {
      if (value.startsWith(prefix)) return `${API_ORIGIN}${value}`
      if (value.startsWith(prefix.slice(1))) return `${API_ORIGIN}/${value}`
    }
  }
  return value
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

  const headers: Record<string, string> = {}
  if (!isFormData) {
    headers['Content-Type'] = 'application/json'
  }
  const normalizedToken =
    token && token !== 'null' && token !== 'undefined' ? token : undefined
  if (normalizedToken) {
    headers.Authorization = `Bearer ${normalizedToken}`
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? (body as any) : body ? JSON.stringify(body) : undefined
  })

  const text = await res.text()
  let data: any = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { msg: text }
  }

  const normalized = normalizeImageValue(data)
  if (!res.ok) {
    const message = normalized?.msg || normalized?.message || normalized?.error || 'Request failed'
    throw new Error(message)
  }

  return normalized as T
}
