import huntItems from '@/data/hunt-items.json'

export interface HuntItem {
  key: string
  title: string
  description: string
  category: string
  points: number
  bonusPoints?: number
  bonusCondition?: string
  proofType: 'photo' | 'self-check'
}

export interface CompletionRow {
  id: number
  participant_id: number
  item_key: string
  photo_filename: string | null
  bonus_awarded: boolean
  completed_at: string
}

const itemMap = new Map<string, HuntItem>(
  (huntItems as HuntItem[]).map((item) => [item.key, item])
)

export function getItemByKey(key: string): HuntItem | undefined {
  return itemMap.get(key)
}

export function calculateScore(completions: CompletionRow[]): number {
  let total = 0
  for (const completion of completions) {
    const item = itemMap.get(completion.item_key)
    if (!item) continue
    total += item.points
    if (completion.bonus_awarded && item.bonusPoints) {
      total += item.bonusPoints
    }
  }
  return total
}

export const CATEGORY_NAMES: Record<string, string> = {
  landmarks: "Can We Coordinate a Picture?!",
  'bar-crawl': "Party That Makes Me Feel My Age",
  performance: "Stage Is Yours",
  social: "Talk to Strangers",
  competitive: "Head to Head",
  'food-drink': "I Make Food Look Fat",
  'wild-cards': "Chaos Energy",
}

export const CATEGORY_ORDER = [
  'landmarks',
  'bar-crawl',
  'performance',
  'social',
  'competitive',
  'food-drink',
  'wild-cards',
]

export { huntItems as ALL_ITEMS }
