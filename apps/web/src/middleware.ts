import { NextRequest, NextResponse } from 'next/server';

interface StoreRedirect {
  fromPath: string;
  toUrl: string;
  statusCode: number;
}

let cachedRedirects: StoreRedirect[] | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000;

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
  const redirects = await getRedirects();
  const match = redirects.find((redirect) => redirect.fromPath === pathname);

  if (match) {
    const url = new URL(match.toUrl, request.url);
    return NextResponse.redirect(url, match.statusCode === 302 ? 302 : match.statusCode === 307 ? 307 : match.statusCode === 308 ? 308 : 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Excluye assets, API y archivos internos de Next
    '/((?!_next|api|favicon.ico|.*\\..*).*)',
  ],
};
