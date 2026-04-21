import json
import urllib.request
import urllib.parse
import datetime
import os
import sys

symbols = [
    "SHOP.TO", "RY.TO", "ENB.TO", "TD.TO", "CNR.TO",
    "ATD.TO", "SU.TO", "BNS.TO", "BMO.TO", "MFC.TO",
    "BCE.TO", "TRI.TO", "IFC.TO", "WCN.TO", "QSR.TO",
    "CP.TO", "TRP.TO", "PPL.TO", "CVE.TO", "ABX.TO"
]

syms_str = urllib.parse.quote(",".join(symbols))
fields = "regularMarketPrice,regularMarketChangePercent"
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json,text/plain,*/*",
    "Accept-Language": "en-US,en;q=0.9",
}

prices = {}
urls = [
    f"https://query1.finance.yahoo.com/v7/finance/quote?symbols={syms_str}&fields={fields}",
    f"https://query2.finance.yahoo.com/v7/finance/quote?symbols={syms_str}&fields={fields}",
]

for url in urls:
    if prices:
        break
    try:
        print(f"Trying: {url[:80]}...")
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.loads(r.read().decode("utf-8"))
        results = data.get("quoteResponse", {}).get("result", [])
        for q in results:
            sym = q.get("symbol", "")
            price = q.get("regularMarketPrice", 0)
            pct = q.get("regularMarketChangePercent", 0)
            if price and price > 0:
                prices[sym] = {"price": round(float(price), 2), "pct": round(float(pct), 4)}
                print(f"  {sym}: ${price:.2f} ({pct:+.2f}%)")
        print(f"Fetched {len(prices)} prices from this URL")
    except Exception as e:
        print(f"Failed: {e}")

if not prices:
    print("WARNING: No prices fetched — keeping existing data file if present")
    sys.exit(0)

now = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
output = {"updatedAt": now, "prices": prices}

os.makedirs("data", exist_ok=True)
with open("data/prices-tsx.json", "w") as f:
    json.dump(output, f, indent=2)

print(f"\nWrote {len(prices)} prices to data/prices-tsx.json")
print(f"Updated at: {now}")
