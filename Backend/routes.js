import express from "express";
import {
  addProduct,
  updateProduct,
  deleteProduct,
  getProducts,
  searchProducts,
  quickSell,
  deleteSale,
  getRecentSales,
  getDailyStats,
  getMonthlyStats
} from "./control.js";

const router = express.Router();

// Products
router.post("/products", addProduct);
router.get("/products", getProducts);
router.get("/products/search", searchProducts);
router.put("/products/:id", updateProduct);       // NEW: Edit button
router.delete("/products/:id", deleteProduct);

// Sales
router.post("/sell", quickSell);
router.get("/sales/recent", getRecentSales);
router.delete("/sales/:id", deleteSale);          // NEW: Sold Products table ka delete

// Stats
router.get("/stats/daily", getDailyStats);
router.get("/stats/monthly", getMonthlyStats);    // NEW: Monthly report

export default router;