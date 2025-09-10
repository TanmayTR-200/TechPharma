import { NextResponse } from 'next/server';
import { fetchFromApi } from '@/lib/api-helper';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = await fetchFromApi('/messages', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    return NextResponse.json(message);
  } catch (error: any) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const message = await fetchFromApi(`/messages/${params.id}/read`, {
      method: 'PATCH'
    });
    return NextResponse.json(message);
  } catch (error: any) {
    console.error('Error marking message as read:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark message as read' },
      { status: 500 }
    );
  }
}
