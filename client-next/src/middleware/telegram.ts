import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';

interface TelegramUser {
  id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface ValidatedData {
  user: TelegramUser;
  [key: string]: any;
}

// Telegram WebApp data validation
function validateTelegramWebAppData(initData: string): ValidatedData | null {
  try {
    // Parse the initData string into key-value pairs
    const pairs = initData.split('&').map(pair => pair.split('='));
    const data: Record<string, any> = {};
    pairs.forEach(([key, value]) => {
      try {
        // Try to parse JSON values (like the user object)
        data[key] = JSON.parse(decodeURIComponent(value));
      } catch {
        // If not JSON, use the raw decoded value
        data[key] = decodeURIComponent(value);
      }
    });

    // Extract hash and data to verify
    const hash = data.hash;
    delete data.hash;

    const dataCheckString = Object.keys(data)
      .sort()
      .map(key => `${key}=${data[key]}`)
      .join('\n');

    // Create HMAC-SHA256
    const secret = crypto.createHmac('sha256', 'WebAppData')
      .update(process.env.BOT_TOKEN || '')
      .digest();

    const signature = crypto.createHmac('sha256', secret)
      .update(dataCheckString)
      .digest('hex');

    if (signature === hash) {
      return data as ValidatedData;
    }
    return null;
  } catch (error) {
    console.error('Failed to validate Telegram data:', error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  // Skip API routes and static files
  if (request.nextUrl.pathname.startsWith('/api/') || 
      request.nextUrl.pathname.startsWith('/_next/') ||
      request.nextUrl.pathname.includes('.')) {
    return NextResponse.next();
  }

  // Skip if already validated
  if (request.headers.get('X-Telegram-User-ID')) {
    return NextResponse.next();
  }

  const initData = request.nextUrl.searchParams.get('initData');
  
  // If no initData, redirect to error page
  if (!initData) {
    return NextResponse.redirect(new URL('/error?message=Must be opened from Telegram', request.url));
  }

  // Validate Telegram data
  const validatedData = validateTelegramWebAppData(initData);
  if (!validatedData || !validatedData.user) {
    return NextResponse.redirect(new URL('/error?message=Invalid Telegram data', request.url));
  }

  // Add validated user data to request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('X-Telegram-User-ID', validatedData.user.id);
  requestHeaders.set('X-Telegram-Username', validatedData.user.username || '');

  // Create response with modified headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    }
  });

  // Also set headers on response for client-side access
  response.headers.set('X-Telegram-User-ID', validatedData.user.id);
  response.headers.set('X-Telegram-Username', validatedData.user.username || '');

  return response;
} 