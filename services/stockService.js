const fs = require("fs");
const csv = require("csv-parser");

let stocks = [];

function loadStocks() {
  return new Promise((resolve, reject) => {
    stocks = [];

    fs.createReadStream("./data/EQUITY_L.csv")
      .pipe(csv())
      .on("data", (row) => {
        stocks.push({
          symbol: row.SYMBOL,
          name: row["NAME OF COMPANY"],
          exchange: "NSE",
        });
      })
      .on("end", () => {
        console.log(`✅ Loaded ${stocks.length} stocks`);
        resolve();
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

function searchStocks(query) {
  if (!query) return [];

  query = query.toLowerCase();

  return stocks
    .filter(
      (stock) =>
        stock.symbol.toLowerCase().includes(query) ||
        stock.name.toLowerCase().includes(query)
    )
    .slice(0, 20);
}

module.exports = {
  loadStocks,
  searchStocks,
};