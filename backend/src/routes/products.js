const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// Path to JSON file
const dataFilePath = path.join(__dirname, "../../data/products.json");

// Helper to read products
function readProducts() {
  if (!fs.existsSync(dataFilePath)) {
    return [];
  }
  const data = fs.readFileSync(dataFilePath);
  return JSON.parse(data);
}

// Helper to save products
function saveProducts(products) {
  fs.writeFileSync(dataFilePath, JSON.stringify(products, null, 2));
}

// ✅ GET all products
router.get("/", (req, res) => {
  try {
    const { category, search, priceMin, priceMax } = req.query;
    let products = readProducts();

    // Apply filters
    if (category) {
      products = products.filter(p =>
        typeof p.category === 'string' &&
        p.category.trim().toLowerCase() === category.trim().toLowerCase()
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchLower) || 
        p.description.toLowerCase().includes(searchLower)
      );
    }

    if (priceMin) {
      products = products.filter(p => p.price >= parseFloat(priceMin));
    }

    if (priceMax) {
      products = products.filter(p => p.price <= parseFloat(priceMax));
    }

    // Ensure every product has a numeric 'id' field for frontend compatibility
    const productsWithNumericId = products.map(p => {
      if (typeof p.id === 'number') return p;
      // If _id exists and id is missing, try to parse id from _id (MongoDB style)
      if (p._id && !p.id) {
        // Try to extract a numeric id from _id if possible, else fallback to 0
        let numericId = 0;
        if (typeof p._id === 'string') {
          const match = p._id.match(/(\d+)/);
          if (match) numericId = parseInt(match[1]);
        }
        return { ...p, id: numericId };
      }
      // If id is not a number, fallback to 0
      return { ...p, id: 0 };
    });

    res.json({ success: true, products: productsWithNumericId });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch products' });
  }
});

// ✅ GET single product by ID
router.get("/:id", (req, res) => {
  const products = readProducts();
  const product = products.find((p) => 
    p.id === parseInt(req.params.id) || 
    p._id === req.params.id ||
    String(p.id) === req.params.id
  );

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }
  res.json(product);
});

// ✅ ADD new product
const auth = require('../middleware/auth');

router.post("/", auth, (req, res) => {
  try {
    const products = readProducts();
    
    // Validate required fields
    const requiredFields = ['name', 'description', 'price', 'category'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ error: `${field} is required` });
      }
    }

    // Convert and validate price
    const price = parseFloat(req.body.price);
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }

    // Convert and validate stock
    const stock = parseInt(req.body.stock || '0');
    if (isNaN(stock) || stock < 0) {
      return res.status(400).json({ error: 'Stock must be a non-negative number' });
    }

    // Validate images array
    if (req.body.images && !Array.isArray(req.body.images)) {
      return res.status(400).json({ error: 'Images must be an array' });
    }

    const id = products.length ? Math.max(...products.map(p => p.id || 0)) + 1 : 1;
    const newProduct = {
      id: id,
      _id: id.toString(), // Store _id as string for MongoDB compatibility
      name: req.body.name.trim(),
      description: req.body.description.trim(),
      price: price,
      category: req.body.category.trim(),
      stock: stock,
      images: req.body.images || [],
      status: req.body.status || 'active',
      userId: req.body.userId || req.user._id, // Allow explicit userId from request
      supplierId: req.body.userId || req.user._id, // Match userId for supplier
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    products.push(newProduct);
    saveProducts(products);
    res.status(201).json({ 
      success: true, 
      product: newProduct 
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: error.message || 'Failed to create product' });
  }
});

// ✅ UPDATE product
router.put("/:id", auth, (req, res) => {
  const products = readProducts();
  // Handle both string and numeric IDs
  const paramId = req.params.id;
  const index = products.findIndex((p) => {
    // Try to match string IDs first
    if (p._id === paramId || String(p.id) === paramId) {
      return true;
    }
    // Then try numeric comparison if possible
    const numericId = parseInt(paramId);
    return !isNaN(numericId) && (p.id === numericId || parseInt(p._id) === numericId);
  });

  if (index === -1) {
    console.error('Product not found:', {
      requestedId: req.params.id,
      availableIds: products.map(p => ({ _id: p._id, id: p.id }))
    });
    return res.status(404).json({ error: "Product not found" });
  }

  // Check if the user owns the product
  if (products[index].userId !== req.user._id.toString()) {
    return res.status(403).json({ error: "Not authorized to update this product" });
  }

  // Preserve the original userId and update other fields
  products[index] = {
    ...products[index],
    ...req.body,
    userId: products[index].userId // Ensure userId cannot be changed
  };

  saveProducts(products);
  res.json(products[index]);
});

// ✅ DELETE product
router.delete("/:id", auth, (req, res) => {
  let products = readProducts();
  const index = products.findIndex((p) => p.id === parseInt(req.params.id));

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: "Product not found",
      code: "PRODUCT_NOT_FOUND"
    });
  }

  // Check if the user owns the product
  if (products[index].userId !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      error: "Not authorized to delete this product",
      code: "NOT_AUTHORIZED"
    });
  }

  const deletedProduct = products.splice(index, 1);
  saveProducts(products);
  res.json({
    success: true,
    message: "Product deleted",
    deletedProduct
  });
});

module.exports = router;
