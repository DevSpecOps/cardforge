import { useState } from 'react'
import { generateCard, saveCard, type ProductCard } from './api'

export default function App() {
  const [input, setInput] = useState('')
  const [card, setCard] = useState<ProductCard | null>(null)
  const [cardId, setCardId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function onGenerate() {
    setLoading(true)
    setError(null)
    setSaved(false)
    setCard(null)
    setCardId(null)
    try {
      const res = await generateCard(input)
      setCard(res.card)
      setCardId(res.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  function update<K extends keyof ProductCard>(key: K, value: ProductCard[K]) {
    if (!card) return
    setCard({ ...card, [key]: value })
    setSaved(false)
  }

  async function onSave() {
    if (!cardId || !card) return
    try {
      await saveCard(cardId, card)
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className='app'>
      <h1>CardForge</h1>
      <p className='sub'>LLM → structured JSON → ручная правка</p>

      <section className='panel'>
        <label>Описание товара</label>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder='Мужская беговая футболка, дышащая, лёгкая, для тренировок...'
        />
        <button onClick={onGenerate} disabled={loading || input.trim().length < 3}>
          {loading ? 'Генерирую…' : 'Сгенерировать карточку'}
        </button>
        {error && <div className='error'>Ошибка: {error}</div>}
      </section>

      {card && (
        <section className='panel'>
          <h2>Результат (ID: {cardId})</h2>
          <label>Название</label>
          <input value={card.title} onChange={e => update('title', e.target.value)} />
          <label>Описание</label>
          <textarea value={card.description} onChange={e => update('description', e.target.value)} />
          <label>Буллеты (по одному в строке)</label>
          <textarea
            value={card.bullets.join('\n')}
            onChange={e => update('bullets', e.target.value.split('\n').filter(Boolean))}
          />
          <label>Теги (через запятую)</label>
          <input
            value={card.tags.join(', ')}
            onChange={e => update('tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
          />
          <label>SEO-ключи (через запятую)</label>
          <input
            value={card.seo_keywords.join(', ')}
            onChange={e => update('seo_keywords', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
          />
          <button onClick={onSave} disabled={!cardId}>Сохранить правки</button>
          {saved && <span className='ok'>Сохранено</span>}
        </section>
      )}
    </div>
  )
}