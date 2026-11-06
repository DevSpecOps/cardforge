import { useState, useEffect, useMemo, useRef } from 'react'
import { generateCard, saveCard, enhanceCard, fetchHistory, deleteCard, uploadGallery, deleteGalleryImage, fetchSystemStatus, type ProductCard, type DbCard, type SystemStatus } from './api'

const MATERIALS = ['Cotton', 'Silk', 'Wool', 'Polyester', 'Leather', 'Linen', 'Denim', 'Velvet', 'Nylon', 'Rayon', 'Latex', 'Mesh', 'Fleece', 'Synthetic']
const BRANDS = ['Nike', 'Adidas', 'Zara', 'H&M', 'Uniqlo', 'Puma', 'Sportmaster', 'Demix', 'Reebok', 'Under Armour']
const SIZE_SYSTEMS = ['International', 'EU', 'RUS', 'CN', 'US', 'UK']
const COLORS = ['Black', 'White', 'Red', 'Blue', 'Green', 'Beige', 'Pink', 'Purple', 'Cyan', 'Multicolor', 'Navy', 'Grey', 'Brown', 'Yellow', 'Orange', 'Gold', 'Silver', 'Burgundy', 'Teal', 'Rose Gold', 'Khaki', 'Olive', 'Neon Green', 'Neon Pink', 'Camo', 'Charcoal', 'Maroon', 'Coral', 'Mint', 'Lavender']
const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Türkiye", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
]

const SIZE_OPTIONS: Record<string, string[]> = {
  'International': ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4XL', '5XL'],
  'RUS': ['40', '42', '44', '46', '48', '50', '52-54', '56-58', '60-62'],
  'EU': ['34', '36', '38', '40', '42', '44', '46', '48', '50'],
  'US': ['2', '4', '6', '8', '10', '12', '14', '16', '18'],
  'UK': ['6', '8', '10', '12', '14', '16', '18', '20', '22'],
  'CN': ['160/84A', '165/88A', '170/92A', '175/96A', '180/100A', '185/104A', '190/108A', '195/112A', '200/116A']
}

const SIZE_MAP: Record<string, Record<string, string>> = {
  'XS': { 'EU': '34', 'US': '2', 'UK': '6', 'RUS': '40', 'CN': '160/84A' },
  'S': { 'EU': '36', 'US': '4', 'UK': '8', 'RUS': '42', 'CN': '165/88A' },
  'M': { 'EU': '38', 'US': '6', 'UK': '10', 'RUS': '44', 'CN': '170/92A' },
  'L': { 'EU': '40', 'US': '8', 'UK': '12', 'RUS': '46', 'CN': '175/96A' },
  'XL': { 'EU': '42', 'US': '10', 'UK': '14', 'RUS': '48', 'CN': '180/100A' },
  'XXL': { 'EU': '44', 'US': '12', 'UK': '16', 'RUS': '50', 'CN': '185/104A' },
  'XXXL': { 'EU': '46', 'US': '14', 'UK': '18', 'RUS': '52-54', 'CN': '190/108A' },
  '4XL': { 'EU': '48', 'US': '16', 'UK': '20', 'RUS': '56-58', 'CN': '195/112A' },
  '5XL': { 'EU': '50', 'US': '18', 'UK': '22', 'RUS': '60-62', 'CN': '200/116A' }
}

const AutoResizeTextarea = ({ value, onChange, placeholder }: { value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, placeholder?: string }) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value]);
  return <textarea ref={ref} value={value} onChange={onChange} placeholder={placeholder} />;
};

export default function App() {
  const [input, setInput] = useState('')
  const [specs, setSpecs] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [galleryFiles, setGalleryFiles] = useState<File[]>([])
  const [openedCards, setOpenedCards] = useState<{ id: number, card: ProductCard }[]>([])
  const [loading, setLoading] = useState(false)
  const [enhancingId, setEnhancingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<number | null>(null)
  const [history, setHistory] = useState<DbCard[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  
  const [visibleImages, setVisibleImages] = useState<Set<number>>(new Set())
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  
  const isProcessing = loading || enhancingId !== null

  const historyBrands = useMemo(() => {
    const brands = history.map(h => JSON.parse(h.card_json).brand).filter(b => b && b !== 'Unknown')
    return Array.from(new Set([...BRANDS, ...brands]))
  }, [history])

  const historyManufacturers = useMemo(() => {
    const mans = history.map(h => JSON.parse(h.card_json).manufacturer).filter(m => m && m !== 'Unknown')
    return Array.from(new Set(mans))
  }, [history])

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
    async function checkStatus() {
      try {
        setSystemStatus(await fetchSystemStatus())
      } catch {
        setSystemStatus(null)
      }
    }
    checkStatus()
    const interval = setInterval(checkStatus, 5000)
    return () => clearInterval(interval)
  }, [])

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
    if (file) validateAndSetFile(file)
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
    setError(null)
    setSavedId(null)
    
    try {
      const combinedInput = input + (specs ? "\n\nSupplier Specs:\n" + specs : "")
      const res = await generateCard(combinedInput, imageFile, galleryFiles, "dummy_client_id")
      setOpenedCards([{ id: res.id, card: res.card }])
      setGalleryFiles([])
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
    setFieldErrors(prev => ({ ...prev, [key]: '' }))
    setSavedId(null)
  }

  function handleSizeSystemChange(id: number, card: ProductCard, newSystem: string) {
    let newSize = 'Unknown';
    if (newSystem === 'International' && card.size_system !== 'International') {
      for (const [intl, sysMap] of Object.entries(SIZE_MAP)) {
        if (sysMap[card.size_system] === card.size) {
          newSize = intl;
          break;
        }
      }
    } else if (card.size_system === 'International') {
      newSize = SIZE_MAP[card.size]?.[newSystem] || 'Unknown';
    }
    
    setOpenedCards(prev => prev.map(oc => 
      oc.id === id ? { ...oc, card: { ...oc.card, size_system: newSystem, size: newSize } } : oc
    ))
    setSavedId(null)
  }

  function validateCardFields(card: ProductCard): boolean {
    const errors: Record<string, string> = {}
    if (!COUNTRIES.includes(card.country_of_origin) && card.country_of_origin !== 'Unknown') {
      errors.country_of_origin = 'Invalid country. Select from the list.'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function onEnhance(id: number, card: ProductCard) {
    if (!validateCardFields(card)) return
    setEnhancingId(id)
    setError(null)
    
    try {
      const newCard = await enhanceCard(id, card, "dummy_client_id")
      setOpenedCards(prev => prev.map(oc => oc.id === id ? { ...oc, card: newCard } : oc))
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
    if (!validateCardFields(card)) return
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

  async function handleGalleryUpload(id: number, files: FileList | null) {
    if (!files || files.length === 0) return
    try {
      const newCard = await uploadGallery(id, Array.from(files))
      setOpenedCards(prev => prev.map(oc => oc.id === id ? { ...oc, card: newCard } : oc))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function handleGalleryDelete(id: number, filename: string) {
    try {
      await deleteGalleryImage(id, filename)
      setOpenedCards(prev => prev.map(oc => {
        if (oc.id !== id) return oc
        return { ...oc, card: { ...oc.card, gallery_images: oc.card.gallery_images.filter(f => f !== filename) } }
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  // ИСПРАВЛЕННЫЙ PDF (С картинкой)
  function downloadPDF(id: number) {
    const originalTitle = document.title;
    document.title = `CardForge_` + id;
    
    document.body.classList.add('printing-mode');
    const cardElement = document.getElementById(`card-` + id);
    if (cardElement) {
      cardElement.classList.add('printing-active');
    }
    
    setTimeout(() => {
      window.print();
      document.title = originalTitle;
      document.body.classList.remove('printing-mode');
      if (cardElement) cardElement.classList.remove('printing-active');
    }, 500);
  }

  const canGenerate = (input.trim().length >= 3 || imageFile !== null || specs.trim().length >= 3) && !isProcessing

  function renderSystemStatus() {
    if (!systemStatus) {
      return <div className="sys-status sys-status-error">System: backend unreachable</div>
    }
    if (systemStatus.ollama === 'disconnected') {
      return <div className="sys-status sys-status-error">Ollama: disconnected</div>
    }
    if (systemStatus.model === 'missing') {
      return <div className="sys-status sys-status-warn">Ollama: connected, model {systemStatus.model_name} not loaded</div>
    }
    return <div className="sys-status sys-status-ok">System: ready ({systemStatus.model_name} loaded)</div>
  }

  return (
    <div className='app'>
      {isProcessing && (
        <div className="loading-overlay no-print">
          <div className="loading-box">
            <div className="spinner"></div>
            <h2>{enhancingId ? 'Enhancing Card...' : 'Generating Card...'}</h2>
            <p style={{ marginTop: '16px', fontSize: '13px', color: '#666' }}>
              Processing with local AI. This may take up to 60 seconds on CPU.
            </p>
          </div>
        </div>
      )}

      <div className="no-print">
        <h1>CardForge</h1>
        <p className='sub'>Multimodal LLM → Structured JSON → Manual Review</p>

        <section className='panel'>
          <label>Product Description (optional)</label>
          <AutoResizeTextarea value={input} onChange={e => setInput(e.target.value)} placeholder='E.g., Men running t-shirt...' />

          <label>Supplier Specs (optional, for exact data)</label>
          <AutoResizeTextarea value={specs} onChange={e => setSpecs(e.target.value)} placeholder='Click chips below...' />
          
          <div className="chips-section">
            <div className="chip-group">
              <span className="chip-label">Materials:</span>
              {MATERIALS.map(m => <button key={m} className="chip" onClick={() => addSpec('Material', m)}>{m}</button>)}
            </div>
            <div className="chip-group">
              <span className="chip-label">Brands:</span>
              {BRANDS.map(b => <button key={b} className="chip" onClick={() => addSpec('Brand', b)}>{b}</button>)}
            </div>
          </div>
          
          <label>Product Image (analyzed by AI)</label>
          <div className={"drop-zone " + (isDragging ? "is-dragging" : "")} onDragEnter={handleDragOver} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => document.getElementById('file-upload')?.click()}>
            <input id="file-upload" type="file" accept="image/*" onChange={e => { const file = e.target.files?.[0]; if (file) validateAndSetFile(file) }} style={{ display: 'none' }} />
            {imageFile ? <p className="file-name">{imageFile.name}</p> : <p>Drag & Drop your image here, or <strong>click to browse</strong></p>}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '16px', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 auto' }}>
              <label style={{ marginTop: 0 }}>Additional Artifacts</label>
              <input type="file" multiple accept="image/*" onChange={e => setGalleryFiles(Array.from(e.target.files || []))} style={{ padding: '4px 0', display: 'block', width: '100%' }} />
              {galleryFiles.length > 0 && <div style={{ fontSize: '12px', color: 'green' }}>{galleryFiles.length} file(s) ready to upload.</div>}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '2px' }}>
              {renderSystemStatus()}
              <button onClick={onGenerate} disabled={!canGenerate} style={{ marginTop: 0 }}>{loading ? 'Generating...' : 'Generate Card'}</button>
            </div>
          </div>
          
          {error && <div className='error'>Error: {error}</div>}
        </section>
      </div>

      {openedCards.map(oc => (
        <section className='panel card-enter' key={oc.id} id={`card-${oc.id}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ margin: 0 }}>Result (ID: {oc.id})</h2>
            <div className="no-print" style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => downloadPDF(oc.id)} className="btn-secondary" style={{ background: '#e0f2fe', color: '#0369a1' }}>Download PDF</button>
              <button onClick={() => setOpenedCards(prev => prev.filter(c => c.id !== oc.id))} className="btn-secondary">Close</button>
            </div>
          </div>

          <div className="photo-section no-print">
            <button onClick={() => toggleImage(oc.id)} className="btn-toggle">{visibleImages.has(oc.id) ? 'Hide Photo' : 'Show Photo'}</button>
          </div>
          
          {/* ФОТО ТЕПЕРЬ БЕЗ no-print, ЧТОБЫ БЫЛО В PDF */}
          <div className={`image-wrapper ${visibleImages.has(oc.id) ? 'expanded' : ''}`}>
            <img src={"/api/images/" + oc.id + ".jpg"} alt="Analyzed product" style={{ display: 'block', maxHeight: '300px', marginBottom: '15px' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </div>

          <label>Title</label>
          <input value={oc.card.title} onChange={e => updateCard(oc.id, 'title', e.target.value)} />
          
          <div className="attrs-grid">
            <div>
              <label>Brand</label>
              <input value={oc.card.brand || ''} onChange={e => updateCard(oc.id, 'brand', e.target.value)} list="brand-options" />
              <datalist id="brand-options">{historyBrands.map(b => <option key={b} value={b} />)}</datalist>
            </div>
            <div>
              <label>Manufacturer</label>
              <input value={oc.card.manufacturer || ''} onChange={e => updateCard(oc.id, 'manufacturer', e.target.value)} list="manufacturer-options" />
              <datalist id="manufacturer-options">{historyManufacturers.map(m => <option key={m} value={m} />)}</datalist>
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
              <select 
                value={oc.card.material} 
                onChange={e => updateCard(oc.id, 'material', e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #d0d7de', borderRadius: '6px', background: '#fff' }}
              >
                <option value="Unknown">Unknown</option>
                {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label>Care</label>
              <input value={oc.card.care || ''} onChange={e => updateCard(oc.id, 'care', e.target.value)} />
            </div>
            <div>
              <label>Country of Origin</label>
              <select 
                value={oc.card.country_of_origin} 
                onChange={e => updateCard(oc.id, 'country_of_origin', e.target.value)}
                style={{ width: '100%', padding: '8px', border: fieldErrors.country_of_origin ? '2px solid red' : '1px solid #d0d7de', borderRadius: '6px' }}
              >
                <option value="Unknown">Unknown</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {fieldErrors.country_of_origin && <div style={{ color: 'red', fontSize: '11px', marginTop: '4px' }}>{fieldErrors.country_of_origin}</div>}
            </div>
            <div>
              <label>Size System</label>
              <select 
                value={oc.card.size_system} 
                onChange={e => handleSizeSystemChange(oc.id, oc.card, e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #d0d7de', borderRadius: '6px', background: '#fff' }}
              >
                {SIZE_SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label>Size</label>
              <select 
                value={oc.card.size} 
                onChange={e => updateCard(oc.id, 'size', e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #d0d7de', borderRadius: '6px', background: '#fff' }}
              >
                <option value="Unknown">Unknown</option>
                {SIZE_OPTIONS[oc.card.size_system]?.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label>Color</label>
              <input 
                value={oc.card.color || ''} 
                onChange={e => updateCard(oc.id, 'color', e.target.value)} 
                list="color-options"
                style={{ border: '1px solid #d0d7de' }}
              />
              <datalist id="color-options">{COLORS.map(c => <option key={c} value={c} />)}</datalist>
            </div>
          </div>

          <label>Description</label>
          <AutoResizeTextarea value={oc.card.description} onChange={e => updateCard(oc.id, 'description', e.target.value)} />
          
          <label>Bullet Points (one per line)</label>
          <AutoResizeTextarea value={oc.card.bullets.join('\n')} onChange={e => updateCard(oc.id, 'bullets', e.target.value.split('\n').filter(Boolean))} />
          
          <label>Tags (comma separated)</label>
          <input value={oc.card.tags.join(', ')} onChange={e => updateCard(oc.id, 'tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
          <label>SEO Keywords (comma separated)</label>
          <input value={oc.card.seo_keywords.join(', ')} onChange={e => updateCard(oc.id, 'seo_keywords', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
          
          <div style={{ marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
            <label className="no-print" style={{ fontSize: '14px' }}>Artifacts Gallery</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {oc.card.gallery_images?.map(g => (
                <div key={g} style={{ position: 'relative' }}>
                  <img src={"/api/images/" + g} alt="artifact" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #ddd' }} />
                  <button 
                    onClick={() => handleGalleryDelete(oc.id, g)} 
                    className="no-print"
                    style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '10px', cursor: 'pointer', padding: 0 }}
                  >X</button>
                </div>
              ))}
            </div>
            <input type="file" multiple accept="image/*" className="no-print" onChange={e => handleGalleryUpload(oc.id, e.target.files)} style={{ fontSize: '12px' }} />
          </div>

          <div className="no-print" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '16px' }}>
            <button onClick={() => onSave(oc.id, oc.card)} style={{ marginTop: 0 }}>Save Edits</button>
            <button onClick={() => onEnhance(oc.id, oc.card)} disabled={enhancingId === oc.id} style={{ marginTop: 0, background: '#8b5cf6' }}>
              {enhancingId === oc.id ? 'Enhancing...' : 'Update Card (AI)'}
            </button>
            {savedId === oc.id && <span className='ok'>Saved</span>}
          </div>
        </section>
      ))}

      {history.length > 0 && (
        <section className='panel no-print'>
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