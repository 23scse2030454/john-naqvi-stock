import { Schema, model } from "mongoose";

// ===============================
// MONGOOSE SCHEMAS
// ===============================

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    costPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    alertThreshold: { type: Number, default: 5, min: 0 }
  },
  { timestamps: true }
);

const saleSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    productName: { type: String, required: true },
    quantity: { type: Number, default: 1, min: 1 },
    sellingPrice: { type: Number, required: true },
    costPrice: { type: Number, default: 0 }, // NEW: sale ke time ka cost
    totalAmount: { type: Number, required: true },
    saleDate: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const Product = model("Product", productSchema);
export const Sale = model("Sale", saleSchema);

// regex ke special characters safe karne ke liye
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");


// ===============================
// 1. ADD PRODUCT
// same naam ka product ho to usi card mein quantity jud jayegi
// ===============================

export const addProduct = async (req, res) => {
  try {
    const { name, costPrice, sellingPrice, quantity, alertThreshold } = req.body;

    if (
      !name ||
      costPrice === undefined ||
      sellingPrice === undefined ||
      quantity === undefined
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const cleanName = name.trim();

    const existing = await Product.findOne({
      name: { $regex: `^${escapeRegex(cleanName)}$`, $options: "i" }
    });

    if (existing) {
      existing.quantity += Number(quantity);
      existing.costPrice = Number(costPrice);
      existing.sellingPrice = Number(sellingPrice);
      if (alertThreshold !== undefined) {
        existing.alertThreshold = Number(alertThreshold);
      }
      await existing.save();

      return res.status(200).json({
        ...existing.toObject(),
        merged: true
      });
    }

    const newProduct = await Product.create({
      name: cleanName,
      costPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice),
      quantity: Number(quantity),
      alertThreshold:
        alertThreshold !== undefined ? Number(alertThreshold) : 5
    });

    return res.status(201).json(newProduct);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


// ===============================
// 1A. UPDATE / EDIT PRODUCT  (NEW)
// addQuantity = nayi aayi hui quantity (purane stock mein judegi)
// ===============================

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, costPrice, sellingPrice, addQuantity, alertThreshold } = req.body;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (name !== undefined && name.trim()) {
      product.name = name.trim();
    }

    if (costPrice !== undefined && costPrice !== "") {
      product.costPrice = Number(costPrice);
    }

    if (sellingPrice !== undefined && sellingPrice !== "") {
      product.sellingPrice = Number(sellingPrice);
    }

    if (alertThreshold !== undefined && alertThreshold !== "") {
      product.alertThreshold = Number(alertThreshold);
    }

    if (addQuantity !== undefined && addQuantity !== "") {
      const add = Number(addQuantity);
      if (!Number.isFinite(add)) {
        return res.status(400).json({ error: "Invalid quantity" });
      }
      product.quantity = Math.max(0, product.quantity + add);
    }

    await product.save();

    return res.json(product);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


// ===============================
// 1B. DELETE PRODUCT
// ===============================

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Product.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.json({ message: "Product deleted successfully", id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


// ===============================
// 2. GET PRODUCTS
// 20 PRODUCTS PER PAGE
// ===============================

export const getProducts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const skip = (page - 1) * limit;

    const total = await Product.countDocuments();

    const products = await Product.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      products,
      totalPages: Math.ceil(total / limit) || 1,
      currentPage: page,
      totalCount: total
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


// ===============================
// 3. SEARCH PRODUCTS
// ===============================

export const searchProducts = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.json([]);
    }

    const items = await Product.find({
      name: { $regex: escapeRegex(q.trim()), $options: "i" }
    }).limit(10);

    return res.json(items);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


// ===============================
// 4. QUICK SELL
// ===============================

export const quickSell = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    const sellQty = Number(quantity);

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    if (!Number.isInteger(sellQty) || sellQty <= 0) {
      return res.status(400).json({ error: "Quantity must be at least 1" });
    }

    const item = await Product.findById(productId);

    if (!item) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (item.quantity < sellQty) {
      return res.status(400).json({
        error: `Insufficient stock! Only ${item.quantity} available.`
      });
    }

    // Reduce stock
    item.quantity -= sellQty;
    await item.save();

    // Save sale (costPrice bhi save hoga)
    const sale = await Sale.create({
      productId: item._id,
      productName: item.name,
      quantity: sellQty,
      sellingPrice: item.sellingPrice,
      costPrice: item.costPrice,
      totalAmount: item.sellingPrice * sellQty,
      saleDate: new Date()
    });

    return res.status(201).json({
      message: "Sale recorded successfully",
      sale,
      currentStock: item.quantity
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


// ===============================
// 4B. DELETE SALE  (NEW)
// DELETE /sales/:id            -> stock wapas judega
// DELETE /sales/:id?restoreStock=false -> stock nahi judega
// ===============================

export const deleteSale = async (req, res) => {
  try {
    const { id } = req.params;

    const sale = await Sale.findById(id);

    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    if (req.query.restoreStock !== "false") {
      // agar product delete ho chuka hai to ye silently skip ho jayega
      await Product.findByIdAndUpdate(sale.productId, {
        $inc: { quantity: sale.quantity }
      });
    }

    await sale.deleteOne();

    return res.json({ message: "Sale deleted successfully", id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


// ===============================
// 5. RECENT SALES
// 5 SALES PER PAGE
// ===============================

export const getRecentSales = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 5;
    const skip = (page - 1) * limit;

    const total = await Sale.countDocuments();

    const sales = await Sale.find()
      .sort({ saleDate: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      sales,
      totalPages: Math.ceil(total / limit) || 1,
      currentPage: page,
      totalCount: total
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


// ===============================
// 6. DAILY STATS
// ===============================

export const getDailyStats = async (req, res) => {
  try {
    const dateStr = req.query.date;

    let startOfDay;
    let endOfDay;

    if (dateStr) {
      startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
      endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
    } else {
      const now = new Date();

      startOfDay = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)
      );

      endOfDay = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
      );
    }

    const salesToday = await Sale.find({
      saleDate: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ saleDate: -1 });

    const totalSalesAmount = salesToday.reduce(
      (sum, item) => sum + (Number(item.totalAmount) || 0),
      0
    );

    const totalUnitsSold = salesToday.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0),
      0
    );

    const lowStockItems = await Product.find({
      $expr: { $lte: ["$quantity", "$alertThreshold"] }
    });

    return res.json({
      date: startOfDay.toISOString().split("T")[0],
      totalRevenue: totalSalesAmount,
      totalUnits: totalUnitsSold,
      salesCount: salesToday.length,
      salesList: salesToday,
      lowStockCount: lowStockItems.length,
      lowStockList: lowStockItems
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


// ===============================
// 7. MONTHLY STATS  (NEW)
// GET /stats/monthly?month=2026-10
// month na do to current month
// ===============================

export const getMonthlyStats = async (req, res) => {
  try {
    let monthStr = req.query.month;

    if (!monthStr) {
      monthStr = new Date().toISOString().slice(0, 7);
    }

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthStr)) {
      return res.status(400).json({ error: "Month format YYYY-MM hona chahiye" });
    }

    const [year, month] = monthStr.split("-").map(Number);

    const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const startOfNextMonth = new Date(Date.UTC(year, month, 1));

    const sales = await Sale.find({
      saleDate: { $gte: startOfMonth, $lt: startOfNextMonth }
    });

    const totalRevenue = sales.reduce(
      (sum, s) => sum + (Number(s.totalAmount) || 0),
      0
    );

    const totalUnits = sales.reduce(
      (sum, s) => sum + (Number(s.quantity) || 0),
      0
    );

    const totalCost = sales.reduce(
      (sum, s) => sum + (Number(s.costPrice) || 0) * (Number(s.quantity) || 0),
      0
    );

    return res.json({
      month: monthStr,
      totalRevenue,
      totalCost,
      profit: totalRevenue - totalCost,
      totalUnits,
      salesCount: sales.length
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};