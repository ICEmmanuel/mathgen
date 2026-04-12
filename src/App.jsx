import React, { useState, useRef } from 'react'

/* ─── Constants ─────────────────────────────────────────── */
const QUICK_TOPICS = [
  'Quadratic equations', 'Trigonometry', 'Differentiation', 'Integration',
  'Probability', 'Matrices', 'Sequences & series', 'Logarithms',
  'Vectors', 'Statistics', 'Linear algebra', 'Number theory',
  'Complex numbers', 'Binomial theorem', 'Coordinate geometry',
  'Circle theorems', 'Surds & indices', 'Simultaneous equations',
]

const LEVELS = [
  'Primary (age 9–12)',
  'Junior Secondary (JSS 1–3)',
  'Senior Secondary (SSS 1–3)',
  'University / A-Level',
  'Olympiad / Competition',
]

const DIFFICULTIES = [
  { value: 'mixed (easy, medium, and hard)', label: 'Mixed' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'very hard / competition level', label: 'Very Hard' },
]

const TYPES = [
  { value: 'mixed (word problems, calculations, proofs, multi-step)', label: 'Mixed types' },
  { value: 'word problems only', label: 'Word problems' },
  { value: 'pure calculation', label: 'Pure calculation' },
  { value: 'proof / show that', label: 'Proof / Show that' },
  { value: 'multi-step / structured', label: 'Multi-step structured' },
  { value: 'multiple choice (4 options A–D)', label: 'Multiple choice' },
]

const COUNTS = [3, 5, 8, 10, 15, 20]

const ANSWERS = [
  { value: 'yes', label: 'Full working & answer' },
  { value: 'brief', label: 'Final answer only' },
  { value: 'no', label: 'No answers' },
]

/* ─── Helpers ───────────────────────────────────────────── */
function diffBadge(diff = '') {
  const d = diff.toLowerCase()
  if (d.includes('very') || d.includes('competition')) return { bg: '#fce8e6', color: '#c62828', label: diff }
  if (d.includes('hard')) return { bg: '#fff3e0', color: '#bf360c', label: diff }
  if (d.includes('medium')) return { bg: '#fef9e5', color: '#e65100', label: diff }
  if (d.includes('easy')) return { bg: '#e6f4ea', color: '#1b5e20', label: diff }
  return { bg: '#f1f3f4', color: '#5f6368', label: diff || 'General' }
}

/* ─── QuestionCard ──────────────────────────────────────── */
function QuestionCard({ q, idx, showAns }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const b = diffBadge(q.difficulty)
  const hasAnswer = showAns && q.answer && q.answer !== 'null'

  const copy = () => {
    navigator.clipboard.writeText(q.question)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="q-card" style={{
      background: 'white',
      border: '1px solid #e8eaed',
      borderRadius: 12,
      padding: '1rem 1.25rem',
      position: 'relative',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#1a73e8', minWidth: 26 }}>Q{idx + 1}</span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: b.bg, color: b.color }}>{b.label}</span>
        {q.type && <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 999, background: '#e8f0fe', color: '#1557b0' }}>{q.type}</span>}
        {q.marks && <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: '#f1f3f4', color: '#5f6368' }}>{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>}
        <button onClick={copy} style={{
          marginLeft: 'auto', background: 'none', border: '1px solid #dadce0',
          borderRadius: 6, padding: '3px 10px', fontSize: 12, color: '#5f6368', cursor: 'pointer'
        }}>{copied ? '✓ Copied' : 'Copy'}</button>
      </div>

      {/* Question text */}
      <p style={{ fontSize: 15, lineHeight: 1.7, color: '#202124' }}>{q.question}</p>

      {/* Answer toggle */}
      {hasAnswer && (
        <div style={{ marginTop: 10 }}>
          <button onClick={() => setOpen(o => !o)} style={{
            background: 'none', border: 'none', color: '#1a73e8',
            fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: 0
          }}>
            {open ? '▾ Hide answer' : '▸ Show answer'}
          </button>
          {open && (
            <div style={{ marginTop: 8, background: '#f8f9fa', border: '1px solid #e8eaed', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#80868b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Answer / working</div>
              <p style={{ fontSize: 14, color: '#3c4043', lineHeight: 1.65 }}>{q.answer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── App ───────────────────────────────────────────────── */
export default function App() {
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState(LEVELS[2])
  const [difficulty, setDifficulty] = useState(DIFFICULTIES[0].value)
  const [count, setCount] = useState(5)
  const [type, setType] = useState(TYPES[0].value)
  const [includeAnswers, setIncludeAnswers] = useState('yes')
  const [loading, setLoading] = useState(false)
  const [questions, setQuestions] = useState([])
  const [error, setError] = useState('')
  const [meta, setMeta] = useState(null)
  const outputRef = useRef(null)

  const generate = async () => {
    if (!topic.trim()) { setError('Please enter a topic first.'); return }
    setError(''); setLoading(true); setQuestions([])
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), level, difficulty, count, type, includeAnswers })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setQuestions(data.questions)
      setMeta({ topic: topic.trim(), level, count: data.questions.length, date: new Date().toLocaleDateString() })
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const exportTxt = () => {
    let out = `MATHEMATICS QUESTIONS\n`
    out += `Topic: ${meta.topic}  |  Level: ${meta.level}  |  Date: ${meta.date}\n`
    out += '='.repeat(64) + '\n\n'
    questions.forEach((q, i) => {
      out += `${i + 1}. [${q.marks || '?'} marks] ${q.question}\n\n`
    })
    if (includeAnswers !== 'no') {
      out += '\n' + '='.repeat(64) + '\nANSWERS & WORKED SOLUTIONS\n' + '='.repeat(64) + '\n\n'
      questions.forEach((q, i) => {
        if (q.answer && q.answer !== 'null') out += `${i + 1}. ${q.answer}\n\n`
      })
    }
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([out], { type: 'text/plain' })),
      download: `mathgen-${meta.topic.replace(/\s+/g, '-').toLowerCase()}.txt`
    })
    a.click()
  }

  const totalMarks = questions.reduce((s, q) => s + (q.marks || 0), 0)

  const sel = (val, list) => ({
    padding: '8px 10px', border: '1px solid #dadce0', borderRadius: 8,
    fontSize: 13, color: '#202124', background: 'white',
    outline: 'none', cursor: 'pointer', width: '100%'
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Navbar ─────────────────────────────────── */}
      <nav className="no-print" style={{
        background: 'white', borderBottom: '1px solid #e8eaed',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: 920, margin: '0 auto', padding: '0 1rem', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: '#1a73e8', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20, fontWeight: 700 }}>∑</div>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#202124' }}>MathGen</span>
            <span style={{ fontSize: 12, background: '#e6f4ea', color: '#1b5e20', padding: '3px 10px', borderRadius: 999, fontWeight: 600 }}>100% Free</span>
          </div>
          <span style={{ fontSize: 12, color: '#80868b' }}>Powered by Google Gemini</span>
        </div>
      </nav>

      {/* ── Main ───────────────────────────────────── */}
      <main style={{ flex: 1, maxWidth: 920, margin: '0 auto', padding: '2rem 1rem 4rem', width: '100%' }}>

        {/* Hero */}
        <div className="no-print" style={{ textAlign: 'center', padding: '2rem 0 1.75rem' }}>
          <h1 style={{ fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: 700, color: '#202124', lineHeight: 1.2, marginBottom: 10 }}>
            Complex math questions, generated free
          </h1>
          <p style={{ fontSize: 16, color: '#5f6368', maxWidth: 520, margin: '0 auto' }}>
            Enter any topic — get exam-ready, curriculum-aligned questions with full worked solutions. Powered by Google Gemini AI, forever free.
          </p>
        </div>

        {/* ── Form card ──────────────────────────── */}
        <div className="no-print" style={{ background: 'white', border: '1px solid #e8eaed', borderRadius: 14, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '1.5rem' }}>

          {/* Quick topics */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#80868b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Quick topics</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {QUICK_TOPICS.map(t => (
                <button key={t} onClick={() => setTopic(t)} style={{
                  background: topic === t ? '#e8f0fe' : '#f8f9fa',
                  border: `1px solid ${topic === t ? '#1a73e8' : '#e8eaed'}`,
                  color: topic === t ? '#1557b0' : '#3c4043',
                  borderRadius: 999, padding: '5px 13px', fontSize: 13, transition: 'all 0.12s'
                }}>{t}</button>
              ))}
            </div>
          </div>

          {/* Topic input */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#80868b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>Topic / subject area</label>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generate()}
              placeholder="e.g. Integration by parts, Circle theorems, Binomial distribution..."
              style={{
                width: '100%', padding: '11px 14px', border: `1.5px solid ${topic ? '#1a73e8' : '#dadce0'}`,
                borderRadius: 8, fontSize: 15, color: '#202124', outline: 'none',
                transition: 'border-color 0.15s', boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Config grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: '1.25rem' }}>
            {[
              { label: 'Education level', value: level, onChange: e => setLevel(e.target.value), options: LEVELS.map(l => ({ value: l, label: l })) },
              { label: 'Difficulty', value: difficulty, onChange: e => setDifficulty(e.target.value), options: DIFFICULTIES },
              { label: 'No. of questions', value: count, onChange: e => setCount(Number(e.target.value)), options: COUNTS.map(c => ({ value: c, label: `${c} questions` })) },
              { label: 'Question type', value: type, onChange: e => setType(e.target.value), options: TYPES },
              { label: 'Answers', value: includeAnswers, onChange: e => setIncludeAnswers(e.target.value), options: ANSWERS },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#80868b', marginBottom: 5 }}>{f.label}</div>
                <select value={f.value} onChange={f.onChange} style={sel()}>
                  {f.options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
                </select>
              </div>
            ))}
          </div>

          {error && <div style={{ background: '#fce8e6', color: '#c62828', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>{error}</div>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={generate} disabled={loading} style={{
              background: loading ? '#80868b' : '#1a73e8', color: 'white',
              border: 'none', borderRadius: 8, padding: '11px 28px',
              fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.15s', minWidth: 190
            }}>
              {loading ? (
                <>
                  <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                  Generating…
                </>
              ) : 'Generate questions'}
            </button>
            <span style={{ fontSize: 12, color: '#9aa0a6' }}>Press Enter in topic field to generate</span>
          </div>
        </div>

        {/* ── Loading ─────────────────────────────── */}
        {loading && (
          <div style={{ background: 'white', border: '1px solid #e8eaed', borderRadius: 12, padding: '1.5rem', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{ width: 30, height: 30, border: '3px solid #e8eaed', borderTopColor: '#1a73e8', borderRadius: '50%', flexShrink: 0, animation: 'spin 0.7s linear infinite' }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#202124', marginBottom: 2 }}>Generating questions…</div>
              <div style={{ fontSize: 13, color: '#80868b' }}>Creating complex, non-trivial problems for "{topic}"</div>
            </div>
          </div>
        )}

        {/* ── Results ─────────────────────────────── */}
        {questions.length > 0 && !loading && (
          <div ref={outputRef}>
            {/* Toolbar */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#202124' }}>{meta.count} questions · {meta.topic}</div>
                <div style={{ fontSize: 13, color: '#80868b', marginTop: 2 }}>{meta.level} · {totalMarks} total marks · {meta.date}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={generate} style={{ background: 'white', border: '1px solid #dadce0', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#3c4043', cursor: 'pointer' }}>↺ Regenerate</button>
                <button onClick={exportTxt} style={{ background: 'white', border: '1px solid #dadce0', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#3c4043', cursor: 'pointer' }}>↓ Export .txt</button>
                <button onClick={() => window.print()} style={{ background: '#202124', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>⎙ Print</button>
              </div>
            </div>

            {/* Print header */}
            <div className="print-show" style={{ display: 'none', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: 20, marginBottom: 4 }}>Mathematics Questions — {meta?.topic}</h2>
              <p style={{ fontSize: 13, color: '#555' }}>Level: {meta?.level} &nbsp;|&nbsp; Total marks: {totalMarks} &nbsp;|&nbsp; Date: {meta?.date}</p>
              <hr style={{ marginTop: 10 }} />
            </div>

            {/* Question list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {questions.map((q, i) => (
                <QuestionCard key={i} q={q} idx={i} showAns={includeAnswers !== 'no'} />
              ))}
            </div>

            {/* Bottom bar */}
            <div className="no-print" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#e8f0fe', borderRadius: 10, flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 14, color: '#1557b0' }}>
                <strong>{meta.count} questions</strong> · <strong>{totalMarks} marks</strong> total
              </span>
              <button onClick={generate} style={{ background: '#1a73e8', color: 'white', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Generate new set ↺
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {questions.length === 0 && !loading && (
          <div className="no-print" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <div style={{ fontSize: 52, color: '#dadce0', marginBottom: 14 }}>∫</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#9aa0a6', marginBottom: 4 }}>No questions yet</div>
            <div style={{ fontSize: 14, color: '#dadce0' }}>Pick a topic above and hit "Generate questions"</div>
          </div>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────── */}
      <footer className="no-print" style={{ borderTop: '1px solid #e8eaed', padding: '1.1rem', textAlign: 'center', fontSize: 13, color: '#9aa0a6' }}>
        MathGen · AI Mathematics Question Generator · 100% free, powered by Google Gemini · Built for teachers everywhere
      </footer>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 600px) {
          input, select, button { font-size: 14px !important; }
        }
      `}</style>
    </div>
  )
}
