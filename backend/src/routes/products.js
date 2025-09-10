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
      products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
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

    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch products' });
  }
});

// ✅ GET single product by ID
router.get("/:id", (req, res) => {
  const products = readProducts();
  const product = products.find((p) => p.id === parseInt(req.params.id));

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
    const requiredFields = ['name', 'description', 'price', 'category', 'stock'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ message: `${field} is required` });
      }
    }

    const newProduct = {
      id: products.length ? products[products.length - 1].id + 1 : 1,
      name: req.body.name,
      description: req.body.description,
      price: parseFloat(req.body.price),
      category: req.body.category,
      stock: parseInt(req.body.stock),
      images: req.body.images || [],
      status: req.body.status || 'active',
      userId: req.user._id.toString(), // Add the user ID from the auth middleware
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    products.push(newProduct);
    saveProducts(products);
    res.status(201).json({ success: true, product: newProduct });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: error.message || 'Failed to create product' });
  }
});

// ✅ UPDATE product
router.put("/:id", auth, (req, res) => {
  const products = readProducts();
  const index = products.findIndex((p) => p.id === parseInt(req.params.id));

  if (index === -1) {
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
    userId: products[index].userId, // Ensure userId cannot be changed
    updatedAt: new Date().toISOString()
  };

  saveProducts(products);
  res.json(products[index]);
});

// ✅ DELETE product
router.delete("/:id", auth, (req, res) => {
  let products = readProducts();
  const index = products.findIndex((p) => p.id === parseInt(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: "Product not found" });
  }

  // Check if the user owns the product
  if (products[index].userId !== req.user._id.toString()) {
    return res.status(403).json({ error: "Not authorized to delete this product" });
  }

  const deletedProduct = products.splice(index, 1);
  saveProducts(products);
  res.json({ message: "Product deleted", deletedProduct });
});

module.exports = router;
