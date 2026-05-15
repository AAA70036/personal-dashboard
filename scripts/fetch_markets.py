import yfinance as yf

INDEXES = {
    "S&P 500": "^GSPC",
    "Dow":     "^DJI",
    "Nasdaq":  "^IXIC",
}

MOVERS_TICKERS = [
    "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL",
    "META", "TSLA", "BRK-B", "JPM", "V",
    "UNH", "XOM", "LLY", "JNJ", "WMT",
    "MA", "PG", "HD", "MRK", "ORCL",
]


def fetch_quote(ticker_symbol):
    info = yf.Ticker(ticker_symbol).fast_info
    price = info.last_price
    prev_close = info.previous_close
    change = price - prev_close
    pct_change = (change / prev_close) * 100
    return {
        "price": round(price, 2),
        "change": round(change, 2),
        "pct_change": round(pct_change, 2),
    }


def fetch_markets():
    result = {"indexes": {}, "gainers": [], "losers": []}

    for name, symbol in INDEXES.items():
        result["indexes"][name] = {"symbol": symbol, **fetch_quote(symbol)}

    movers = []
    for symbol in MOVERS_TICKERS:
        quote = fetch_quote(symbol)
        movers.append({"symbol": symbol, **quote})

    movers.sort(key=lambda x: x["pct_change"])
    result["losers"] = movers[:3]
    result["gainers"] = movers[-3:][::-1]

    return result


if __name__ == "__main__":
    import json
    data = fetch_markets()
    print(json.dumps(data, indent=2))
