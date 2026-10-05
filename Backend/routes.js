import express from "express";
import {
  addProduct,
  deleteProduct,
  getProducts,
  searchProducts,
  quickSell,
  getRecentSales,
  getDailyStats
} from "./control.js";

const router = express.Router();

router.post("/products", addProduct);
router.get("/products", getProducts);
router.get("/products/search", searchProducts);
router.delete("/products/:id", deleteProduct);
router.post("/sell", quickSell);
router.get("/sales/recent", getRecentSales);
router.get("/stats/daily", getDailyStats);

export default router;