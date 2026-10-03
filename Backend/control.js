
import { Schema, model } from "mongoose";

// ===============================
// MONGOOSE SCHEMAS
// ===============================

const productSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    costPrice: {
      type: Number,
      required: true,
      min: 0
    },

    sellingPrice: {
      type: Number,
      required: true,
      min: 0
    },

    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },

    alertThreshold: {
      type: Number,
      default: 5,
      min: 0
    }
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

    productName: {
      type: String,
      required: true
    },

    quantity: {
      type: Number,
      default: 1,
      min: 1
    },

    sellingPrice: {
      type: Number,
      required: true
    },

    totalAmount: {
      type: Number,
      required: true
    },

    saleDate: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

export const Product = model("Product", productSchema);
export const Sale = model("Sale", saleSchema);


// ===============================
// 1. ADD PRODUCT
// ===============================

export const addProduct = async (req, res) => {
  try {
    const {
      name,
      costPrice,
      sellingPrice,
      quantity,
      alertThreshold
    } = req.body;

    if (
      !name ||
      costPrice === undefined ||
      sellingPrice === undefined ||
      quantity === undefined
    ) {
      return res.status(400).json({
        error: "All fields are required"
      });
    }

    const newProduct = await Product.create({
      name: name.trim(),
      costPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice),
      quantity: Number(quantity),
      alertThreshold:
        alertThreshold !== undefined
          ? Number(alertThreshold)
          : 5
    });

    return res.status(201).json(newProduct);

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
};


// ===============================
// 2. GET PRODUCTS
// 20 PRODUCTS PER PAGE
// ===============================

export const getProducts = async (req, res) => {
  try {
    const page = Math.max(
      1,
      parseInt(req.query.page) || 1
    );

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
    return res.status(500).json({
      error: err.message
    });
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
      name: {
        $regex: q.trim(),
        $options: "i"
      }
    }).limit(10);

    return res.json(items);

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
};


// ===============================
// 4. QUICK SELL
// ===============================

export const quickSell = async (req, res) => {
  try {
    const {
      productId,
      quantity = 1
    } = req.body;

    const sellQty = Number(quantity);

    if (!productId) {
      return res.status(400).json({
        error: "Product ID is required"
      });
    }

    if (!Number.isInteger(sellQty) || sellQty <= 0) {
      return res.status(400).json({
        error: "Quantity must be at least 1"
      });
    }

    const item = await Product.findById(productId);

    if (!item) {
      return res.status(404).json({
        error: "Product not found"
      });
    }

    if (item.quantity < sellQty) {
      return res.status(400).json({
        error: `Insufficient stock! Only ${item.quantity} available.`
      });
    }

    // Reduce stock
    item.quantity -= sellQty;

    await item.save();

    // Save sale
    const sale = await Sale.create({
      productId: item._id,
      productName: item.name,
      quantity: sellQty,
      sellingPrice: item.sellingPrice,
      totalAmount: item.sellingPrice * sellQty,
      saleDate: new Date()
    });

    return res.status(201).json({
      message: "Sale recorded successfully",
      sale,
      currentStock: item.quantity
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
};


// ===============================
// 5. RECENT SALES
// 5 SALES PER PAGE
// ===============================

export const getRecentSales = async (req, res) => {
  try {
    const page = Math.max(
      1,
      parseInt(req.query.page) || 1
    );

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
    return res.status(500).json({
      error: err.message
    });
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

    // If date is provided
    if (dateStr) {
      startOfDay = new Date(
        `${dateStr}T00:00:00.000Z`
      );

      endOfDay = new Date(
        `${dateStr}T23:59:59.999Z`
      );

    } else {
      // Current UTC day
      const now = new Date();

      startOfDay = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          0,
          0,
          0
        )
      );

      endOfDay = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          23,
          59,
          59,
          999
        )
      );
    }


    // ===============================
    // SALES FOR SELECTED DAY
    // ===============================

    const salesToday = await Sale.find({
      saleDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });


    // ===============================
    // TOTAL REVENUE
    // ===============================

    const totalSalesAmount = salesToday.reduce(
      (sum, item) =>
        sum + (Number(item.totalAmount) || 0),
      0
    );


    // ===============================
    // TOTAL UNITS SOLD
    // ===============================

    const totalUnitsSold = salesToday.reduce(
      (sum, item) =>
        sum + (Number(item.quantity) || 0),
      0
    );


    // ===============================
    // LOW STOCK PRODUCTS
    // quantity <= alertThreshold
    // ===============================

    const lowStockItems = await Product.find({
      $expr: {
        $lte: [
          "$quantity",
          "$alertThreshold"
        ]
      }
    });


    // ===============================
    // RESPONSE
    // ===============================

    return res.json({
      date: startOfDay
        .toISOString()
        .split("T")[0],

      totalRevenue: totalSalesAmount,

      totalUnits: totalUnitsSold,

      salesCount: salesToday.length,

      lowStockCount: lowStockItems.length,

      lowStockList: lowStockItems
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
};


// ### Tumhare original code mein main errors

// 1. **`S tring`**

//    ```js
//    type: S tring
//    ```

//    ko:

//    ```js
//    type: String
//    ```

// 2. **Search query**

//    ```js
//    { regex: q.trim(), options: "i" }
//    ```

//    valid MongoDB syntax nahi hai. Correct:

//    ```js
//    {
//      $regex: q.trim(),
//      $options: "i"
//    }
//    ```

// 3. **Daily sales query**

//    ```js
//    { gte: startOfDay, lte: endOfDay }
//    ```

//    mein `$` missing tha:

//    ```js
//    {
//      $gte: startOfDay,
//      $lte: endOfDay
//    }
//    ```

// 4. **Low-stock query**

//    ```js
//    expr: lte: ["quantity", "alertThreshold"]
//    ```

//    galat tha. MongoDB `$expr` ke andar fields ko `$` ke saath reference karna hota hai:

//    ```js
//    {
//      $expr: {
//        $lte: ["$quantity", "$alertThreshold"]
//      }
//    }
//    ```

// **Ab is file ko replace karke save karo.** Frontend/API routes mein koi change karne ki zarurat nahi honi chahiye agar routes pehle se in controller functions ko use kar rahe hain.

