import { NextResponse } from 'next/server';
import { fetchFromApi } from '@/lib/api-helper';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const conversations = await fetchFromApi('/messages/conversations');
    return NextResponse.json(conversations);
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
