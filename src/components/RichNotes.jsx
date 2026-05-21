import { useState, useRef, useEffect } from 'react'
import { Bold, Italic, Underline, List, ListOrdered, Minus, Eye, Edit3 } from 'lucide-react'
import BottomSheet from './BottomSheet.jsx'

const IS_MOBILE = () => window.innerWidth <= 768

// Simple markdown renderer
function renderMarkdown(text) {
  if (!text) return ''
  let html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Underline
    .replace(/__(.*?)__/g, '<u>$1</u>')
    // Bullet lists
    .split('\n').map(line => {
      if (line.match(/^[-*] /)) return `<li>${line.slice(2)}</li>`
      if (line.match(/^\d+\. /)) return `<li>${line.replace(/^\d+\. /, '')}</li>`
      if (line === '') return '<br/>'
      return line
    }).join('\n')
    // Wrap consecutive li items in ul
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul style="margin:4px 0;padding-left:18px">${m}</ul>`)
  return html
}

function Toolbar({ onFormat }) {
  const btn = (icon, action, tip) => (
    <button type="button" title={tip} onClick={()=>onFormat(action)} style={{
      background:'none', border:'1px solid var(--glass-border)', borderRadius:4,
      color:'var(--text-2)', cursor:'pointer', padding:'3px 6px', display:'flex',
      alignItems:'center', transition:'all .15s',
    }}
    onMouseEnter={e=>{e.currentTarget.style.background='var(--accent-dim)';e.currentTarget.style.borderColor='var(--accent)'}}
    onMouseLeave={e=>{e.currentTarget.style.background='none';e.currentTarget.style.borderColor='var(--glass-border)'}}
    >{icon}</button>
  )
  return (
    <div style={{display:'flex',gap:4,padding:'6px 8px',borderBottom:'1px solid var(--glass-border)',flexWrap:'wrap',background:'var(--glass-bg)'}}>
      {btn(<Bold size={12}/>,'bold','Bold (**text**)')}
      {btn(<Italic size={12}/>,'italic','Italic (*text*)')}
      {btn(<Underline size={12}/>,'underline','Underline (__text__)')}
      {btn(<List size={12}/>,'bullet','Bullet list')}
      {btn(<ListOrdered size={12}/>,'numbered','Numbered list')}
      {btn(<Minus size={12}/>,'divider','Divider line')}
    </div>
  )
}

function applyFormat(textarea, action) {
  const start = textarea.selectionStart
  const end   = textarea.selectionEnd
  const sel   = textarea.value.slice(start, end)
  const before= textarea.value.slice(0, start)
  const after = textarea.value.slice(end)
  let insert = '', cursorOffset = 0

  switch(action) {
    case 'bold':     insert = `**${sel||'bold text'}**`; cursorOffset = sel?0:2; break
    case 'italic':   insert = `*${sel||'italic text'}*`; cursorOffset = sel?0:1; break
    case 'underline':insert = `__${sel||'underlined'}__`; cursorOffset = sel?0:2; break
    case 'bullet':   insert = `\n- ${sel||'item'}`; cursorOffset = sel?0:0; break
    case 'numbered': insert = `\n1. ${sel||'item'}`; cursorOffset = sel?0:0; break
    case 'divider':  insert = '\n---\n'; cursorOffset = 0; break
  }

  const newVal = before + insert + after
  const newPos = start + insert.length - cursorOffset
  return { newVal, newPos }
}

export default function RichNotes({ value, onChange, placeholder='Add notes…', title='Notes', compact=false }) {
  const [mode,     setMode]     = useState('preview') // preview | edit
  const [draft,    setDraft]    = useState(value||'')
  const [sheet,    setSheet]    = useState(false)
  const textareaRef = useRef(null)
  const mobile = IS_MOBILE()

  useEffect(()=>{ setDraft(value||'') }, [value])

  useEffect(()=>{
    if (mode==='edit' && textareaRef.current) {
      const el = textareaRef.current
      el.style.height = 'auto'
      el.style.height = Math.max(el.scrollHeight, 80) + 'px'
      el.focus()
    }
  }, [mode])

  const save   = () => { onChange(draft); setMode('preview') }
  const cancel = () => { setDraft(value||''); setMode('preview') }

  const handleFormat = (action) => {
    if (!textareaRef.current) return
    const { newVal, newPos } = applyFormat(textareaRef.current, action)
    setDraft(newVal)
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newPos, newPos)
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = Math.max(textareaRef.current.scrollHeight, 80) + 'px'
      }
    }, 0)
  }

  const preview  = value?.trim()
  const previewHtml = renderMarkdown(preview||'')

  // Mobile — button opens full-screen bottom sheet
  if (mobile) {
    return (
      <>
        <button onClick={()=>{ setDraft(value||''); setSheet(true) }} style={{
          display:'flex', alignItems:'center', gap:8, width:'100%',
          padding:'8px 10px', background: preview?'var(--glass-bg-2)':'var(--glass-bg)',
          border:'1px solid var(--glass-border)', borderRadius:'var(--radius-md)',
          cursor:'pointer', textAlign:'left',
        }}>
          <Edit3 size={13} style={{color:preview?'var(--accent)':'var(--text-3)',flexShrink:0}}/>
          <span style={{fontSize:12,color:preview?'var(--text-2)':'var(--text-3)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {preview ? preview.slice(0,60)+(preview.length>60?'…':'') : placeholder}
          </span>
          <span style={{fontSize:10,color:'var(--accent)',fontWeight:600,flexShrink:0}}>{preview?'Edit ›':'Add ›'}</span>
        </button>

        <BottomSheet open={sheet} onClose={()=>{ onChange(draft); setSheet(false) }} title={title}>
          <Toolbar onFormat={handleFormat}/>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e=>setDraft(e.target.value)}
            placeholder={placeholder}
            rows={12}
            className="inline-input"
            style={{fontSize:14,resize:'none',lineHeight:1.7,width:'100%',fontFamily:'inherit',marginTop:8}}
            autoFocus
          />
          <div style={{display:'flex',gap:10,marginTop:12}}>
            <button className="btn btn-primary" onClick={()=>{ onChange(draft); setSheet(false) }} style={{flex:1}}>Save</button>
            <button className="btn btn-ghost" onClick={()=>{ setDraft(value||''); setSheet(false) }}>Cancel</button>
          </div>
        </BottomSheet>
      </>
    )
  }

  // Desktop preview mode
  if (mode==='preview') {
    return (
      <div onClick={()=>setMode('edit')} style={{
        padding:'8px 10px', borderRadius:'var(--radius-md)',
        background:'var(--glass-bg)', border:'1px solid var(--glass-border)',
        cursor:'text', minHeight:36, transition:'border-color .15s',
        position:'relative',
      }}
      onMouseEnter={e=>e.currentTarget.style.borderColor='var(--accent)'}
      onMouseLeave={e=>e.currentTarget.style.borderColor='var(--glass-border)'}
      >
        {preview ? (
          <div style={{fontSize:12,color:'var(--text-2)',lineHeight:1.6}}
            dangerouslySetInnerHTML={{__html: previewHtml}}/>
        ) : (
          <span style={{fontSize:12,color:'var(--text-3)'}}>{placeholder}</span>
        )}
        <span style={{position:'absolute',top:8,right:10,fontSize:10,color:'var(--accent)',fontWeight:600,opacity:.7}}>
          {preview?'Edit':'+ Add'}
        </span>
      </div>
    )
  }

  // Desktop edit mode
  return (
    <div style={{borderRadius:'var(--radius-md)',border:'1px solid var(--accent)',overflow:'hidden'}}>
      <Toolbar onFormat={handleFormat}/>
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={e=>{
          setDraft(e.target.value)
          e.target.style.height='auto'
          e.target.style.height=Math.max(e.target.scrollHeight,80)+'px'
        }}
        placeholder={placeholder}
        className="inline-input"
        style={{fontSize:12,resize:'none',lineHeight:1.6,width:'100%',overflow:'hidden',minHeight:80,borderRadius:0,border:'none'}}
        onKeyDown={e=>{ if(e.key==='Escape') cancel() }}
      />
      <div style={{display:'flex',gap:6,padding:'6px 8px',borderTop:'1px solid var(--glass-border)',background:'var(--glass-bg)'}}>
        <button className="btn btn-primary" onClick={save} style={{fontSize:11,padding:'4px 12px'}}>Save</button>
        <button className="btn btn-ghost" onClick={cancel} style={{fontSize:11,padding:'4px 12px'}}>Cancel</button>
        <span style={{fontSize:10,color:'var(--text-3)',alignSelf:'center',marginLeft:4}}>Supports **bold**, *italic*, __underline__, - bullets</span>
      </div>
    </div>
  )
}
