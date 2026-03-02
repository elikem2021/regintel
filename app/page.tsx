'use client'
import { useState, useEffect, useCallback } from 'react'

interface Recall {
  id: string; recalling_firm: string; product_description: string
  reason_for_recall: string; classification: string; status: string
  recall_initiation_date: string; state: string; country: string
  voluntary_mandated: string; domain?: string
}
interface Contact {
  email: string; first_name: string; last_name: string; position: string
  department: string; seniority: string; confidence: number
  linkedin?: string; verification?: { status: string }
}
interface HunterResult { emails: Contact[]; organization: string; pattern: string; total: number }

const CLASS_MAP: Record<string, { label: string; cls: string }> = {
  'Class I': { label: 'CLASS I', cls: 'badge-high' },
  'Class II': { label: 'CLASS II', cls: 'badge-medium' },
  'Class III': { label: 'CLASS III', cls: 'badge-low' },
}
const DEPT_PRIORITY = ['executive', 'management', 'food_safety', 'quality', 'operations', 'regulatory']

function formatDate(d: string) {
  if (!d) return '—'
  const s = d.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function extractDomain(firm: string) {
  return firm.toLowerCase().replace(/\b(inc|llc|ltd|corp|co|company|foods|food|group|international|enterprises|holdings|usa|us)\b/gi,'').replace(/[^a-z0-9\s]/g,'').trim().split(/\s+/)[0] + '.com'
}
function getDaysAgo(d: string) {
  const s = d.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')
  return Math.floor((Date.now() - new Date(s).getTime()) / 86400000)
}

export default function Dashboard() {
  const [recalls, setRecalls] = useState<Recall[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Recall | null>(null)
  const [contacts, setContacts] = useState<HunterResult | null>(null)
  const [contactsLoading, setContactsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [classFilter, setClassFilter] = useState<string>('all')
  const [panel, setPanel] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [domainOverride, setDomainOverride] = useState('')
  const [stats, setStats] = useState({ class1: 0, class2: 0, total: 0, thisWeek: 0 })

  const fetchRecalls = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('https://api.fda.gov/food/enforcement.json?search=status:Ongoing&sort=recall_initiation_date:desc&limit=100')
      const data = await res.json()
      const results: Recall[] = (data.results || []).map((r: Recall, i: number) => ({ ...r, id: `${i}-${r.recalling_firm}`, domain: extractDomain(r.recalling_firm) }))
      setRecalls(results)
      setLastUpdated(new Date())
      const weekAgo = Date.now() - 7 * 86400000
      setStats({
        class1: results.filter(r => r.classification === 'Class I').length,
        class2: results.filter(r => r.classification === 'Class II').length,
        total: results.length,
        thisWeek: results.filter(r => new Date(r.recall_initiation_date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')).getTime() > weekAgo).length,
      })
    } catch(e) { console.error(e) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchRecalls() }, [fetchRecalls])

  const fetchContacts = async (recall: Recall) => {
    setSelected(recall); setContacts(null); setContactsLoading(true); setPanel(true)
    setDomainOverride(recall.domain || '')
    try {
      const domain = recall.domain || extractDomain(recall.recalling_firm)
      const res = await fetch(`/api/hunter?domain=${encodeURIComponent(domain)}`)
      setContacts(await res.json())
    } catch(e) { console.error(e); setContacts({ emails: [], organization: recall.recalling_firm, pattern: '', total: 0 }) }
    setContactsLoading(false)
  }

  const retryWithDomain = async () => {
    if (!domainOverride) return
    setContacts(null); setContactsLoading(true)
    try { const res = await fetch(`/api/hunter?domain=${encodeURIComponent(domainOverride)}`); setContacts(await res.json()) }
    catch(e) { console.error(e) }
    setContactsLoading(false)
  }

  const filtered = recalls.filter(r => {
    const q = searchTerm.toLowerCase()
    return (!q || r.recalling_firm.toLowerCase().includes(q) || r.product_description.toLowerCase().includes(q) || r.reason_for_recall.toLowerCase().includes(q))
      && (classFilter === 'all' || r.classification === classFilter)
  })

  const sortedContacts = (contacts?.emails || []).slice().sort((a,b) => {
    const ai = DEPT_PRIORITY.indexOf(a.department), bi = DEPT_PRIORITY.indexOf(b.department)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  const s: React.CSSProperties = {}

  return (
    <div style={{ background:'var(--bg-primary)', minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <header style={{ background:'var(--bg-secondary)', borderBottom:'1px solid var(--border)', padding:'0 24px', height:'56px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ width:'28px', height:'28px', background:'var(--accent-red)', borderRadius:'4px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:700 }}>R</div>
            <span style={{ fontWeight:600, fontSize:'15px', letterSpacing:'-0.3px' }}>RegIntel</span>
            <span style={{ color:'var(--text-muted)', fontSize:'12px' }}>by DigiComply</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', background:'rgba(63,185,80,0.1)', border:'1px solid rgba(63,185,80,0.2)', borderRadius:'20px', padding:'2px 10px' }}>
            <div className="live-pulse" style={{ width:'6px', height:'6px', borderRadius:'50%', background:'var(--accent-green)' }} />
            <span style={{ fontSize:'11px', color:'var(--accent-green)', fontWeight:500 }} className="mono">LIVE</span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'20px' }}>
          {lastUpdated && <span style={{ fontSize:'11px', color:'var(--text-muted)' }} className="mono">Updated {lastUpdated.toLocaleTimeString()}</span>}
          <button onClick={fetchRecalls} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'6px', color:'var(--text-secondary)', padding:'5px 12px', fontSize:'12px', cursor:'pointer', fontFamily:'IBM Plex Sans, sans-serif' }}>↻ Refresh</button>
        </div>
      </header>

      {/* Stats */}
      <div style={{ background:'var(--bg-secondary)', borderBottom:'1px solid var(--border)', padding:'12px 24px', display:'flex', gap:'32px', alignItems:'center' }}>
        {[{label:'ACTIVE RECALLS',value:stats.total,color:'var(--text-primary)'},{label:'CLASS I (HIGH RISK)',value:stats.class1,color:'var(--accent-red)'},{label:'CLASS II',value:stats.class2,color:'var(--accent-orange)'},{label:'THIS WEEK',value:stats.thisWeek,color:'var(--accent-blue)'}].map(s=>(
          <div key={s.label} style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
            <span style={{ fontSize:'10px', color:'var(--text-muted)', letterSpacing:'0.8px' }} className="mono">{s.label}</span>
            <span style={{ fontSize:'22px', fontWeight:700, color:s.color, lineHeight:1 }}>{s.value}</span>
          </div>
        ))}
        <div style={{ marginLeft:'auto' }}><span style={{ fontSize:'11px', color:'var(--text-muted)' }}>Source: FDA OpenData</span></div>
      </div>

      {/* Main */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        {/* Recall List */}
        <div style={{ flex: panel ? '0 0 55%' : '1', display:'flex', flexDirection:'column', overflow:'hidden', transition:'flex 0.3s ease' }}>
          {/* Filters */}
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:'8px', alignItems:'center', background:'var(--bg-secondary)' }}>
            <input type="text" placeholder="Search companies, products, violations..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
              style={{ flex:1, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'6px', color:'var(--text-primary)', padding:'7px 12px', fontSize:'13px', fontFamily:'IBM Plex Sans, sans-serif', outline:'none' }} />
            {(['all','Class I','Class II','Class III'] as const).map(c=>(
              <button key={c} onClick={()=>setClassFilter(c)} style={{ padding:'6px 12px', borderRadius:'5px', fontSize:'11px', fontWeight:500, cursor:'pointer', fontFamily:'IBM Plex Mono, monospace', letterSpacing:'0.3px', border: classFilter===c ? '1px solid var(--accent-blue)' : '1px solid var(--border)', background: classFilter===c ? 'rgba(88,166,255,0.1)' : 'var(--bg-card)', color: classFilter===c ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>{c==='all'?'ALL':c.toUpperCase()}</button>
            ))}
            <span style={{ fontSize:'11px', color:'var(--text-muted)' }} className="mono">{filtered.length} results</span>
          </div>

          {/* Table Header */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1.2fr 80px 90px 70px', padding:'8px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg-secondary)' }}>
            {['COMPANY','PRODUCT / VIOLATION','CLASS','DATE','AGE'].map(h=>(
              <span key={h} style={{ fontSize:'10px', color:'var(--text-muted)', letterSpacing:'0.8px' }} className="mono">{h}</span>
            ))}
          </div>

          {/* Rows */}
          <div style={{ flex:1, overflowY:'auto' }}>
            {loading ? (
              <div style={{ padding:'48px', textAlign:'center', color:'var(--text-muted)' }}><div style={{ fontSize:'12px' }} className="mono">LOADING FDA DATA...</div></div>
            ) : filtered.map((r, idx) => {
              const cls = CLASS_MAP[r.classification] || { label:'—', cls:'badge-low' }
              const days = getDaysAgo(r.recall_initiation_date)
              const isSel = selected?.id === r.id
              return (
                <div key={r.id} className="data-row fade-in" onClick={()=>fetchContacts(r)}
                  style={{ display:'grid', gridTemplateColumns:'1fr 1.2fr 80px 90px 70px', padding:'10px 16px', borderBottom:'1px solid var(--border)', borderLeft: isSel ? '2px solid var(--accent-blue)' : '2px solid transparent', background: isSel ? 'var(--bg-hover)' : 'transparent', animationDelay:`${idx*20}ms`, gap:'8px', alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:500, fontSize:'13px', color:'var(--text-primary)', marginBottom:'2px' }}>{r.recalling_firm.length>35?r.recalling_firm.slice(0,35)+'…':r.recalling_firm}</div>
                    <div style={{ fontSize:'11px', color:'var(--text-muted)' }} className="mono">{r.state||r.country}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:'12px', color:'var(--text-secondary)', marginBottom:'2px', lineHeight:1.3 }}>{r.product_description.length>50?r.product_description.slice(0,50)+'…':r.product_description}</div>
                    <div style={{ fontSize:'11px', color:'var(--text-muted)', lineHeight:1.3 }}>{r.reason_for_recall.length>55?r.reason_for_recall.slice(0,55)+'…':r.reason_for_recall}</div>
                  </div>
                  <div><span className={`mono ${cls.cls}`} style={{ fontSize:'10px', fontWeight:600, padding:'2px 6px', borderRadius:'3px', letterSpacing:'0.5px' }}>{cls.label}</span></div>
                  <div style={{ fontSize:'11px', color:'var(--text-secondary)' }} className="mono">{formatDate(r.recall_initiation_date)}</div>
                  <div style={{ fontSize:'11px', color: days<7?'var(--accent-red)':days<30?'var(--accent-orange)':'var(--text-muted)', fontWeight:days<7?600:400 }} className="mono">{days}d ago</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Contact Panel */}
        {panel && (
          <div style={{ flex:'0 0 45%', borderLeft:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg-secondary)' }}>
            <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontWeight:600, fontSize:'14px', marginBottom:'4px' }}>{selected?.recalling_firm}</div>
                <div style={{ fontSize:'11px', color:'var(--text-muted)' }}>{selected?.classification} · {selected?.voluntary_mandated}</div>
              </div>
              <button onClick={()=>{setPanel(false);setSelected(null)}} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:'18px', lineHeight:1, padding:'0 4px' }}>×</button>
            </div>

            <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', background:'rgba(255,68,68,0.04)' }}>
              <div style={{ fontSize:'10px', color:'var(--text-muted)', marginBottom:'6px', letterSpacing:'0.8px' }} className="mono">VIOLATION SUMMARY</div>
              <div style={{ fontSize:'12px', color:'var(--text-secondary)', lineHeight:1.5, marginBottom:'8px' }}>{selected?.reason_for_recall}</div>
              <div style={{ fontSize:'11px', color:'var(--text-muted)' }}>Product: <span style={{ color:'var(--text-secondary)' }}>{selected?.product_description}</span></div>
            </div>

            <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:'8px', alignItems:'center' }}>
              <span style={{ fontSize:'11px', color:'var(--text-muted)', whiteSpace:'nowrap' }} className="mono">DOMAIN</span>
              <input value={domainOverride} onChange={e=>setDomainOverride(e.target.value)}
                style={{ flex:1, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'4px', color:'var(--text-primary)', padding:'5px 8px', fontSize:'12px', fontFamily:'IBM Plex Mono, monospace', outline:'none' }} />
              <button onClick={retryWithDomain} style={{ background:'var(--accent-blue-dim)', border:'none', borderRadius:'4px', color:'#fff', padding:'5px 12px', fontSize:'11px', cursor:'pointer', fontFamily:'IBM Plex Sans, sans-serif', whiteSpace:'nowrap' }}>Search</button>
            </div>

            <div style={{ flex:1, overflowY:'auto', padding:'12px 16px' }}>
              <div style={{ fontSize:'10px', color:'var(--text-muted)', letterSpacing:'0.8px', marginBottom:'10px' }} className="mono">
                DECISION MAKERS {contacts?`· ${contacts.total} found · ${sortedContacts.length} shown`:''}
                {contacts?.pattern && <span style={{ marginLeft:'8px', color:'var(--accent-blue)' }}>pattern: {contacts.pattern}@{domainOverride}</span>}
              </div>
              {contactsLoading ? (
                <div style={{ padding:'32px', textAlign:'center' }}><div style={{ fontSize:'12px', color:'var(--text-muted)' }} className="mono">QUERYING HUNTER.IO...</div></div>
              ) : sortedContacts.length === 0 ? (
                <div style={{ padding:'24px', background:'var(--bg-card)', borderRadius:'8px', border:'1px solid var(--border)', textAlign:'center' }}>
                  <div style={{ fontSize:'12px', color:'var(--text-muted)', marginBottom:'8px' }}>No contacts found for this domain.</div>
                  <div style={{ fontSize:'11px', color:'var(--text-muted)' }}>Try updating the domain above.</div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {sortedContacts.map((c,i)=>(
                    <div key={i} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'6px', padding:'10px 12px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'4px' }}>
                        <div>
                          <span style={{ fontWeight:600, fontSize:'13px' }}>{c.first_name} {c.last_name}</span>
                          {c.seniority==='executive' && <span style={{ marginLeft:'6px', fontSize:'9px', background:'rgba(255,68,68,0.15)', color:'var(--accent-red)', border:'1px solid rgba(255,68,68,0.3)', borderRadius:'3px', padding:'1px 5px', fontWeight:600, letterSpacing:'0.5px' }} className="mono">EXEC</span>}
                        </div>
                        <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                          {c.verification?.status==='valid' && <span style={{ fontSize:'10px', color:'var(--accent-green)' }}>✓ verified</span>}
                          <span style={{ fontSize:'10px', color:c.confidence>=90?'var(--accent-green)':c.confidence>=70?'var(--accent-yellow)':'var(--text-muted)' }} className="mono">{c.confidence}%</span>
                        </div>
                      </div>
                      <div style={{ fontSize:'12px', color:'var(--text-muted)', marginBottom:'6px' }}>{c.position}</div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <a href={`mailto:${c.email}`} style={{ fontSize:'12px', color:'var(--accent-blue)', textDecoration:'none', fontFamily:'IBM Plex Mono, monospace' }}>{c.email}</a>
                        <div style={{ display:'flex', gap:'6px' }}>
                          {c.linkedin && <a href={c.linkedin} target="_blank" rel="noreferrer" style={{ fontSize:'10px', color:'var(--text-muted)', textDecoration:'none', padding:'2px 6px', border:'1px solid var(--border)', borderRadius:'3px' }}>LinkedIn</a>}
                          <button onClick={()=>navigator.clipboard.writeText(c.email)} style={{ fontSize:'10px', color:'var(--text-muted)', background:'none', border:'1px solid var(--border)', borderRadius:'3px', padding:'2px 6px', cursor:'pointer', fontFamily:'IBM Plex Sans, sans-serif' }}>Copy</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {sortedContacts.length > 0 && (
              <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)' }}>
                <button onClick={()=>{
                  const csv = ['First Name,Last Name,Email,Position,Department,Confidence,LinkedIn,Company,Recall Date,Classification',
                    ...sortedContacts.map(c=>`${c.first_name},${c.last_name},${c.email},"${c.position}",${c.department},${c.confidence},"${c.linkedin||''}","${selected?.recalling_firm}",${selected?.recall_initiation_date},${selected?.classification}`)
                  ].join('\n')
                  const a = document.createElement('a')
                  a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
                  a.download = `${selected?.recalling_firm.replace(/[^a-z0-9]/gi,'_')}_contacts.csv`
                  a.click()
                }} style={{ width:'100%', background:'var(--accent-blue-dim)', border:'none', borderRadius:'6px', color:'#fff', padding:'8px', fontSize:'12px', fontWeight:500, cursor:'pointer', fontFamily:'IBM Plex Sans, sans-serif' }}>
                  ↓ Export CSV for Instantly
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}