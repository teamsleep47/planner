import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Edit2, Check, X, Shuffle, Brain, ChevronLeft, ChevronRight, Download, Upload, RotateCcw } from 'lucide-react'
import { load, save } from '../utils/storage.js'
import { createCard, reviewCard, getDueCards, parseCardText, exportCardText } from '../utils/srs.js'
import Tooltip from '../components/Tooltip.jsx'

const GRADES = [
  { key:0, label:'Again', color:'var(--coral)',  bg:'var(--coral-dim)',  tip:'Completely forgot — show again soon' },
  { key:1, label:'Hard',  color:'var(--amber)',  bg:'var(--amber-dim)',  tip:'Remembered with difficulty' },
  { key:2, label:'Good',  color:'var(--accent)', bg:'var(--accent-dim)', tip:'Remembered correctly' },
  { key:3, label:'Easy',  color:'var(--green)',  bg:'var(--green-dim)',  tip:'Remembered instantly — longer interval' },
]

function getCourseNames() {
  try {
    const terms = JSON.parse(localStorage.getItem('planner_v1_terms_v1')||'[]')
    const names = terms.flatMap(t=>t.courses.map(c=>c.name))
    return names.length > 0 ? names : ['Humanities','Written Communication','Anatomy & Physiology','A&P Lab','American Government']
  } catch(e) { return ['General'] }
}

export default function FlashcardsPage({ onDataChange }) {
  const [decks,      setDecks]      = useState(() => load('flashcard_decks', []))
  const [cards,      setCards]      = useState(() => load('flashcard_cards', []))
  const [activeDeck, setActiveDeck] = useState(null)
  const [mode,       setMode]       = useState('browse') // browse | study-srs | study-shuffle | add-deck | import
  const [studyQueue, setStudyQueue] = useState([])
  const [queueIdx,   setQueueIdx]   = useState(0)
  const [flipped,    setFlipped]    = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importMsg,  setImportMsg]  = useState('')
  const [newDeckName,setNewDeckName]= useState('')
  const [newDeckCourse,setNewDeckCourse]=useState('')
  const [addingCard, setAddingCard] = useState(false)
  const [newFront,   setNewFront]   = useState('')
  const [newBack,    setNewBack]    = useState('')
  const [editCardId, setEditCardId] = useState(null)
  const [editFront,  setEditFront]  = useState('')
  const [editBack,   setEditBack]   = useState('')
  const courses = getCourseNames()

  useEffect(() => { save('flashcard_decks', decks); onDataChange?.() }, [decks])
  useEffect(() => { save('flashcard_cards', cards); onDataChange?.() }, [cards])

  const deckCards  = activeDeck ? cards.filter(c=>c.deckId===activeDeck.id) : []
  const dueCards   = getDueCards(deckCards)
  const totalDecks = decks.length

  // ── Deck ops ──────────────────────────────────────
  const addDeck = () => {
    if (!newDeckName.trim()) return
    const deck = { id: Math.random().toString(36).slice(2,9), name: newDeckName.trim(), course: newDeckCourse || courses[0], created: new Date().toISOString() }
    setDecks(ds => [...ds, deck])
    setNewDeckName(''); setNewDeckCourse(''); setMode('browse')
  }
  const deleteDeck = id => {
    if (!confirm('Delete this deck and all its cards?')) return
    setDecks(ds => ds.filter(d => d.id!==id))
    setCards(cs => cs.filter(c => c.deckId!==id))
    if (activeDeck?.id === id) setActiveDeck(null)
  }

  // ── Card ops ──────────────────────────────────────
  const addCard = () => {
    if (!newFront.trim() || !newBack.trim() || !activeDeck) return
    setCards(cs => [...cs, createCard(newFront.trim(), newBack.trim(), activeDeck.id)])
    setNewFront(''); setNewBack(''); setAddingCard(false)
  }
  const deleteCard = id => setCards(cs => cs.filter(c => c.id!==id))
  const saveEditCard = () => {
    setCards(cs => cs.map(c => c.id===editCardId ? {...c, front:editFront, back:editBack} : c))
    setEditCardId(null)
  }

  // ── Import ────────────────────────────────────────
  const importCards = () => {
    if (!activeDeck) return
    const parsed = parseCardText(importText)
    if (!parsed.length) { setImportMsg('No valid cards found. Format: front > back (one per line)'); return }
    const newCards = parsed.map(({front,back}) => createCard(front, back, activeDeck.id))
    setCards(cs => [...cs, ...newCards])
    setImportMsg(`✓ Imported ${newCards.length} cards`)
    setImportText('')
    setTimeout(() => { setImportMsg(''); setShowImport(false) }, 2000)
  }

  const exportCards = () => {
    if (!deckCards.length) return
    const text = exportCardText(deckCards)
    const blob  = new Blob([text], {type:'text/plain'})
    const url   = URL.createObjectURL(blob)
    const a     = document.createElement('a')
    a.href = url; a.download = `${activeDeck.name}-cards.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Study session ─────────────────────────────────
  const startStudy = (studyMode) => {
    const queue = studyMode==='srs'
      ? [...dueCards]
      : [...deckCards].sort(()=>Math.random()-0.5)
    if (!queue.length) return
    setStudyQueue(queue)
    setQueueIdx(0)
    setFlipped(false)
    setMode(studyMode==='srs' ? 'study-srs' : 'study-shuffle')
  }

  const gradeCard = (grade) => {
    const card    = studyQueue[queueIdx]
    const updated = reviewCard(card, grade)
    setCards(cs => cs.map(c => c.id===card.id ? updated : c))
    if (queueIdx < studyQueue.length-1) {
      setQueueIdx(i => i+1); setFlipped(false)
    } else {
      setMode('browse')
    }
  }

  const inputStyle = { padding:'8px 11px', background:'var(--glass-bg-2)', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-md)', color:'var(--text-1)', fontSize:13, fontFamily:'inherit', width:'100%' }
  const isStudying = mode==='study-srs' || mode==='study-shuffle'
  const currentCard = isStudying ? studyQueue[queueIdx] : null
  const progress    = isStudying ? `${queueIdx+1} / ${studyQueue.length}` : ''

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Flashcards</div>
          <div className="page-subtitle">{totalDecks} deck{totalDecks!==1?'s':''} · {cards.length} cards total</div>
        </div>
        {!isStudying && (
          <button className="btn btn-primary" onClick={()=>setMode('add-deck')}><Plus size={14}/> New deck</button>
        )}
      </div>

      <div className="page-body" style={{display:'flex',flexDirection:'column',gap:20}}>

        {/* ── Study mode ── */}
        {isStudying && currentCard && (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16}}>
            {/* Progress */}
            <div style={{display:'flex',justifyContent:'space-between',width:'100%',maxWidth:560,alignItems:'center'}}>
              <button className="btn btn-ghost" onClick={()=>setMode('browse')} style={{fontSize:12,gap:6}}>
                <ChevronLeft size={13}/> Exit
              </button>
              <span style={{fontSize:13,color:'var(--text-3)',fontWeight:600}}>
                {mode==='study-srs'?'SRS Mode':'Shuffle Mode'} · {progress}
              </span>
              <div style={{width:80,height:4,borderRadius:2,background:'var(--glass-border)',overflow:'hidden'}}>
                <div style={{height:'100%',background:'var(--accent)',width:`${((queueIdx)/(studyQueue.length))*100}%`,transition:'width .3s'}}/>
              </div>
            </div>

            {/* Card */}
            <div onClick={()=>setFlipped(f=>!f)} style={{
              width:'100%', maxWidth:560, minHeight:260,
              background:'var(--glass-bg-2)',
              border:`2px solid ${flipped?'var(--accent)':'var(--glass-border)'}`,
              borderRadius:'var(--radius-xl)',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              cursor:'pointer', padding:'32px 28px', textAlign:'center',
              transition:'all .25s', boxShadow: flipped?'0 0 24px var(--accent-glow)':'none',
              position:'relative',
            }}>
              <div style={{fontSize:10,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.1em',position:'absolute',top:14,left:20}}>
                {flipped ? 'Answer' : 'Question'}
              </div>
              <div style={{fontSize:18,fontWeight:600,color:'var(--text-1)',lineHeight:1.5}}>
                {flipped ? currentCard.back : currentCard.front}
              </div>
              {!flipped && (
                <div style={{fontSize:12,color:'var(--text-3)',marginTop:16}}>Tap to reveal answer</div>
              )}
            </div>

            {/* Grade buttons */}
            {flipped && (
              <div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center'}}>
                {GRADES.map(g=>(
                  <Tooltip key={g.key} text={g.tip}>
                    <button onClick={()=>gradeCard(g.key)} style={{
                      padding:'10px 22px', borderRadius:'var(--radius-md)',
                      border:`2px solid ${g.color}`,
                      background:g.bg, color:g.color,
                      fontWeight:700, fontSize:14, cursor:'pointer',
                      transition:'all .15s',
                      boxShadow:`0 0 10px ${g.color}44`,
                    }}>{g.label}</button>
                  </Tooltip>
                ))}
              </div>
            )}

            {!flipped && (
              <button className="btn btn-ghost" onClick={()=>setFlipped(true)} style={{fontSize:13}}>
                Show answer
              </button>
            )}
          </div>
        )}

        {/* ── Browse mode ── */}
        {!isStudying && (
          <div style={{display:'grid',gridTemplateColumns:'240px 1fr',gap:20,alignItems:'start'}}>

            {/* Deck list */}
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div style={{fontSize:10,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:4}}>Your decks</div>

              {/* Add deck form */}
              {mode==='add-deck' && (
                <div className="card" style={{padding:'12px 14px',borderColor:'var(--accent)'}}>
                  <input style={inputStyle} placeholder="Deck name" value={newDeckName} onChange={e=>setNewDeckName(e.target.value)} autoFocus onKeyDown={e=>e.key==='Enter'&&addDeck()}/>
                  <select style={{...inputStyle,marginTop:8}} value={newDeckCourse} onChange={e=>setNewDeckCourse(e.target.value)}>
                    <option value="">Select course</option>
                    {courses.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                  <div style={{display:'flex',gap:6,marginTop:8}}>
                    <button className="btn btn-primary" onClick={addDeck} style={{flex:1,fontSize:12}}>Create</button>
                    <button className="btn btn-ghost" onClick={()=>setMode('browse')} style={{fontSize:12}}>Cancel</button>
                  </div>
                </div>
              )}

              {decks.length===0 && mode!=='add-deck' && (
                <div style={{fontSize:12,color:'var(--text-3)',padding:'12px 0'}}>No decks yet — create one to start</div>
              )}

              {decks.map(deck => {
                const dc    = cards.filter(c=>c.deckId===deck.id)
                const due   = getDueCards(dc).length
                const isAct = activeDeck?.id===deck.id
                return (
                  <div key={deck.id} onClick={()=>setActiveDeck(deck)} style={{
                    padding:'11px 12px', borderRadius:'var(--radius-md)',
                    background: isAct?'var(--accent-dim)':'var(--glass-bg)',
                    border:`1px solid ${isAct?'var(--accent)':'var(--glass-border)'}`,
                    cursor:'pointer', transition:'all .15s',
                    boxShadow: isAct?'0 0 10px var(--accent-glow)':'none',
                  }}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontWeight:600,fontSize:13,color:isAct?'var(--accent)':'var(--text-1)'}}>{deck.name}</span>
                      <button onClick={e=>{e.stopPropagation();deleteDeck(deck.id)}} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',padding:2,opacity:.6}}>
                        <Trash2 size={11}/>
                      </button>
                    </div>
                    <div style={{fontSize:11,color:'var(--text-3)',marginTop:3}}>
                      {deck.course} · {dc.length} cards
                      {due>0&&<span style={{color:'var(--amber)',fontWeight:700,marginLeft:6}}>{due} due</span>}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Deck detail */}
            {activeDeck ? (
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                {/* Deck header */}
                <div className="card" style={{padding:'14px 18px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:16}}>{activeDeck.name}</div>
                      <div style={{fontSize:12,color:'var(--text-3)'}}>{activeDeck.course} · {deckCards.length} cards · {dueCards.length} due today</div>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <Tooltip text="Study with spaced repetition — shows due cards only">
                        <button className="btn btn-primary" onClick={()=>startStudy('srs')} disabled={!dueCards.length} style={{gap:6,fontSize:12}}>
                          <Brain size={13}/> SRS ({dueCards.length})
                        </button>
                      </Tooltip>
                      <Tooltip text="Shuffle all cards randomly">
                        <button className="btn btn-ghost" onClick={()=>startStudy('shuffle')} disabled={!deckCards.length} style={{gap:6,fontSize:12}}>
                          <Shuffle size={13}/> Shuffle
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <Tooltip text="Import cards from text — one card per line: front > back">
                      <button className="btn btn-ghost" onClick={()=>setShowImport(s=>!s)} style={{fontSize:11,gap:5}}><Upload size={12}/> Import</button>
                    </Tooltip>
                    <Tooltip text="Export cards as text file">
                      <button className="btn btn-ghost" onClick={exportCards} style={{fontSize:11,gap:5}}><Download size={12}/> Export</button>
                    </Tooltip>
                    <Tooltip text="Add a new card to this deck">
                      <button className="btn btn-ghost" onClick={()=>setAddingCard(s=>!s)} style={{fontSize:11,gap:5}}><Plus size={12}/> Add card</button>
                    </Tooltip>
                  </div>
                </div>

                {/* Import box */}
                {showImport && (
                  <div className="card" style={{borderColor:'var(--accent)'}}>
                    <div className="card-title">Import cards — one per line: <code style={{fontSize:11}}>front {'>'} back</code></div>
                    <textarea className="inline-input" rows={6} value={importText} onChange={e=>setImportText(e.target.value)}
                      placeholder={"What is the axial skeleton? > Skull, vertebral column, and rib cage\nWhat does ATP stand for? > Adenosine triphosphate"} style={{fontSize:12,resize:'vertical',fontFamily:'var(--font-mono)'}}/>
                    {importMsg && <div style={{fontSize:12,color:'var(--green)',marginTop:6,fontWeight:600}}>{importMsg}</div>}
                    <div style={{display:'flex',gap:8,marginTop:10}}>
                      <button className="btn btn-primary" onClick={importCards} style={{fontSize:12}}>Import {parseCardText(importText).length} cards</button>
                      <button className="btn btn-ghost" onClick={()=>{setShowImport(false);setImportText('');setImportMsg('')}} style={{fontSize:12}}>Cancel</button>
                    </div>
                  </div>
                )}

                {/* Add card form */}
                {addingCard && (
                  <div className="card" style={{borderColor:'var(--accent)'}}>
                    <div className="card-title">New card</div>
                    <textarea className="inline-input" rows={2} placeholder="Front (question)" value={newFront} onChange={e=>setNewFront(e.target.value)} style={{fontSize:13,resize:'vertical',marginBottom:8}} autoFocus/>
                    <textarea className="inline-input" rows={2} placeholder="Back (answer)" value={newBack} onChange={e=>setNewBack(e.target.value)} style={{fontSize:13,resize:'vertical',marginBottom:10}} onKeyDown={e=>e.key==='Enter'&&e.metaKey&&addCard()}/>
                    <div style={{display:'flex',gap:8}}>
                      <button className="btn btn-primary" onClick={addCard} style={{flex:1,fontSize:12}}>Add card</button>
                      <button className="btn btn-ghost" onClick={()=>{setAddingCard(false);setNewFront('');setNewBack('')}} style={{fontSize:12}}>Cancel</button>
                    </div>
                  </div>
                )}

                {/* Card list */}
                {deckCards.length===0 ? (
                  <div className="card" style={{textAlign:'center',padding:'32px',color:'var(--text-3)'}}>
                    No cards yet — add one or import from text
                  </div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {deckCards.map(card => (
                      <div key={card.id} className="card" style={{padding:'12px 14px'}}>
                        {editCardId===card.id ? (
                          <div>
                            <textarea className="inline-input" rows={2} value={editFront} onChange={e=>setEditFront(e.target.value)} style={{fontSize:12,resize:'vertical',marginBottom:6}} autoFocus/>
                            <textarea className="inline-input" rows={2} value={editBack}  onChange={e=>setEditBack(e.target.value)}  style={{fontSize:12,resize:'vertical',marginBottom:8}}/>
                            <div style={{display:'flex',gap:6}}>
                              <button className="btn btn-primary" onClick={saveEditCard} style={{fontSize:11}}>Save</button>
                              <button className="btn btn-ghost" onClick={()=>setEditCardId(null)} style={{fontSize:11}}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:13,fontWeight:600,color:'var(--text-1)',marginBottom:4}}>{card.front}</div>
                              <div style={{fontSize:12,color:'var(--text-2)',borderTop:'1px solid var(--glass-border)',paddingTop:4}}>{card.back}</div>
                              <div style={{fontSize:10,color:'var(--text-3)',marginTop:5,display:'flex',gap:10}}>
                                <span>Next: {card.nextReview}</span>
                                <span>Interval: {card.interval}d</span>
                                <span>Reps: {card.repetitions}</span>
                              </div>
                            </div>
                            <div style={{display:'flex',gap:4,flexShrink:0}}>
                              <Tooltip text="Edit card">
                                <button className="btn-icon" style={{padding:4}} onClick={()=>{setEditCardId(card.id);setEditFront(card.front);setEditBack(card.back)}}><Edit2 size={11}/></button>
                              </Tooltip>
                              <Tooltip text="Delete card">
                                <button className="btn-icon" style={{padding:4,color:'var(--coral)'}} onClick={()=>deleteCard(card.id)}><Trash2 size={11}/></button>
                              </Tooltip>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{textAlign:'center',padding:'48px',color:'var(--text-3)'}}>
                <Brain size={32} style={{margin:'0 auto 12px',opacity:.3}}/>
                <div style={{fontWeight:600,marginBottom:6}}>Select a deck to study</div>
                <div style={{fontSize:13}}>Or create a new deck to get started</div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
