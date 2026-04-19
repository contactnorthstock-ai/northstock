// ═══════════════════════════════════════════════════════════════
// NorthStock — Daily Content Generator
// Runs at 5:00 AM Montreal time via GitHub Actions
// Generates articles, fetches market data, builds the site
// ═══════════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const FINNHUB_KEY   = process.env.FINNHUB_API_KEY;
const COINGECKO_URL = 'https://api.coingecko.com/api/v3';
const FINNHUB_URL   = 'https://finnhub.io/api/v1';

const client = new Anthropic({ apiKey: ANTHROPIC_KEY });

// ── HELPERS ──────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function today() {
  return new Date().toLocaleDateString('en-CA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'America/Toronto'
  });
}

function todayShort() {
  return new Date().toLocaleDateString('en-CA', {
    year: 'numeric', month: 'short', day: 'numeric',
    timeZone: 'America/Toronto'
  });
}

function isWeekend() {
  const day = new Date().toLocaleDateString('en-CA', { weekday: 'long', timeZone: 'America/Toronto' });
  return day === 'Saturday' || day === 'Sunday';
}

// ── MARKET DATA FETCHING ─────────────────────────────────────────
async function fetchStockQuote(symbol) {
  try {
    const r = await fetch(`${FINNHUB_URL}/quote?symbol=${symbol}&token=${FINNHUB_KEY}`);
    const d = await r.json();
    if (d.c && d.c > 0) {
      return {
        symbol,
        price:  d.c,
        change: d.d  || 0,
        pct:    d.dp || 0,
        high:   d.h  || 0,
        low:    d.l  || 0,
        prev:   d.pc || 0
      };
    }
  } catch (e) { console.warn(`⚠ Could not fetch ${symbol}:`, e.message); }
  return null;
}

async function fetchCryptoQuotes() {
  try {
    const ids = 'bitcoin,ethereum,solana,ripple';
    const r = await fetch(`${COINGECKO_URL}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`);
    const d = await r.json();
    return {
      BTC: { price: d.bitcoin?.usd, pct: d.bitcoin?.usd_24h_change },
      ETH: { price: d.ethereum?.usd, pct: d.ethereum?.usd_24h_change },
      SOL: { price: d.solana?.usd, pct: d.solana?.usd_24h_change },
      XRP: { price: d.ripple?.usd, pct: d.ripple?.usd_24h_change },
    };
  } catch (e) { console.warn('⚠ Could not fetch crypto:', e.message); return {}; }
}

async function fetchAllMarketData() {
  console.log('📊 Fetching market data from Finnhub & CoinGecko...');

  const stockSymbols = ['SPY','QQQ','DIA','AAPL','NVDA','MSFT','AMZN','GOOGL','META','TSLA','INTC','AMD'];
  const tsxSymbols   = ['SHOP.TO','RY.TO','TD.TO','ENB.TO','CNR.TO','CNQ.TO','BMO.TO','BNS.TO','SU.TO'];
  const etfSymbols   = ['VFV.TO','XIU.TO','QQQ','SPY','VOO','GLD','XEF.TO'];

  const stocks = {};
  for (const sym of [...stockSymbols, ...tsxSymbols, ...etfSymbols]) {
    const q = await fetchStockQuote(sym);
    if (q) stocks[sym] = q;
    await sleep(150); // respect Finnhub rate limit
  }

  const crypto = await fetchCryptoQuotes();

  // Find top movers
  const allStocks = Object.values(stocks).filter(s => s.pct !== undefined);
  const topGainers = [...allStocks].sort((a,b) => b.pct - a.pct).slice(0,3);
  const topLosers  = [...allStocks].sort((a,b) => a.pct - b.pct).slice(0,3);

  console.log(`✅ Fetched ${Object.keys(stocks).length} stocks + ${Object.keys(crypto).length} cryptos`);
  return { stocks, crypto, topGainers, topLosers };
}

// ── ARTICLE GENERATION WITH CLAUDE ──────────────────────────────
async function generateArticles(marketData, count = 5) {
  console.log(`✍️  Generating ${count} articles with Claude AI...`);

  const { stocks, crypto, topGainers, topLosers } = marketData;
  const weekend = isWeekend();

  // Build market context string for Claude
  const marketContext = `
MARKET DATA AS OF ${today()} — 5:00 AM Montreal Time:

US INDICES:
- S&P 500 (SPY): $${stocks['SPY']?.price?.toFixed(2) || 'N/A'} (${stocks['SPY']?.pct?.toFixed(2) || 'N/A'}%)
- NASDAQ (QQQ): $${stocks['QQQ']?.price?.toFixed(2) || 'N/A'} (${stocks['QQQ']?.pct?.toFixed(2) || 'N/A'}%)
- Dow Jones (DIA): $${stocks['DIA']?.price?.toFixed(2) || 'N/A'} (${stocks['DIA']?.pct?.toFixed(2) || 'N/A'}%)

TOP MOVERS (yesterday's close):
Gainers: ${topGainers.map(s => `${s.symbol} +${s.pct?.toFixed(2)}%`).join(', ')}
Losers:  ${topLosers.map(s => `${s.symbol} ${s.pct?.toFixed(2)}%`).join(', ')}

KEY STOCKS:
- AAPL: $${stocks['AAPL']?.price?.toFixed(2) || 'N/A'} (${stocks['AAPL']?.pct?.toFixed(2) || 'N/A'}%)
- NVDA: $${stocks['NVDA']?.price?.toFixed(2) || 'N/A'} (${stocks['NVDA']?.pct?.toFixed(2) || 'N/A'}%)
- MSFT: $${stocks['MSFT']?.price?.toFixed(2) || 'N/A'} (${stocks['MSFT']?.pct?.toFixed(2) || 'N/A'}%)
- TSLA: $${stocks['TSLA']?.price?.toFixed(2) || 'N/A'} (${stocks['TSLA']?.pct?.toFixed(2) || 'N/A'}%)

TSX (CANADIAN STOCKS):
- SHOP.TO: $${stocks['SHOP.TO']?.price?.toFixed(2) || 'N/A'} (${stocks['SHOP.TO']?.pct?.toFixed(2) || 'N/A'}%)
- RY.TO: $${stocks['RY.TO']?.price?.toFixed(2) || 'N/A'} (${stocks['RY.TO']?.pct?.toFixed(2) || 'N/A'}%)
- ENB.TO: $${stocks['ENB.TO']?.price?.toFixed(2) || 'N/A'} (${stocks['ENB.TO']?.pct?.toFixed(2) || 'N/A'}%)
- CNR.TO: $${stocks['CNR.TO']?.price?.toFixed(2) || 'N/A'} (${stocks['CNR.TO']?.pct?.toFixed(2) || 'N/A'}%)

CRYPTO (24h):
- BTC: $${crypto['BTC']?.price?.toFixed(0) || 'N/A'} (${crypto['BTC']?.pct?.toFixed(2) || 'N/A'}%)
- ETH: $${crypto['ETH']?.price?.toFixed(2) || 'N/A'} (${crypto['ETH']?.pct?.toFixed(2) || 'N/A'}%)
- SOL: $${crypto['SOL']?.price?.toFixed(2) || 'N/A'} (${crypto['SOL']?.pct?.toFixed(2) || 'N/A'}%)
  `.trim();

  const articleTopics = weekend ? [
    'Weekly market recap and what to watch next week',
    'Top Canadian dividend stocks for your TFSA this week',
    'Crypto market weekly summary — BTC, ETH, SOL performance',
    'Best performing ETFs this week — TSX and US markets',
    'Weekend investing read: one undervalued stock to research',
  ] : [
    `Morning market briefing — what moved overnight and what to watch today`,
    `Top mover analysis — why ${topGainers[0]?.symbol || 'a key stock'} is up ${topGainers[0]?.pct?.toFixed(1) || ''}% and what it means`,
    `Canadian investor focus — TSX stocks and TFSA strategy for today`,
    `Crypto market update — Bitcoin and Ethereum this morning`,
    `Today's earnings preview and key economic data to watch`,
  ];

  const articles = [];

  for (let i = 0; i < Math.min(count, articleTopics.length); i++) {
    console.log(`  📝 Article ${i+1}/${count}: ${articleTopics[i]}`);

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `You are a financial journalist for NorthStock, a Canadian and US stock market news site targeting retail investors in Canada and the US.

Write a concise, engaging financial news article based on the topic and real market data below.

TOPIC: ${articleTopics[i]}

${marketContext}

REQUIREMENTS:
- Write 180-220 words
- Use the actual market data numbers provided above
- Target Canadian retail investors (mention TFSA/RRSP when relevant)
- Professional but accessible tone — not too technical
- Include a clear "what this means for investors" angle
- End with one actionable takeaway
- DO NOT give specific buy/sell advice — frame as informational
- DO NOT use markdown headers or bullet points — write in flowing paragraphs

Return ONLY a JSON object with this exact structure (no other text):
{
  "title": "Article headline (max 85 chars, compelling)",
  "summary": "One sentence teaser (max 120 chars)",
  "body": "Full article text (180-220 words, plain paragraphs)",
  "badge": "One of: Trending | Earnings | Canadian | Crypto | ETF | Analysis | Markets",
  "ticker": "Most relevant ticker symbol (e.g. NVDA, RY.TO, BTC)",
  "tags": "3-4 relevant tags separated by · (e.g. TSX · Dividends · TFSA)"
}`
        }]
      });

      const raw = response.content[0].text.trim();
      // Strip any markdown fences if present
      const clean = raw.replace(/```json|```/g, '').trim();
      const article = JSON.parse(clean);
      article.id = `art-${Date.now()}-${i}`;
      article.date = todayShort();
      article.timeAgo = `${i === 0 ? 'Just now' : i + 'h ago'}`;
      articles.push(article);
      console.log(`  ✅ "${article.title.slice(0,50)}..."`);
    } catch (e) {
      console.warn(`  ⚠ Article ${i+1} failed:`, e.message);
    }

    await sleep(500); // avoid rate limits
  }

  console.log(`✅ Generated ${articles.length} articles`);
  return articles;
}

// ── SAVE DATA ────────────────────────────────────────────────────
function saveData(articles, marketData) {
  const distDir = path.join(process.cwd(), 'dist');
  const dataDir = path.join(distDir, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const payload = {
    generatedAt: new Date().toISOString(),
    generatedAtMontreal: today(),
    articles,
    market: {
      stocks: marketData.stocks,
      crypto: marketData.crypto,
      topGainers: marketData.topGainers,
      topLosers:  marketData.topLosers,
    }
  };

  fs.writeFileSync(
    path.join(dataDir, 'daily.json'),
    JSON.stringify(payload, null, 2)
  );
  console.log('💾 Data saved to dist/data/daily.json');
  return payload;
}

// ── MAIN ─────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('🌅 ═══════════════════════════════════════════════');
  console.log(`   NorthStock Daily Generator — ${today()}`);
  console.log('   5:00 AM Montreal Time');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  // 1. Fetch market data
  const marketData = await fetchAllMarketData();

  // 2. Generate articles with Claude
  const articleCount = isWeekend() ? 3 : 5;
  const articles = await generateArticles(marketData, articleCount);

  // 3. Save everything
  const payload = saveData(articles, marketData);

  console.log('');
  console.log(`✅ Done! ${articles.length} articles generated.`);
  console.log('🚀 Ready for build-site.js → Netlify deploy');
  console.log('');
}

main().catch(err => {
  console.error('❌ Generator failed:', err);
  process.exit(1);
});
