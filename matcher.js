const fs = require("fs");
const path = require("path");

function loadCatalog() {
  const raw = fs.readFileSync(path.join(__dirname, "products.json"), "utf-8");
  return JSON.parse(raw);
}

/**
 * Finds the best reply for an incoming message based on keyword matches.
 * Returns null if no keyword (including fallback keywords) matches at all,
 * so callers can decide whether to stay silent.
 */
function findReply(incomingText) {
  if (!incomingText) return null;
  const catalog = loadCatalog();
  const text = incomingText.toLowerCase();

  // 1. Check specific products first (most relevant match wins)
  for (const product of catalog.products) {
    for (const kw of product.keywords) {
      if (text.includes(kw.toLowerCase())) {
        return product.reply;
      }
    }
  }

  // 2. Check general fallback keywords (price, link, buy, etc.)
  for (const kw of catalog.fallback.keywords) {
    if (text.includes(kw.toLowerCase())) {
      return catalog.fallback.reply;
    }
  }

  // No match — stay silent rather than spamming every message
  return null;
}

module.exports = { findReply, loadCatalog };
