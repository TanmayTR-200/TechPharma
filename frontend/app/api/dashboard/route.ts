import { NextResponse } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const TIMEOUT = 5000; // 5 seconds

// Helper function to delay execution
const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Fetch dashboard data with retries and timeout
async function fetchDashboardData(authHeader: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
  
  try {
    const response = await fetch(`${BASE_URL}/api/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
    }
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }), 
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
          }
        }
      );
    }

    // Fetch dashboard data directly
    const response = await fetchDashboardData(authHeader);
    const data = await response.json();
    
    if (!response.ok) {
      return new NextResponse(
        JSON.stringify({ 
          error: data.error || 'Failed to fetch dashboard data',
          status: response.status 
        }), 
        { 
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
          }
        }
      );
    }

    // Return successful response with caching headers
    return new NextResponse(
      JSON.stringify(data), 
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=0, must-revalidate',
          'Vary': 'Authorization'
        }
      }
    );

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch dashboard data',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : String(error)) 
          : undefined
      },
      { status: 500 }
    );
  }
}