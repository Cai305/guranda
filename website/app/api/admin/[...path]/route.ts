import { NextRequest, NextResponse } from 'next/server'

// Server-side proxy for the internal admin dashboard (app/admin/**). The
// upstream mxit2.0 API's /admin/* is gated by a shared ADMIN_API_KEY header —
// this route is the only place that key is read, so it never reaches the
// browser. Client pages call `/api/admin/...` (same-origin, no secret needed);
// this forwards to `${ADMIN_API_BASE}/admin/...` with the key attached.

const ADMIN_API_BASE = process.env.ADMIN_API_BASE || 'http://localhost:3000'
const ADMIN_API_KEY = process.env.ADMIN_API_KEY

async function proxy(req: NextRequest, path: string[]) {
  if (!ADMIN_API_KEY) {
    return NextResponse.json({ message: 'ADMIN_API_KEY is not configured on the website server' }, { status: 500 })
  }
  const search = req.nextUrl.search
  const upstreamUrl = `${ADMIN_API_BASE}/admin/${path.join('/')}${search}`

  const init: RequestInit = {
    method: req.method,
    headers: { 'x-admin-key': ADMIN_API_KEY, 'Content-Type': 'application/json' },
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const body = await req.text()
    if (body) init.body = body
  }

  const upstream = await fetch(upstreamUrl, init)
  const data = await upstream.text()
  return new NextResponse(data, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') || 'application/json' },
  })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return proxy(req, path)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return proxy(req, path)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return proxy(req, path)
}
