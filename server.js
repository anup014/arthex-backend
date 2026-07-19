
require("dotenv").config();

console.log("Mongo URI:", process.env.MONGO_URI);

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const qs = require("querystring");
const http = require("http");
const { Server } = require("socket.io");
const WebSocket = require("ws");
const rateLimit = require("express-rate-limit");
const stockRoutes = require('./routes/stockRoutes');

const Portfolio = require("./models/portfolio");
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI)
.then(async () => {
    console.log("✅ MongoDB Connected");

    const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);

  const active = await Tournament.findOne({ isActive: true });

  if (active) {
    activeTournamentId = active._id;

    if (tournamentInterval) {
      clearInterval(tournamentInterval);
    }

    tournamentInterval = setInterval(async () => {
      await updateLeaderboard(activeTournamentId);
    }, 5000);

    console.log("🏆 Resumed Tournament Engine");
  }
});

})
.catch(err => {
    console.log(err);
});

const app = express();   // 👈 MUST COME BEFORE USING app

app.use(cors());
app.use(express.json());
app.use("/stock", stockRoutes);



app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100
}));




// ===== USER SCHEMA =====
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  walletBalance: {
    type: Number,
    default: 100000
  }
});

const User = mongoose.model("User", userSchema);



const tradeSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  symbol: String,
  type: String,
  quantity: Number,
  price: Number,
  total: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.json({
      message: "User registered",
      userId: user._id,
      name: user.name,
      walletBalance: user.walletBalance
    });

  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    res.json({
      message: "Login successful",
      userId: user._id,
      name: user.name,
      walletBalance: user.walletBalance
    });

  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

const Trade = mongoose.model("Trade", tradeSchema);

app.post("/trade/buy", async (req, res) => {
  const { userId, symbol, quantity } = req.body;

  if (!userId || !symbol || !quantity) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Fetch live price from Yahoo
    const yahooSymbol = `${symbol}.NS`;

    const response = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );

    const meta = response.data.chart.result[0].meta;
    const ltp = meta.regularMarketPrice;
    const totalCost = ltp * quantity;

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.walletBalance < totalCost) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Deduct wallet
    user.walletBalance -= totalCost;
    await user.save();

    // Update portfolio
    let holding = await Portfolio.findOne({ userId, symbol });

    if (holding) {
      const newQty = holding.quantity + quantity;
      holding.averagePrice =
        ((holding.averagePrice * holding.quantity) + totalCost) / newQty;
      holding.quantity = newQty;
      await holding.save();
    } else {
      await Portfolio.create({
        userId,
        symbol,
        quantity,
        averagePrice: ltp,
      });
    }

    // Store trade
    await Trade.create({
  userId,
  symbol,
  companyName: symbol,
  type: "BUY",
  quantity,
  price: ltp,
  totalAmount: totalCost,
  brokerage: 0,
  realizedPnL: 0,
});
    // 🔥 INSTANT LEADERBOARD UPDATE
if (activeTournamentId) {
  const entry = await TournamentEntry.findOne({
    tournamentId: activeTournamentId,
    userId,
  });

  if (entry) {
    const portfolio = await Portfolio.find({ userId });

    let totalValue = 0;

    for (const h of portfolio) {
      const yahooSymbol = `${h.symbol}.NS`;

      const { data } = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );

      const ltp = data.chart.result[0].meta.regularMarketPrice;
      totalValue += h.quantity * ltp;
    }

    entry.currentValue = totalValue;
    entry.returnPercent =
      ((totalValue - entry.startingCapital) /
        entry.startingCapital) * 100;

    await entry.save();

    await updateLeaderboardInstant(activeTournamentId);
  }
}

    res.json({
  success: true,
  message: "Trade executed",
  ltp,
});

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Trade failed" });
  }
});

app.post("/trade/sell", async (req, res) => {
  const { userId, symbol, quantity } = req.body;

  try {
    if (!userId || !symbol || !quantity) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const yahooSymbol = `${symbol}.NS`;

    const response = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );

    const result = response.data.chart?.result?.[0];
    const meta = result?.meta;

    if (!meta || !meta.regularMarketPrice) {
      return res.status(400).json({ error: "Failed to fetch price" });
    }

    const ltp = Number(meta.regularMarketPrice);
    const totalValue = ltp * Number(quantity);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const holding = await Portfolio.findOne({ userId, symbol });

    if (!holding || holding.quantity < quantity) {
      return res.status(400).json({ error: "Insufficient holdings" });
    }

    // Reduce quantity
    holding.quantity -= quantity;

    if (holding.quantity === 0) {
      await holding.deleteOne();
    } else {
      await holding.save();
    }

    // Credit wallet
    user.walletBalance += totalValue;
    await user.save();

    // Save trade history
    await Trade.create({
      userId,
      symbol,
      type: "SELL",
      quantity,
      price: ltp,
      total: totalValue,
    });

    // 🔥 INSTANT LEADERBOARD UPDATE
if (activeTournamentId) {
  const entry = await TournamentEntry.findOne({
    tournamentId: activeTournamentId,
    userId,
  });

  if (entry) {
    const portfolio = await Portfolio.find({ userId });

    let totalValue = 0;

    for (const h of portfolio) {
      const yahooSymbol = `${h.symbol}.NS`;

      const { data } = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );

      const ltp = data.chart.result[0].meta.regularMarketPrice;
      totalValue += h.quantity * ltp;
    }

    entry.currentValue = totalValue;
    entry.returnPercent =
      ((totalValue - entry.startingCapital) /
        entry.startingCapital) * 100;

    await entry.save();

    await updateLeaderboardInstant(activeTournamentId);
  }
}

    res.json({
  success: true,
  message: "SELL executed successfully",
  price: ltp,
  creditedAmount: totalValue,
  newWalletBalance: user.walletBalance,
});

  } catch (error) {
    console.error("Sell Trade Error:", error.message);
    res.status(500).json({ error: "Sell failed" });
  }
});

const Tournament = require("./models/Tournament");
const TournamentEntry = require("./models/TournamentEntry");

app.post("/tournament/join", async (req, res) => {
  const { tournamentId, userId } = req.body;

  try {
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament || !tournament.isActive) {
      return res.status(400).json({ error: "Tournament not active" });
    }

    const count = await TournamentEntry.countDocuments({ tournamentId });

    if (count >= tournament.maxParticipants) {
      return res.status(400).json({ error: "Tournament full" });
    }

    const alreadyJoined = await TournamentEntry.findOne({
      tournamentId,
      userId,
    });

    if (alreadyJoined) {
      return res.status(400).json({ error: "Already joined" });
    }

    await TournamentEntry.create({
      tournamentId,
      userId,
      startingCapital: tournament.startingCapital,
      currentValue: tournament.startingCapital,
      returnPercent: 0,
    });

    // 🔥 INSTANT LEADERBOARD UPDATE
if (activeTournamentId) {
  await updateLeaderboard(activeTournamentId);
}
    console.log("User joined tournament:", userId);

    res.json({ success: true, message: "Joined successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Join failed" });
  }
});
app.post("/tournament/leave", async (req, res) => {
  const { tournamentId, userId } = req.body;

  try {
    const entry = await TournamentEntry.findOne({
      tournamentId,
      userId,
    });

    if (!entry) {
      return res.status(400).json({ error: "Not part of tournament" });
    }

    await TournamentEntry.deleteOne({ _id: entry._id });

    console.log("🚪 User left tournament");

    await updateLeaderboardInstant(tournamentId);

    res.json({ success: true, message: "Left tournament" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Leave failed" });
  }
});

let activeTournamentId = null;
let tournamentInterval = null;


// 🔥 ADD THIS ENTIRE FUNCTION HERE
async function updateLeaderboard(tournamentId) {
  try {
    const entries = await TournamentEntry.find({ tournamentId });

    for (let entry of entries) {

      const holdings = await Portfolio.find({ userId: entry.userId });

      let currentValue = entry.startingCapital;

      for (let h of holdings) {
        const yahooSymbol = `${h.symbol}.NS`;

        const { data } = await axios.get(
          `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
          { headers: { "User-Agent": "Mozilla/5.0" } }
        );

        const meta = data.chart.result?.[0]?.meta;
        const ltp = meta?.regularMarketPrice;

        if (ltp) {
          currentValue += (h.quantity * (ltp - h.averagePrice));
        }
      }

      const pnl = currentValue - entry.startingCapital;
      const returnPercent =
        (pnl / entry.startingCapital) * 100;

      entry.currentValue = currentValue;
      entry.returnPercent = returnPercent;

      await entry.save();
    }

  const leaderboard = await TournamentEntry.find({ tournamentId })
  .populate("userId", "name")
  .sort({ returnPercent: -1 })
  .limit(10);

    io.emit("leaderboard-update", leaderboard);

    console.log("📡 Leaderboard updated");

  } catch (err) {
    console.error("Leaderboard update error:", err.message);
  }
}

app.post("/tournament/create", async (req, res) => {
  try {
    const { name, type, durationMinutes } = req.body;

    if (!name || !type || !durationMinutes) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 🚫 Prevent creating if one is already active
    const existingActive = await Tournament.findOne({ isActive: true });
    if (existingActive) {
      return res.status(400).json({ error: "Active tournament already exists" });
    }

    const startTime = new Date();
    const endTime = new Date(Date.now() + Number(durationMinutes) * 60000);

    const tournament = await Tournament.create({
      name,
      type,
      startTime,
      endTime,
      maxParticipants: 100,
      startingCapital: 100000,
      isActive: true,
    });

    activeTournamentId = tournament._id;

    console.log("🏆 Tournament engine started");

    // 🔥 START LIVE LEADERBOARD INTERVAL
    if (tournamentInterval) {
      clearInterval(tournamentInterval);
    }

    tournamentInterval = setInterval(async () => {
      await updateLeaderboard(activeTournamentId);
    }, 2000); // update every 2 seconds


    // 🔥 AUTO END TOURNAMENT
    const timeLeft = endTime.getTime() - Date.now();

    setTimeout(async () => {
      console.log("🏁 Tournament finished");

      // Stop leaderboard updates
      if (tournamentInterval) {
        clearInterval(tournamentInterval);
      }

      // Final leaderboard update
      await updateLeaderboard(activeTournamentId);

      // 🔥 IMPORTANT: Deactivate tournament
      await Tournament.findByIdAndUpdate(activeTournamentId, {
        isActive: false,
      });

      // Emit tournament ended event
      io.emit("tournament-ended");

      // Reset active ID
      activeTournamentId = null;

    }, timeLeft);

    res.json(tournament);

  } catch (err) {
    console.error("Tournament Create Error:", err);
    res.status(500).json({ error: err.message });
  }
});
app.get("/tournament/active", async (req, res) => {
  const tournament = await Tournament.findOne({ isActive: true });

  if (!tournament) {
    return res.json(null);
  }

  const count = await TournamentEntry.countDocuments({
    tournamentId: tournament._id,
  });

  res.json({
    ...tournament.toObject(),
    participants: count,
  });
});

app.get("/tournament/leaderboard/:id", async (req, res) => {
  try {
    const tournament = await Tournament.findById(tournamentId);

if (!tournament || new Date() > tournament.endTime) {
  clearInterval(tournamentInterval);
  tournament.isActive = false;
  await tournament.save();
  console.log("🏁 Tournament ended");
  return;
}
    const tournamentId = req.params.id;

    const leaderboard = await TournamentEntry.find({ tournamentId })
      .sort({ returnPercent: -1 })
      .limit(10);

    res.json(leaderboard);

  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

app.get("/tournament/check/:tournamentId/:userId", async (req, res) => {
  const { tournamentId, userId } = req.params;

  const entry = await TournamentEntry.findOne({
    tournamentId,
    userId,
  });

  res.json({
    joined: !!entry,
  });
});

app.get("/portfolio/:userId", async (req, res) => {
  try {
    const holdings = await Portfolio.find({
      userId: req.params.userId,
    });

    if (!holdings.length) {
      return res.json({
        totalInvestment: 0,
        currentValue: 0,
        totalPnL: 0,
        totalReturnPercent: 0,
        holdings: []
      });
    }

    let totalInvestment = 0;
    let currentValue = 0;

    const detailedHoldings = [];

    for (const h of holdings) {
      const yahooSymbol = `${h.symbol}.NS`;

      const { data } = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );

      const meta = data.chart.result[0].meta;
      const ltp = meta.regularMarketPrice;

      const invested = h.quantity * h.averagePrice;
      const current = h.quantity * ltp;
      const pnl = current - invested;

      totalInvestment += invested;
      currentValue += current;

      detailedHoldings.push({
        symbol: h.symbol,
        quantity: h.quantity,
        averagePrice: h.averagePrice,
        ltp,
        invested,
        current,
        pnl,
        pnlPercent: ((pnl / invested) * 100).toFixed(2)
      });
    }

    const totalPnL = currentValue - totalInvestment;
    const totalReturnPercent =
      (totalPnL / totalInvestment) * 100;

    res.json({
      totalInvestment: totalInvestment.toFixed(2),
      currentValue: currentValue.toFixed(2),
      totalPnL: totalPnL.toFixed(2),
      totalReturnPercent: totalReturnPercent.toFixed(2),
      holdings: detailedHoldings
    });

  } catch (err) {
    console.error("Portfolio Summary Error:", err.message);
    res.status(500).json({ error: "Failed to calculate summary" });
  }
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    marketCacheSize: marketCache.gainers.length,
    time: new Date()
  });
});




// ===== VARIABLES =====
let upstoxAccessToken = null;
let stocks = [];
// ===== MARKET CACHE =====
let marketCache = {
  gainers: [],
  losers: [],
  intraday: [],
  lastUpdated: null
};
const UPSTOX_API_KEY = process.env.UPSTOX_API_KEY;
const UPSTOX_API_SECRET = process.env.UPSTOX_API_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

app.get("/auth/login", (req, res) => {
  const authUrl =
    `https://api.upstox.com/v2/login/authorization/dialog` +
    `?response_type=code` +
    `&client_id=${UPSTOX_API_KEY}` +
    `&redirect_uri=${REDIRECT_URI}`;

  console.log("Redirecting to:", authUrl);
  res.redirect(authUrl);
});


app.get("/auth/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.send("No authorization code received.");
  }

  console.log("Authorization Code:", code);

  try {
    const tokenResponse = await axios.post(
      "https://api.upstox.com/v2/login/authorization/token",
      qs.stringify({
        code: code,
        client_id: process.env.UPSTOX_API_KEY,
        client_secret: process.env.UPSTOX_API_SECRET,
        redirect_uri: process.env.REDIRECT_URI,
        grant_type: "authorization_code",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    upstoxAccessToken = tokenResponse.data.access_token;
    startUpstoxStream();
    const accessToken = tokenResponse.data.access_token;

    console.log("✅ ACCESS TOKEN:", accessToken);

    res.send("Authentication successful! Access token generated.");

  } catch (error) {
    console.error(
      "❌ Token Exchange Error:",
      error.response?.data || error.message
    );

    res.send("Token exchange failed.");
  }
});
app.get("/user/profile", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.upstox.com/v2/user/profile",
      {
        headers: {
          Authorization: `Bearer ${upstoxAccessToken}`,
        },
      }
    );

    res.json(response.data);

  } catch (error) {
    console.error("Profile Error:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to fetch profile" });
  }
  console.log("Current token:", upstoxAccessToken);
});

/*
  ---------------------------
  LOAD CSV ON SERVER START
  ---------------------------
*/
const topCsvPath = path.join(__dirname, "data", "NIFTY500.csv");

fs.createReadStream(topCsvPath)
  .pipe(csv())
  .on("data", (row) => {
    const symbol = row.Symbol || row.SYMBOL || row.symbol;
    const name =
      row["Company Name"] ||
      row["NAME OF COMPANY"] ||
      row.Company ||
      symbol;

    if (symbol) {
      stocks.push({
        symbol: symbol.trim(),
        name: name ? name.trim() : symbol.trim(),
        exchange: "NSE",
      });
    }
  })
.on("end", () => {
  console.log(`✅ Loaded ${stocks.length} top stocks`);

  // Run scan in background
  scanMarket().catch(err =>
    console.error("Scan error:", err.message)
  );

  setInterval(() => {
    scanMarket().catch(err =>
      console.error("Scan error:", err.message)
    );
  }, 120000);
});

    


  // ===== FULL MARKET SCANNER =====
async function scanMarket() {
  console.log("🔄 Scanning full market...");

  // 🔥 Limit to first 500 stocks to avoid rate limit
const symbols = stocks.slice(0, 500).map(s => s.symbol);

  const results = [];

  for (let i = 0; i < symbols.length; i += 20) {
    const batch = symbols.slice(i, i + 20);

    const batchResults = await Promise.all(
      batch.map(async (symbol) => {
        try {
          const yahooSymbol = `${symbol}.NS`;

          const { data } = await axios.get(
            `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
            {
              headers: { "User-Agent": "Mozilla/5.0" },
              timeout: 5000 // 🔥 Prevent hanging
            }
          );

          const meta = data.chart.result?.[0]?.meta;

          if (!meta) return null;

          const price = Number(meta.regularMarketPrice);
          const prev = Number(meta.chartPreviousClose);

          if (!price || !prev) return null;

          const changePercent = ((price - prev) / prev) * 100;

          return {
            symbol,
            price,
            changePercent
          };
        } catch {
          return null;
        }
      })
    );

    results.push(...batchResults.filter(Boolean));
  }

  marketCache = {
    gainers: [...results].sort((a, b) => b.changePercent - a.changePercent),
    losers: [...results].sort((a, b) => a.changePercent - b.changePercent),
    intraday: [...results].sort(
      (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)
    ),
    lastUpdated: new Date()
  };

  console.log("✅ Market scan complete:", results.length, "stocks");
}
app.get("/stock/details", async (req, res) => {
  const symbol = req.query.symbol;

  if (!symbol) {
    return res.status(400).json({ error: "Symbol required" });
  }

  try {
    let yahooSymbol = symbol.toUpperCase();

    if (!yahooSymbol.includes(".")) {
      yahooSymbol = `${yahooSymbol}.NS`;
    }

    const response = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
      }
    );

    const result = response.data.chart.result[0];
    const meta = result.meta;

    res.json({
      symbol,
      shortName: meta.symbol || symbol,
      currentPrice: meta.regularMarketPrice || null,
      previousClose: meta.chartPreviousClose || null,
      currency: meta.currency || "INR",
      exchange: meta.exchangeName || null,
    });

  } catch (error) {
    console.error("Stock Details ERROR:");
    console.error(error.response?.data || error.message);

    res.status(500).json({ error: "Failed to fetch stock details" });
  }
});



app.get("/stocks/search", (req, res) => {
  const query = req.query.q?.toLowerCase()?.trim();

  if (!query) {
    return res.json([]);
  }

  const results = stocks
    .filter((stock) => {
      const symbol = stock.symbol?.toLowerCase() || "";
      const name = stock.name?.toLowerCase() || "";

      return symbol.includes(query) || name.includes(query);
    })
    .slice(0, 50);

  res.json(results);
});
/*
  ---------------------------
  SERVER START
  ---------------------------
*/



app.get("/stocks/price", async (req, res) => {
  const symbol = req.query.symbol;

  if (!symbol) {
    return res.status(400).json({ error: "Symbol required" });
  }

  try {
    let yahooSymbol = symbol.toUpperCase();

if (!yahooSymbol.includes(".")) {
  yahooSymbol = `${yahooSymbol}.NS`;
}

    const response = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    const result = response.data.chart.result[0];
    const meta = result.meta;

    res.json({
      symbol: symbol,
      price: meta.regularMarketPrice,
      previousClose: meta.chartPreviousClose,
      change: (
        ((meta.regularMarketPrice - meta.chartPreviousClose) /
          meta.chartPreviousClose) *
        100
      ).toFixed(2),
    });

  } catch (error) {
  console.error("FULL ERROR:");
  console.error(error.response?.data);
  console.error(error.message);
  res.status(500).json({ error: "Failed to fetch stock details" });
}
});
app.get("/stocks/chart", async (req, res) => {
  const symbol = req.query.symbol;
  const range = req.query.range || "1d";
  const interval = req.query.interval || "5m";

  if (!symbol) {
    return res.status(400).json({ error: "Symbol required" });
  }

  try {
    let yahooSymbol = symbol.toUpperCase();

    if (!yahooSymbol.startsWith("^") && !yahooSymbol.includes(".")) {
      yahooSymbol = `${yahooSymbol}.NS`;
    }

    const response = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
      {
        params: { range, interval },
        headers: { "User-Agent": "Mozilla/5.0" },
      }
    );

    const result = response.data.chart.result?.[0];

    if (!result) {
      return res.status(404).json({ error: "No chart data" });
    }

    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];

    const candles = [];

    for (let i = 0; i < timestamps.length; i++) {
      if (
        quotes.open[i] == null ||
        quotes.high[i] == null ||
        quotes.low[i] == null ||
        quotes.close[i] == null
      ) continue;

      candles.push({
        time: timestamps[i],
        open: quotes.open[i],
        high: quotes.high[i],
        low: quotes.low[i],
        close: quotes.close[i],
      });
    }

    res.json(candles);

  } catch (error) {
    console.error("Chart error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch chart" });
  }
});

app.get("/indices", async (req, res) => {
  try {
    const indices = [
      { name: "NIFTY 50", symbol: "^NSEI" },
      { name: "SENSEX", symbol: "^BSESN" }
    ];

    const results = [];

    for (const index of indices) {
      try {
        const { data } = await axios.get(
          `https://query1.finance.yahoo.com/v8/finance/chart/${index.symbol}`,
          { headers: { "User-Agent": "Mozilla/5.0" } }
        );

        const result = data.chart?.result?.[0];

        if (!result) continue;

        const meta = result.meta;

        const price = meta.regularMarketPrice;
        const prev = meta.chartPreviousClose;

        if (!price || !prev) continue;

        const changePercent = ((price - prev) / prev) * 100;

        results.push({
          name: index.name,
          symbol: index.symbol,
          price,
          changePercent: Number(changePercent.toFixed(2))
        });

      } catch (err) {
        console.log("Index fetch failed:", index.symbol);
      }
    }

    res.json(results);

  } catch (error) {
    console.error("Index Route Crash:", error.message);
    res.status(500).json({ error: "Failed to fetch indices" });
  }
});
/* ============================
   TOP GAINERS (Mock NSE)
============================ */
app.get("/top-gainers", (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  res.json(marketCache.gainers.slice(0, limit));
});

/* ============================
   TOP LOSERS
============================ */
app.get("/top-losers", (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  res.json(marketCache.losers.slice(0, limit));
});

/* ============================
   INTRADAY MOVERS
============================ */
app.get("/intraday", (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  res.json(marketCache.intraday.slice(0, limit));
});
/* ============================
   SECTOR PERFORMANCE (Mock for now)
============================ */
app.get("/sectors", async (req, res) => {
  try {
    const sectors = {
      IT: ["TCS", "INFY", "HCLTECH", "WIPRO"],
      Banking: ["HDFCBANK", "ICICIBANK", "SBIN", "AXISBANK"],
      Energy: ["RELIANCE", "ONGC", "BPCL", "IOC"],
      Auto: ["MARUTI", "TATAMOTORS", "M&M", "BAJAJ-AUTO"],
      FMCG: ["ITC", "HINDUNILVR", "NESTLEIND", "BRITANNIA"]
    };

    const sectorResults = [];

    for (const sectorName in sectors) {
      const symbols = sectors[sectorName];

      const stockChanges = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const yahooSymbol = `${symbol}.NS`;

            const { data } = await axios.get(
              `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
              { headers: { "User-Agent": "Mozilla/5.0" } }
            );

            const meta = data.chart.result[0].meta;

            const price = Number(meta.regularMarketPrice);
            const prev = Number(meta.chartPreviousClose);

            return ((price - prev) / prev) * 100;
          } catch {
            return 0;
          }
        })
      );

      const avgChange =
        stockChanges.reduce((a, b) => a + b, 0) / stockChanges.length;

      sectorResults.push({
        name: sectorName,
        change: Number(avgChange.toFixed(2)),
      });
    }

    sectorResults.sort((a, b) => b.change - a.change);

    res.json(sectorResults);
  } catch (error) {
    console.error("Sector Error:", error.message);
    res.status(500).json({ error: "Failed to fetch sectors" });
  }
});



/* ============================
   STOCK NEWS
============================ */
app.get("/news", async (req, res) => {
  try {
    const response = await axios.get(
      "https://query1.finance.yahoo.com/v1/finance/search?q=nifty"
    );

    const newsItems = response.data.news || [];

    const headlines = await Promise.all(
      newsItems.slice(0, 5).map(async (item) => {
        const title = item.title || "";

        const sentiment = await analyzeSentimentHF(title);

        return {
          title,
          sentiment: sentiment[0]?.label || "Neutral",
          score: sentiment[0]?.score || 0,
        };
      })
    );

    res.json(headlines);

  } catch (error) {
    console.error("News Error:", error.message);
    res.json([]);
  }
});



const { HfInference } = require("@huggingface/inference");

const hf = new HfInference(process.env.HF_API_KEY);

async function analyzeSentimentHF(text) {
  const response = await axios.post(
    "https://api-inference.huggingface.co/models/nlptown/bert-base-multilingual-uncased-sentiment",
    { inputs: text },
    {
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
      },
    }
  );

  return response.data;
}

function startUpstoxStream() {
  const ws = new WebSocket("wss://api.upstox.com/v2/feed/market-data-feed", {
    headers: {
      Authorization: `Bearer ${upstoxAccessToken}`,
    },
  });

  ws.on("open", () => {
    console.log("📡 Connected to Upstox WebSocket");

    ws.send(JSON.stringify({
      guid: "arthex-stream",
      method: "subscribe",
      data: {
        instrumentKeys: [
          "NSE_EQ|INE002A01018"  // RELIANCE example
        ],
      },
    }));
  });

  ws.on("message", (data) => {
    const parsed = JSON.parse(data.toString());

    // Broadcast to Flutter clients
    io.emit("market-tick", parsed);
  });

  ws.on("error", (err) => {
    console.error("WebSocket Error:", err.message);
  });

  ws.on("close", () => {
    console.log("WebSocket closed");
  });
}
app.post("/user/create", async (req, res) => {
  const { name, email } = req.body;

  try {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.json(existingUser);
    }

    const newUser = await User.create({
      name,
      email,
      walletBalance: 100000
    });

    res.json(newUser);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "User creation failed" });
  }
});

app.get("/wallet/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      walletBalance: user.walletBalance,
    });

  } catch (error) {
    console.error("Wallet Fetch Error:", error.message);
    res.status(500).json({ error: "Failed to fetch wallet" });
  }
});

app.get("/transactions/:userId", async (req, res) => {
  try {
    const trades = await Trade.find({
      userId: req.params.userId
    }).sort({ createdAt: -1 });

    res.json(trades);

  } catch (error) {
    console.error("Transaction Fetch Error:", error.message);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

async function updateLeaderboardInstant(tournamentId) {
  const entries = await TournamentEntry.find({ tournamentId })
    .sort({ returnPercent: -1 })
    .populate("userId", "name");

  io.emit("leaderboard-update", entries.slice(0, 10));

  console.log("⚡ Instant leaderboard update sent");
}

async function endTournament(tournamentId) {
  console.log("🏁 Ending tournament...");

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament || !tournament.isActive) return;

  const entries = await TournamentEntry.find({ tournamentId })
    .sort({ returnPercent: -1 });

  if (entries.length === 0) return;

  const prizePool = tournament.prizePool;

  const distribution = [0.5, 0.3, 0.2];

  for (let i = 0; i < Math.min(3, entries.length); i++) {
    const winner = entries[i];
    const prize = prizePool * distribution[i];

    await User.findByIdAndUpdate(
      winner.userId,
      { $inc: { walletBalance: prize } }
    );

    console.log(`💰 Prize ₹${prize} given to ${winner.userId}`);
  }

  tournament.isActive = false;
  await tournament.save();

  io.emit("tournament-ended", {
    message: "Tournament has ended",
  });

  console.log("🏆 Tournament completed");
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
io.on("connection", (socket) => {
  console.log("📲 Flutter client connected");

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

  
