import { NextResponse } from 'next/server';

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

    const response = await fetch(`http://localhost:5000/api/products?${queryParams}`, {
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

    const productData = await request.json();
    
    const response = await fetch('http://localhost:5000/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify(productData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Failed to create product');
    }

    // Ensure we return a consistent product object structure
    const product = data.product || data;
    return NextResponse.json({
      product: {
        _id: product._id || product.id,
        ...product
      }
    });

  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create product' },
      { status: error.status || 500 }
    );
  }
}
