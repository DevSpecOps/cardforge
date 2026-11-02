export interface ProductCard {
  title: string
  description: string
  bullets: string[]
  tags: string[]
  seo_keywords: string[]
  brand: string
  manufacturer: string
  category: string
  gender: string
  material: string
  care: string
  country_of_origin: string
  size: string
  color: string
}

export interface GenerateResponse {
  id: number
  card: ProductCard
}

export interface DbCard {
  id: number
  input_text: string
  card_json: string
  edited: number
  created_at: string
}

export async function generateCard(input_text: string, imageFile?: File | null): Promise<GenerateResponse> {
  const formData = new FormData()
  if (input_text) formData.append('input_text', input_text)
  if (imageFile) formData.append('image', imageFile)

  const r = await fetch('/api/cards/generate', {
    method: 'POST',
    body: formData,
  })
  if (!r.ok) throw new Error('API ' + r.status + ': ' + (await r.text()))
  return r.json()
}

export async function enhanceCard(id: number, card: ProductCard): Promise<ProductCard> {
  const r = await fetch('/api/cards/' + id + '/enhance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(card),
  })
  if (!r.ok) throw new Error('API ' + r.status + ': ' + (await r.text()))
  return r.json()
}

export async function saveCard(id: number, card: ProductCard): Promise<void> {
  const r = await fetch('/api/cards/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(card),
  })
  if (!r.ok) throw new Error('API ' + r.status + ': ' + (await r.text()))
}

export async function fetchHistory(): Promise<DbCard[]> {
  const r = await fetch('/api/cards')
  if (!r.ok) throw new Error('API ' + r.status)
  return r.json()
}

export async function deleteCard(id: number): Promise<void> {
  const r = await fetch('/api/cards/' + id, { method: 'DELETE' })
  if (!r.ok) throw new Error('API ' + r.status)
}