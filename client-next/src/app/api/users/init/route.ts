import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const tgId = request.headers.get('X-Telegram-User-ID');
    const username = request.headers.get('X-Telegram-Username');

    if (!tgId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Initialize user in backend
    const response = await fetch(`${process.env.API_URL}/api/users/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tgId,
        username,
        // Add other user data as needed
      })
    });

    if (!response.ok) {
      throw new Error('Failed to initialize user');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('User initialization failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize user' },
      { status: 500 }
    );
  }
} 