import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain')
  if (!domain) return NextResponse.json({ error: 'domain required' }, { status: 400 })

  const apiKey = process.env.HUNTER_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Hunter API key not configured' }, { status: 500 })

  try {
    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=10&seniority=senior,executive&api_key=${apiKey}`
    const res = await fetch(url)
    const data = await res.json()
    if (data.errors) return NextResponse.json({ emails: [], organization: domain, pattern: '', total: 0 })
    const d = data.data
    return NextResponse.json({
      emails: d.emails || [],
      organization: d.organization || domain,
      pattern: d.pattern || '',
      total: d.meta?.results || d.emails?.length || 0,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ emails: [], organization: domain, pattern: '', total: 0 })
  }
}