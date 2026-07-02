import {
  PlaceholderItemListSchema,
  type PlaceholderItemList,
} from '@repo/shared-types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export async function listPlaceholderItems(): Promise<PlaceholderItemList> {
  const response = await fetch(`${API_URL}/placeholder`)

  if (!response.ok) {
    throw new Error('TODO: replace placeholder API error handling')
  }

  return PlaceholderItemListSchema.parse(await response.json())
}
