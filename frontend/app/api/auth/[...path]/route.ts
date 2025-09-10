import { NextRequest } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  const url = `http://localhost:5000/api/auth/${path}${queryString ? `?${queryString}` : ''}`;

  const headers = new Headers(request.headers);
  headers.delete('host'); // Remove host header to avoid conflicts

  try {
    const response = await fetch(url, {
      headers,
      method: request.method,
      body: request.body,
    });

    const data = await response.json();
    return Response.json(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return Response.json(
      { error: 'Failed to connect to backend server' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const url = `http://localhost:5000/api/auth/${path}`;

  const headers = new Headers(request.headers);
  headers.delete('host');

  try {
    const body = await request.json();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...Object.fromEntries(headers),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return Response.json(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return Response.json(
      { error: 'Failed to connect to backend server' },
      { status: 500 }
    );
  }
}
