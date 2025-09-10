const User = require('../models/User');

exports.getAllSuppliers = async (req, res) => {
  try {
    const suppliers = await User.find({ role: 'supplier' });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching suppliers' });
  }
};

exports.createSupplier = async (req, res) => {
  try {
    const supplierData = { ...req.body, role: 'supplier' };
    const supplier = new User(supplierData);
    await supplier.save();
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ message: 'Error creating supplier' });
  }
};

exports.getSupplierById = async (req, res) => {
  try {
    const supplier = await User.findOne({ _id: req.params.id, role: 'supplier' });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching supplier' });
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const supplier = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'supplier' },
      req.body,
      { new: true }
    );
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: 'Error updating supplier' });
  }
};

exports.deleteSupplier = async (req, res) => {
  try {
    const supplier = await User.findOneAndDelete({
      _id: req.params.id,
      role: 'supplier'
    });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting supplier' });
  }
};
