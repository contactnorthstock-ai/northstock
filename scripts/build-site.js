// ═══════════════════════════════════════════════════════════════
// NorthStock — Site Builder
// Reads dist/data/daily.json and injects content into the HTML
// ═══════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';

const distDir  = path.join(process.cwd(), 'dist');
const dataFile = path.join(distDir, 'data', 'daily.json');
const tmplFile = path.join(process.cwd(), 'index.html');

function fmt(n, dec = 2) {
  if (!n && n !== 0) return '—';
  return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtPct(n) {
  if (!n && n !== 0) return '—';
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}
function fmtPrice(n) {
  if (!n) return '—';
  return n > 1000 ? '$' + Math.round(n).toLocaleString() : fmt(n);
}

function badgeClass(badge) {
  const map = { Trending:'hot', Earnings:'earn', Canadian:'earn', Crypto:'div', ETF:'div', Analysis:'new', Markets:'new' };
  return map[badge] || 'new';
}

function buildTickerHTML(stocks, crypto) {
  const items = [
    { sym:'S&P 500', d: stocks['SPY'] },
    { sym:'NASDAQ',  d: stocks['QQQ'] },
    { sym:'TSX',     d: stocks['VFV.TO'] },
    { sym:'AAPL',    d: stocks['AAPL'] },
    { sym:'NVDA',    d: stocks['NVDA'] },
    { sym:'SHOP.TO', d: stocks['SHOP.TO'] },
    { sym:'RY.TO',   d: stocks['RY.TO'] },
    { sym:'BTC',     d: crypto['BTC'] },
    { sym:'ETH',     d: crypto['ETH'] },
  ].filter(x => x.d);

  const makeItem = ({ sym, d }) => {
    const cls  = (d.pct || d.dpPct || 0) >= 0 ? 'up' : 'dn';
    const sign = cls === 'up' ? '▲' : '▼';
    const pct  = Math.abs(d.pct || d.dpPct || 0).toFixed(2);
    const price = fmtPrice(d.price || d.c);
    return `<div class="ti"><span class="ti-sym">${sym}</span><span class="ti-p">${price}</span><span class="ti-c ${cls}">${sign}${pct}%</span></div><div class="tdot"></div>`;
  };

  const track = [...items, ...items].map(makeItem).join('');
  return track;
}

function buildArticlesHTML(articles) {
  return articles.map((a, i) => `
    <div class="article-card${i === 0 ? ' featured' : ''}">
      <div class="art-meta">
        <span class="badge ${badgeClass(a.badge)}">${a.badge}</span>
        <span class="art-ticker">${a.ticker}</span>
        <span class="art-time">${a.timeAgo}</span>
      </div>
      <div class="art-title">${a.title}</div>
      <div class="art-summary">${a.summary} ${a.body}</div>
      <div class="art-footer">
        <span class="art-tag">${a.tags}</span>
        <span class="art-read">Read more →</span>
      </div>
    </div>`).join('\n');
}

function buildMarketSnapshotHTML(stocks, crypto) {
  const rows = [
    { name: 'S&P 500',       d: stocks['SPY'] },
    { name: 'TSX Composite', d: stocks['VFV.TO'] },
    { name: 'NASDAQ',        d: stocks['QQQ'] },
    { name: 'Dow Jones',     d: stocks['DIA'] },
    { name: 'Bitcoin',       d: crypto['BTC'] },
    { name: 'Ethereum',      d: crypto['ETH'] },
  ].filter(x => x.d);

  return rows.map(({ name, d }) => {
    const pct = d.pct || d.dpPct || 0;
    const cls = pct >= 0 ? 'up' : 'dn';
    const sign = pct >= 0 ? '▲' : '▼';
    return `<div class="mrow"><span class="mname">${name}</span><span class="mval ${cls}">${fmtPrice(d.price || d.c)} ${sign} ${fmtPct(pct)}</span></div>`;
  }).join('\n');
}

function buildTopMoversHTML(topGainers, topLosers) {
  const gainerHTML = topGainers.slice(0, 3).map(s =>
    `<div class="wrow">
      <div><div class="wsym">${s.symbol}</div></div>
      <div><div class="wprice">${fmt(s.price)}</div><div class="wchg up">▲ ${fmtPct(s.pct)}</div></div>
    </div>`).join('');
  const loserHTML = topLosers.slice(0, 3).map(s =>
    `<div class="wrow">
      <div><div class="wsym">${s.symbol}</div></div>
      <div><div class="wprice">${fmt(s.price)}</div><div class="wchg dn">▼ ${fmtPct(Math.abs(s.pct))}</div></div>
    </div>`).join('');
  return { gainerHTML, loserHTML };
}

function buildHeroStats(stocks, crypto, articles) {
  const sp500Pct = stocks['SPY']?.pct || 0;
  const topGainer = Object.values(stocks).sort((a,b) => b.pct - a.pct)[0];
  const topLoser  = Object.values(stocks).sort((a,b) => a.pct - b.pct)[0];
  return `
    <div class="hstat">
      <div class="hstat-label">Articles today</div>
      <div class="hstat-val">${articles.length}</div>
      <div class="hstat-sub">Updated 5:00 AM EST</div>
    </div>
    <div class="hstat">
      <div class="hstat-label">S&P 500</div>
      <div class="hstat-val ${sp500Pct >= 0 ? 'green' : 'red'}">${fmtPrice(stocks['SPY']?.price)}</div>
      <div class="hstat-sub">${fmtPct(sp500Pct)} yesterday</div>
    </div>
    <div class="hstat">
      <div class="hstat-label">Top gainer</div>
      <div class="hstat-val green">${topGainer?.symbol} ${fmtPct(topGainer?.pct)}</div>
      <div class="hstat-sub">biggest move up</div>
    </div>
    <div class="hstat">
      <div class="hstat-label">Bitcoin</div>
      <div class="hstat-val ${(crypto['BTC']?.pct || 0) >= 0 ? 'gold' : 'red'}">${fmtPrice(crypto['BTC']?.price)}</div>
      <div class="hstat-sub">${fmtPct(crypto['BTC']?.pct || 0)} (24h)</div>
    </div>`;
}

// ── MAIN ─────────────────────────────────────────────────────────
function main() {
  console.log('🔨 Building NorthStock site...');

  if (!fs.existsSync(dataFile)) {
    console.error('❌ dist/data/daily.json not found — run generate-daily.js first');
    process.exit(1);
  }
  if (!fs.existsSync(tmplFile)) {
    console.error('❌ templates/index.template.html not found');
    process.exit(1);
  }

  const data      = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  let template    = fs.readFileSync(tmplFile, 'utf8');
  const { articles, market } = data;
  const { stocks, crypto, topGainers, topLosers } = market;
  const { gainerHTML, loserHTML } = buildTopMoversHTML(topGainers, topLosers);

  // Inject all dynamic content
  template = template
    .replace('{{TICKER_HTML}}',         buildTickerHTML(stocks, crypto))
    .replace('{{ARTICLES_HTML}}',       buildArticlesHTML(articles))
    .replace('{{MARKET_SNAPSHOT_HTML}}', buildMarketSnapshotHTML(stocks, crypto))
    .replace('{{TOP_GAINERS_HTML}}',    gainerHTML)
    .replace('{{TOP_LOSERS_HTML}}',     loserHTML)
    .replace('{{HERO_STATS_HTML}}',     buildHeroStats(stocks, crypto, articles))
    .replace('{{GENERATED_AT}}',        data.generatedAtMontreal)
    .replace(/{{TODAY}}/g,              data.generatedAtMontreal);

  // Write final HTML
  fs.writeFileSync(path.join(distDir, 'index.html'), template);
  console.log('✅ index.html built successfully');

  // Copy portfolio page as-is
  const portfolioSrc = path.join(process.cwd(), 'northstock-portfolio-live.html');
  if (fs.existsSync(portfolioSrc)) {
    fs.copyFileSync(portfolioSrc, path.join(distDir, 'northstock-portfolio-live.html'));
    console.log('✅ Portfolio page copied');
  }

  // Copy all additional pages
  const pages = [
    'earnings.html',
    'dividends.html',
    'screener.html',
    'auth.html',
    'canadian-stocks.html',
    'us-stocks.html',
    'crypto.html',
  ];
  pages.forEach(page => {
    const src = path.join(process.cwd(), page);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(distDir, page));
      console.log(`✅ ${page} copied`);
    } else {
      console.warn(`⚠️  ${page} not found — skipping`);
    }
  });

  console.log(`🚀 Site ready in /dist — ${articles.length} articles, live market data`);
}

main();
