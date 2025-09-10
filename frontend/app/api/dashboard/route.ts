import { NextResponse } from 'next/server';
import { fetchFromApi, handleApiError } from '@/lib/api-helper';

export async function GET(request: Request) {
  try {
    let orders, products, conversations;

    // Get the token from the request headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    try {
      // First get essential data
      const [ordersResponse, productsResponse] = await Promise.all([
        fetch('http://localhost:5000/api/orders', {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          }
        }),
        fetch('http://localhost:5000/api/products', {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (!ordersResponse.ok || !productsResponse.ok) {
        // Handle specific error cases
        if (ordersResponse.status === 401 || productsResponse.status === 401) {
          return NextResponse.json(
            { error: 'Authentication expired' },
            { status: 401 }
          );
        }
        throw new Error('Failed to fetch essential data');
      }

      orders = await ordersResponse.json();
      products = await productsResponse.json();
    } catch (error) {
      console.error('Error fetching essential data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch orders and products' },
        { status: 500 }
      );
    }

    // Try to get conversations, but don't fail if it errors
    try {
      const conversationsResponse = await fetch('http://localhost:5000/api/messages/conversations', {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });

      if (conversationsResponse.ok) {
        conversations = await conversationsResponse.json();
      } else {
        conversations = [];
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      conversations = [];
    }

    // Calculate statistics
    const totalProducts = products?.length || 0;
    const productViews = products?.reduce((sum: number, product: any) => sum + (product.views || 0), 0) || 0;
    const inquiries = products?.reduce((sum: number, product: any) => sum + (product.inquiries || 0), 0) || 0;
    const revenue = orders
      ?.filter((order: any) => order.paymentDetails?.status === 'COMPLETED')
      ?.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0) || 0;

    return NextResponse.json({
      orders: orders || [],
      messages: conversations.slice(0, 5), // Get latest 5 conversations
      totalProducts,
      productViews,
      inquiries,
      revenue
    });
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
