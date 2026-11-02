export interface ProductCard {
  title: string
  description: string
  bullets: string[]
  tags: string[]
  seo_keywords: string[]
}

export interface GenerateResponse {
  id: number
  card: ProductCard
}

export async function generateCard(input_text: string): Promise<GenerateResponse> {
  const r = await fetch('/api/cards/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input_text }),
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