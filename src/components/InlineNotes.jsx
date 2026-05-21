// InlineNotes is now a thin wrapper around RichNotes
// Kept for backward compatibility
import RichNotes from './RichNotes.jsx'

export default function InlineNotes({ value, onChange, placeholder, title }) {
  return <RichNotes value={value} onChange={onChange} placeholder={placeholder||'Add notes…'} title={title||'Notes'}/>
}
