import { apiRequest } from './client'

export type Make = {
  _id: string
  name: string
  image: string
  slug: string
  description?: string
}



export function fetchMakes() {
  return apiRequest<Make[]>('/makes')
}


