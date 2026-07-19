const express = require("express");
const router = express.Router();
const Portfolio = require("../models/portfolio");

// =======================
// BUY STOCK
// =======================
const YahooFinance = require("yahoo-finance2").default;
const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey']
});

router.post("/buy", async (req, res) => {
  const { userId, symbol, quantity } = req.body;

  if (!userId || !symbol || !quantity) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    let cleanSymbol = symbol.toUpperCase();
    if (!cleanSymbol.endsWith(".NS")) {
      cleanSymbol = `${cleanSymbol}.NS`;
    }

    const quote = await yahooFinance.quote(cleanSymbol);

    if (!quote) {
      return res.status(400).json({ error: "Invalid stock symbol" });
    }

    const price = quote.regularMarketPrice;
    const name = quote.longName || quote.shortName || symbol;
    const sector = "Other"; // You can fetch from summary if needed

    let portfolio = await Portfolio.findOne({ userId });

    if (!portfolio) {
      portfolio = new Portfolio({
        userId,
        holdings: [],
      });
    }

    const existing = portfolio.holdings.find(
      (h) => h.symbol === symbol
    );

    if (existing) {
      const totalQty = existing.quantity + quantity;

      existing.avgPrice =
        (existing.avgPrice * existing.quantity +
          price * quantity) /
        totalQty;

      existing.quantity = totalQty;
    } else {
      portfolio.holdings.push({
        symbol,
        name,
        sector,
        quantity,
        avgPrice: price,
      });
    }

    await portfolio.save();

    res.json({
      success: true,
      price,
      message: "Stock bought successfully"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Buy failed" });
  }
});

// =======================
// GET PORTFOLIO
// =======================
router.get("/:userId", async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({
      userId: req.params.userId,
    });

    if (!portfolio) {
      return res.json({
        holdings: [],
      });
    }

    res.json(portfolio);
  } catch (err) {
    res.status(500).json({ error: "Fetch failed" });
  }
});

// =======================
// SELL STOCK
// =======================
router.post("/sell", async (req, res) => {
  const { userId, symbol, quantity } = req.body;

  try {
    const portfolio = await Portfolio.findOne({ userId });

    if (!portfolio) {
      return res.status(404).json({ error: "No portfolio" });
    }

    const holding = portfolio.holdings.find(
      (h) => h.symbol === symbol
    );

    if (!holding || holding.quantity < quantity) {
      return res.status(400).json({ error: "Invalid sell" });
    }

    holding.quantity -= quantity;

    if (holding.quantity === 0) {
      portfolio.holdings = portfolio.holdings.filter(
        (h) => h.symbol !== symbol
      );
    }

    await portfolio.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Sell failed" });
  }
});

module.exports = router;