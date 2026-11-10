import { NextRequest, NextResponse } from 'next/server';

interface StoreRedirect {
  fromPath: string;
  toUrl: string;
  statusCode: number;
}

let cachedRedirects: StoreRedirect[] | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000;
const VISITOR_COOKIE = 'nova_visitor';
const VISITOR_HEADER = 'x-nova-visitor';
const VISITOR_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

async function getRedirects(): Promise<StoreRedirect[]> {
  if (cachedRedirects && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedRedirects;
  }
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/store-redirects`,
      { cache: 'no-store' },
    );
    if (!response.ok) return cachedRedirects ?? [];
    cachedRedirects = (await response.json()) as StoreRedirect[];
    cachedAt = Date.now();
    return cachedRedirects;
  } catch {
    return cachedRedirects ?? [];
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const existingVisitor = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = existingVisitor || crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(VISITOR_HEADER, visitorId);

  const redirects = await getRedirects();
  const match = redirects.find((redirect) => redirect.fromPath === pathname);

  let response: NextResponse;
  if (match) {
    const url = new URL(match.toUrl, request.url);
    response = NextResponse.redirect(
      url,
      match.statusCode === 302 ? 302 : match.statusCode === 307 ? 307 : match.statusCode === 308 ? 308 : 301,
    );
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (!existingVisitor) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: VISITOR_MAX_AGE_SECONDS,
    });
  }

  return response;
}

export const config = {
  matcher: [
    // Excluye assets, API y archivos internos de Next
    '/((?!_next|api|favicon.ico|.*\\..*).*)',
  ],
};
