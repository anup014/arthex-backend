const YahooFinance = require("yahoo-finance2").default;
const axios = require("axios");
const { RSI, MACD, EMA } = require("technicalindicators");

const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey']
});

// Fetch NSE Circuit Limits
async function fetchNseCircuit(symbol) {
  try {
    const response = await axios.get(
      `https://www.nseindia.com/api/quote-equity?symbol=${symbol}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json",
          "Referer": "https://www.nseindia.com/"
        }
      }
    );

    return {
      upperCircuit: response.data?.priceInfo?.upperCP || null,
      lowerCircuit: response.data?.priceInfo?.lowerCP || null
    };

  } catch (err) {
    console.log("NSE circuit fetch failed");
    return { upperCircuit: null, lowerCircuit: null };
  }
}

exports.getStockOverview = async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: "Symbol is required" });
    }

    let cleanSymbol = symbol.toUpperCase();
    if (!cleanSymbol.endsWith(".NS")) {
      cleanSymbol = `${cleanSymbol}.NS`;
    }

    const quote = await yahooFinance.quote(cleanSymbol);
    const summary = await yahooFinance.quoteSummary(cleanSymbol, {
      modules: ["summaryProfile"]
    });

    if (!quote) {
      return res.status(404).json({ error: "Stock not found" });
    }

    const currentPrice = quote.regularMarketPrice;
    const previousClose = quote.regularMarketPreviousClose;

    const performance =
      currentPrice && previousClose
        ? (((currentPrice - previousClose) / previousClose) * 100).toFixed(2)
        : null;

    return res.json({
      name: quote.longName || quote.shortName,
      sector: summary?.summaryProfile?.sector || null,
      industry: summary?.summaryProfile?.industry || null,
      marketCap: quote.marketCap || null,
      todayLow: quote.regularMarketDayLow || null,
      todayHigh: quote.regularMarketDayHigh || null,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow || null,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || null,
      open: quote.regularMarketOpen || null,
      previousClose,
      currentPrice,
      volume: quote.regularMarketVolume || null,
      performancePercent: performance
    });

  } catch (error) {
    console.error("Overview Error:", error);
    return res.status(500).json({ error: "Failed to fetch overview" });
  }
};
exports.getStockFundamentals = async (req, res) => {
  try {
    const { symbol } = req.query;

    if (!symbol) {
      return res.status(400).json({ error: "Symbol is required" });
    }

    let cleanSymbol = symbol.toUpperCase();
    if (!cleanSymbol.endsWith(".NS")) {
      cleanSymbol = `${cleanSymbol}.NS`;
    }

    const fullSymbol = cleanSymbol;  // ✅ THIS WAS MISSING

    const summary = await yahooFinance.quoteSummary(fullSymbol, {
      modules: ["defaultKeyStatistics", "financialData"]
    });

    const stats = summary.defaultKeyStatistics || {};
    const financial = summary.financialData || {};

    return res.json({
  marketCap: stats.marketCap || null,
  trailingPE: stats.trailingPE || null,
  forwardPE: stats.forwardPE || null,
  eps: stats.trailingEps || null,
  roe: financial.returnOnEquity || null,
  debtToEquity: financial.debtToEquity || null,
  dividendYield: stats.dividendYield
    ? Number((stats.dividendYield * 100).toFixed(2))
    : null
});

  } catch (error) {
    console.error("Fundamentals Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch fundamentals"
    });
  }
};

exports.getStockFinancials = async (req, res) => {
  try {
    const { symbol } = req.query;

    if (!symbol) {
      return res.status(400).json({ error: "Symbol is required" });
    }

    let cleanSymbol = symbol.toUpperCase();
    if (!cleanSymbol.endsWith(".NS")) {
      cleanSymbol = `${cleanSymbol}.NS`;
    }

    const fullSymbol = cleanSymbol;

    const summary = await yahooFinance.quoteSummary(fullSymbol, {
      modules: ["incomeStatementHistory"]
    });

    const statements =
      summary?.incomeStatementHistory?.incomeStatementHistory || [];

    if (!statements.length) {
      return res.status(404).json({
        success: false,
        error: "No financial data available"
      });
    }
    console.log(statements[0]);
    const lastFive = statements.slice(0, 5);

    const years = [];
    const revenue = [];
    const profit = [];

   lastFive.forEach((item) => {

  const year = new Date(item.endDate).getFullYear();

  years.push(year);
  revenue.push(item.totalRevenue || 0);
  profit.push(item.netIncome || 0);

});

    return res.json({
  years,
  revenue,
  profit
});

  } catch (error) {
    console.error("Financials Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch financials"
    });
  }
};
exports.getStockTechnicals = async (req, res) => {
  try {
    const { symbol, interval = "1d" } = req.query;

    if (!symbol) {
      return res.status(400).json({ error: "Symbol is required" });
    }

    let cleanSymbol = symbol.toUpperCase();
    if (!cleanSymbol.endsWith(".NS")) {
      cleanSymbol = `${cleanSymbol}.NS`;
    }

    const fullSymbol = cleanSymbol;  // ✅ THIS WAS MISSING

    // Fetch historical data
    const historical = await yahooFinance.historical(fullSymbol, {
      period1: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
      period2: new Date(),
      interval
    });

    if (!historical || historical.length < 60) {
      return res.status(400).json({
        success: false,
        error: "Not enough historical data"
      });
    }

    const closes = historical.map(c => c.close);

    // RSI
    const rsiValues = RSI.calculate({ values: closes, period: 14 });
    const latestRSI = rsiValues[rsiValues.length - 1];

    // EMA 20 & 50
    const ema20 = EMA.calculate({ values: closes, period: 20 });
    const ema50 = EMA.calculate({ values: closes, period: 50 });

    const latestEMA20 = ema20[ema20.length - 1];
    const latestEMA50 = ema50[ema50.length - 1];

    // MACD
    const macdValues = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    });

    const latestMACD = macdValues[macdValues.length - 1];

    // Support & Resistance (Improved)
    const recentCloses = closes.slice(-30);
    const support = Math.min(...recentCloses);
    const resistance = Math.max(...recentCloses);

    // Trend Logic
    let trend = "Neutral";
    if (latestEMA20 > latestEMA50) trend = "Bullish";
    if (latestEMA20 < latestEMA50) trend = "Bearish";

    // RSI Interpretation
    let rsiSignal = "Neutral";
    if (latestRSI > 70) rsiSignal = "Overbought";
    if (latestRSI < 30) rsiSignal = "Oversold";

    // MACD Signal
    let macdSignal = "Neutral";
    if (latestMACD?.MACD > latestMACD?.signal) macdSignal = "Bullish";
    if (latestMACD?.MACD < latestMACD?.signal) macdSignal = "Bearish";

    // Final Trade Signal Logic
    let overallSignal = "Neutral";

    if (trend === "Bullish" && rsiSignal !== "Overbought" && macdSignal === "Bullish") {
      overallSignal = "Buy";
    }

    if (trend === "Bearish" && rsiSignal !== "Oversold" && macdSignal === "Bearish") {
      overallSignal = "Sell";
    }

return res.json({
  rsi: Number(latestRSI.toFixed(2)),
  rsiSignal,
  ema20: Number(latestEMA20.toFixed(2)),
  ema50: Number(latestEMA50.toFixed(2)),
  trend,
  macd: {
    macd: Number(latestMACD.MACD.toFixed(2)),
    signal: Number(latestMACD.signal.toFixed(2)),
    histogram: Number(latestMACD.histogram.toFixed(2)),
    macdSignal
  },
  support: Number(support.toFixed(2)),
  resistance: Number(resistance.toFixed(2)),
  overallSignal
});

  } catch (error) {
    console.error("Technicals Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to calculate technicals"
    });
  }
};