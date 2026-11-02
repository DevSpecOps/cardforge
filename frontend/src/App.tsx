import { useState, useEffect } from 'react'
import { generateCard, saveCard, enhanceCard, fetchHistory, deleteCard, type ProductCard, type DbCard } from './api'

const MATERIALS = ['Cotton', 'Silk', 'Wool', 'Polyester', 'Leather', 'Linen', 'Denim']
const COUNTRIES = ['France', 'Italy', 'China', 'Turkey', 'USA', 'Vietnam', 'Portugal']
const BRANDS = ['Nike', 'Adidas', 'Zara', 'H&M', 'Uniqlo', 'Puma']
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const COLORS = ['Black', 'White', 'Red', 'Blue', 'Green', 'Beige']

export default function App() {
  const [input, setInput] = useState('')
  const [specs, setSpecs] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [openedCards, setOpenedCards] = useState<{ id: number, card: ProductCard }[]>([])
  const [loading, setLoading] = useState(false)
  const [enhancingId, setEnhancingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<number | null>(null)
  const [history, setHistory] = useState<DbCard[]>([])
  const [isDragging, setIsDragging] = useState(false)
  
  const [visibleImages, setVisibleImages] = useState<Set<number>>(new Set())
  
  const [loadingText, setLoadingText] = useState('Analyzing image...')
  const loadingSteps = ['Analyzing image...', 'Generating content...', 'Parsing JSON...']

  useEffect(() => {
    const preventDefault = (e: DragEvent) => e.preventDefault()
    window.addEventListener('dragover', preventDefault)
    window.addEventListener('drop', preventDefault)
    return () => {
      window.removeEventListener('dragover', preventDefault)
      window.removeEventListener('drop', preventDefault)
    }
  }, [])

  useEffect(() => {
    let interval: any
    if (loading) {
      let i = 0
      interval = setInterval(() => {
        i = (i + 1) % loadingSteps.length
        setLoadingText(loadingSteps[i])
      }, 2000)
    }
    return () => clearInterval(interval)
  }, [loading])

  async function loadHistory() {
    try {
      setHistory(await fetchHistory())
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => { loadHistory() }, [])

  function toggleImage(id: number) {
    setVisibleImages(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function validateAndSetFile(file: File) {
    if (file.size > 20 * 1024 * 1024) {
      setError('File is too large. Max size is 20MB.')
      setImageFile(null)
      return
    }
    setError(null)
    setImageFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragging) setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      validateAndSetFile(file)
    }
  }

  function addSpec(prefix: string, value: string) {
    setSpecs(prev => {
      const cleanPrev = prev.trim()
      const newStr = `${prefix}: ${value}`
      if (cleanPrev.includes(newStr)) return prev
      return cleanPrev ? `${cleanPrev}, ${newStr}` : newStr
    })
  }

  async function onGenerate() {
    setLoading(true)
    setLoadingText('Analyzing image...')
    setError(null)
    setSavedId(null)
    try {
      const combinedInput = input + (specs ? "\n\nSupplier Specs:\n" + specs : "")
      const res = await generateCard(combinedInput, imageFile)
      setOpenedCards([{ id: res.id, card: res.card }])
      loadHistory()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  function updateCard(id: number, key: keyof ProductCard, value: any) {
    setOpenedCards(prev => prev.map(oc => 
      oc.id === id ? { ...oc, card: { ...oc.card, [key]: value } } : oc
    ))
    setSavedId(null)
  }

  async function onEnhance(id: number, card: ProductCard) {
    setEnhancingId(id)
    setError(null)
    try {
      const newCard = await enhanceCard(id, card)
      setOpenedCards(prev => prev.map(oc => 
        oc.id === id ? { ...oc, card: newCard } : oc
      ))
      setSavedId(id)
      loadHistory()
      setTimeout(() => setSavedId(null), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setEnhancingId(null)
    }
  }

  async function onSave(id: number, card: ProductCard) {
    try {
      await saveCard(id, card)
      setSavedId(id)
      loadHistory()
      setTimeout(() => setSavedId(null), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function onDelete(id: number) {
    if (!confirm('Are you sure you want to delete this card?')) return
    try {
      await deleteCard(id)
      setOpenedCards(prev => prev.filter(oc => oc.id !== id))
      loadHistory()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function onLoadFromHistory(h: DbCard) {
    try {
      const parsed = JSON.parse(h.card_json)
      setOpenedCards(prev => {
        if (prev.some(c => c.id === h.id)) return prev
        return [...prev, { id: h.id, card: parsed }]
      })
      setSavedId(null)
      setError(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setError('Failed to parse card JSON')
    }
  }

  const canGenerate = (input.trim().length >= 3 || imageFile !== null || specs.trim().length >= 3) && !loading

  return (
    <div className='app'>
      <h1>CardForge</h1>
      <p className='sub'>Multimodal LLM → Structured JSON → Manual Review</p>

      <section className='panel'>
        <label>Product Description (optional)</label>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder='E.g., Men running t-shirt, breathable, lightweight...'
        />

        <label>Supplier Specs (optional, for exact data)</label>
        <textarea
          value={specs}
          onChange={e => setSpecs(e.target.value)}
          placeholder='Click chips below or type custom specs...'
          style={{ minHeight: '100px', marginBottom: '8px' }}
        />
        
        <div className="chips-section">
          <div className="chip-group">
            <span className="chip-label">Materials:</span>
            {MATERIALS.map(m => (
              <button key={m} className="chip" onClick={() => addSpec('Material', m)}>{m}</button>
            ))}
          </div>
          <div className="chip-group">
            <span className="chip-label">Origins:</span>
            {COUNTRIES.map(c => (
              <button key={c} className="chip" onClick={() => addSpec('Country', c)}>{c}</button>
            ))}
          </div>
          <div className="chip-group">
            <span className="chip-label">Brands:</span>
            {BRANDS.map(b => (
              <button key={b} className="chip" onClick={() => addSpec('Brand', b)}>{b}</button>
            ))}
          </div>
          <div className="chip-group">
            <span className="chip-label">Sizes:</span>
            {SIZES.map(s => (
              <button key={s} className="chip" onClick={() => addSpec('Size', s)}>{s}</button>
            ))}
          </div>
          <div className="chip-group">
            <span className="chip-label">Colors:</span>
            {COLORS.map(c => (
              <button key={c} className="chip" onClick={() => addSpec('Color', c)}>{c}</button>
            ))}
          </div>
        </div>
        
        <label>Product Image</label>
        <div 
          className={"drop-zone " + (isDragging ? "is-dragging" : "")}
          onDragEnter={handleDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <input 
            id="file-upload"
            type="file" 
            accept="image/*" 
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) validateAndSetFile(file)
            }} 
            style={{ display: 'none' }}
          />
          {imageFile ? (
            <p className="file-name">{imageFile.name}</p>
          ) : (
            <p>Drag & Drop your image here, or <strong>click to browse</strong></p>
          )}
          <p className="hint">Any format, up to 20MB. (Auto-optimized)</p>
        </div>

        <button onClick={onGenerate} disabled={!canGenerate}>
          {loading ? loadingText : 'Generate Card'}
        </button>
        {error && <div className='error'>Error: {error}</div>}
      </section>

      {openedCards.map(oc => (
        <section className='panel card-enter' key={oc.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ margin: 0 }}>Result (ID: {oc.id})</h2>
            <button 
              onClick={() => setOpenedCards(prev => prev.filter(c => c.id !== oc.id))} 
              className="btn-secondary"
            >
              Close
            </button>
          </div>

          <div className="photo-section">
            <button onClick={() => toggleImage(oc.id)} className="btn-toggle">
              {visibleImages.has(oc.id) ? 'Hide Photo' : 'Show Photo'}
            </button>
            <div className={`image-wrapper ${visibleImages.has(oc.id) ? 'expanded' : ''}`}>
              <img 
                src={"/api/images/" + oc.id + ".jpg"} 
                alt="Analyzed product" 
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
          </div>

          <label>Title</label>
          <input value={oc.card.title} onChange={e => updateCard(oc.id, 'title', e.target.value)} />
          
          <div className="attrs-grid">
            <div>
              <label>Brand</label>
              <input value={oc.card.brand || ''} onChange={e => updateCard(oc.id, 'brand', e.target.value)} />
            </div>
            <div>
              <label>Manufacturer</label>
              <input value={oc.card.manufacturer || ''} onChange={e => updateCard(oc.id, 'manufacturer', e.target.value)} />
            </div>
            <div>
              <label>Category</label>
              <input value={oc.card.category || ''} onChange={e => updateCard(oc.id, 'category', e.target.value)} />
            </div>
            <div>
              <label>Gender</label>
              <input value={oc.card.gender || ''} onChange={e => updateCard(oc.id, 'gender', e.target.value)} />
            </div>
            <div>
              <label>Material</label>
              <input value={oc.card.material || ''} onChange={e => updateCard(oc.id, 'material', e.target.value)} />
            </div>
            <div>
              <label>Care</label>
              <input value={oc.card.care || ''} onChange={e => updateCard(oc.id, 'care', e.target.value)} />
            </div>
            <div>
              <label>Country of Origin</label>
              <input value={oc.card.country_of_origin || ''} onChange={e => updateCard(oc.id, 'country_of_origin', e.target.value)} />
            </div>
            <div>
              <label>Size</label>
              <input value={oc.card.size || ''} onChange={e => updateCard(oc.id, 'size', e.target.value)} />
            </div>
            <div>
              <label>Color</label>
              <input value={oc.card.color || ''} onChange={e => updateCard(oc.id, 'color', e.target.value)} />
            </div>
          </div>

          <label>Description</label>
          <textarea value={oc.card.description} onChange={e => updateCard(oc.id, 'description', e.target.value)} />
          <label>Bullet Points (one per line)</label>
          <textarea
            value={oc.card.bullets.join('\n')}
            onChange={e => updateCard(oc.id, 'bullets', e.target.value.split('\n').filter(Boolean))}
          />
          <label>Tags (comma separated)</label>
          <input
            value={oc.card.tags.join(', ')}
            onChange={e => updateCard(oc.id, 'tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
          />
          <label>SEO Keywords (comma separated)</label>
          <input
            value={oc.card.seo_keywords.join(', ')}
            onChange={e => updateCard(oc.id, 'seo_keywords', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
          />
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
            <button onClick={() => onSave(oc.id, oc.card)} style={{ marginTop: 0 }}>Save Edits</button>
            <button 
              onClick={() => onEnhance(oc.id, oc.card)} 
              disabled={enhancingId === oc.id}
              style={{ marginTop: 0, background: '#8b5cf6' }}
            >
              {enhancingId === oc.id ? 'Enhancing...' : 'Update Card (AI)'}
            </button>
            {savedId === oc.id && <span className='ok'>Saved</span>}
          </div>
        </section>
      ))}

      {history.length > 0 && (
        <section className='panel'>
          <h2>History (Database)</h2>
          <ul style={{ paddingLeft: '0', listStyle: 'none', fontSize: '14px' }}>
            {history.map(h => {
              const parsed = JSON.parse(h.card_json)
              return (
                <li key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                  <div>
                    <strong>ID {h.id}:</strong> {parsed.title} {h.edited ? '(edited)' : ''} 
                    <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>{h.created_at}</span>
                  </div>
                  <div>
                    <button onClick={() => onLoadFromHistory(h)} className="btn-secondary" style={{ marginRight: '8px', padding: '4px 8px' }}>Load</button>
                    <button onClick={() => onDelete(h.id)} className="btn-danger" style={{ padding: '4px 8px' }}>Delete</button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}