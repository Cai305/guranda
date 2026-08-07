import { NextRequest, NextResponse } from 'next/server'

// Server-side proxy for the public assistant chat widget. Client pages call
// `/api/assistant` (same-origin); this forwards to `${API_BASE}/assistant/ask`
// on the upstream mxit2.0 API. Unlike the /api/admin proxy, this endpoint is
// public — no secret key involved, just keeping the upstream URL config
// server-side rather than baked into the client bundle.

const API_BASE = process.env.API_BASE || 'http://localhost:3000'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const upstream = await fetch(`${API_BASE}/assistant/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  const data = await upstream.text()
  return new NextResponse(data, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') || 'application/json' },
  })
}
