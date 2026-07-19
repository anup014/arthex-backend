const express = require("express");
const router = express.Router();

const {
  getStockOverview,
  getStockFundamentals,
  getStockFinancials,
  getStockTechnicals,
} = require("../controllers/stockController");

// ==========================
// STOCK ROUTES
// ==========================

router.get("/overview", getStockOverview);
router.get("/fundamentals", getStockFundamentals);
router.get("/financials", getStockFinancials);
router.get("/technicals", getStockTechnicals);

module.exports = router;