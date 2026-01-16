import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = searchParams.get('page') || '1';
    const sort = searchParams.get('sort') || 'featured';
    const priceMin = searchParams.get('priceMin');
    const priceMax = searchParams.get('priceMax');

    // Get auth token from request headers
    const token = request.headers.get('authorization');

    // Construct query parameters
    const queryParams = new URLSearchParams();
    if (category) queryParams.set('category', category);
    if (search) queryParams.set('search', search);
    if (page) queryParams.set('page', page);
    if (sort) queryParams.set('sort', sort);
    if (priceMin) queryParams.set('priceMin', priceMin);
    if (priceMax) queryParams.set('priceMax', priceMax);

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const response = await fetch(`${backendUrl}/api/products?${queryParams}`, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        ...(token ? { 'Authorization': token } : {})
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch products');
    }

    // Ensure consistent data structure
    if (Array.isArray(data)) {
      return NextResponse.json({
        products: data,
        total: data.length
      });
    }

    if (data.products && Array.isArray(data.products)) {
      return NextResponse.json(data);
    }

    return NextResponse.json({
      products: [],
      total: 0
    });

  } catch (error) {
    console.error('Error in products API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization');
    if (!token) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    let productData;
    try {
      productData = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!productData.name || !productData.description || !productData.price || !productData.category) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, price, and category are required' },
        { status: 400 }
      );
    }

    // Ensure price is a number and positive
    if (typeof productData.price !== 'number' || productData.price <= 0) {
      return NextResponse.json(
        { error: 'Price must be a positive number' },
        { status: 400 }
      );
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      console.log('Sending product data:', productData);
      
      const response = await fetch(`${apiUrl}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token,
          'Accept': 'application/json'
        },
        body: JSON.stringify(productData)
      });

      let data;
      try {
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('Non-JSON response from server');
          console.error('Response status:', response.status);
          console.error('Content-Type:', contentType);
          const text = await response.text();
          console.error('Response body:', text);
          throw new Error('Server returned non-JSON response');
        }
        
        data = await response.json();
        console.log('Server response:', data);
        
      } catch (e) {
        console.error('Error parsing response:', e);
        throw new Error('Invalid server response');
      }

      if (!response.ok) {
        console.error('Error response from server:', data);
        return NextResponse.json(
          { 
            error: data.message || data.error || 'Failed to create product',
            details: data.details || {},
            status: response.status
          },
          { status: response.status }
        );
      }

      // Ensure we return a consistent product object structure
      const product = data.product || data;
      if (!product || !product._id) {
        throw new Error('Invalid response from server');
      }

      return NextResponse.json({
        product: {
          _id: product._id || product.id,
          ...product
        }
      });
    } catch (error) {
      console.error('Error communicating with backend:', error);
      return NextResponse.json(
        { error: 'Internal server error while creating product' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create product' },
      { status: error.status || 500 }
    );
  }
}
