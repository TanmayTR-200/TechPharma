import { NextResponse } from 'next/server';
import { fetchFromApi } from '@/lib/api-helper';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const messages = await fetchFromApi(`/messages/conversations/${params.id}`);
    return NextResponse.json(messages);
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
