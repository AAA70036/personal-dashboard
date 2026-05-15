const STALE_MS = 60 * 60 * 1000;

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function changeClass(pct) {
  if (pct > 0) return "change-pos";
  if (pct < 0) return "change-neg";
  return "change-neu";
}

function arrow(pct) {
  if (pct > 0) return "▲";
  if (pct < 0) return "▼";
  return "";
}

function formatChange(val, pct) {
  const sign = val > 0 ? "+" : "";
  return `${arrow(pct)} ${sign}${val} (${sign}${pct}%)`;
}

function relativeTime(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function scoreClass(score) {
  if (score === "E" || score === "0") return "score-even";
  const n = parseFloat(score);
  if (isNaN(n)) return "score-even";
  if (n < 0) return "score-under";
  if (n > 0) return "score-over";
  return "score-even";
}

function renderMarkets(data) {
  const indexes = Object.entries(data.indexes).map(([name, q]) => `
    <div class="index-row">
      <span class="index-name">${name}</span>
      <span class="index-price">${q.price.toLocaleString()}</span>
      <span class="index-change ${changeClass(q.pct_change)}">${formatChange(q.change, q.pct_change)}</span>
    </div>
  `).join("");

  const gainers = data.gainers.map(m => `
    <div class="mover-row">
      <span class="mover-symbol">${m.symbol}</span>
      <span class="change-pos">${arrow(1)} ${m.pct_change}%</span>
    </div>
  `).join("");

  const losers = data.losers.map(m => `
    <div class="mover-row">
      <span class="mover-symbol">${m.symbol}</span>
      <span class="change-neg">${arrow(-1)} ${m.pct_change}%</span>
    </div>
  `).join("");

  return `
    ${indexes}
    <div class="movers-grid">
      <div>
        <div class="movers-label">Gainers</div>
        ${gainers}
      </div>
      <div>
        <div class="movers-label">Losers</div>
        ${losers}
      </div>
    </div>
  `;
}

function renderNews(data) {
  return data.items.slice(0, 5).map(item => {
    const age = item.published ? relativeTime(item.published) : "";
    return `
      <div class="news-item">
        <a href="${item.link}" target="_blank" rel="noopener">${item.title}</a>
        <div class="news-meta">
          <span class="news-source">${item.source}</span> &middot; ${age}
        </div>
      </div>
    `;
  }).join("");
}

function renderGolf(data) {
  const lb = data.leaderboard;
  if (!lb.players || lb.players.length === 0) {
    return `
      <div class="tournament-name">${lb.tournament}</div>
      <div class="tournament-status">${lb.status}</div>
      <p style="color:#444;margin-top:0.5rem">No leaderboard data yet.</p>
    `;
  }

  const rows = lb.players.slice(0, 8).map(p => `
    <tr>
      <td class="col-pos">${p.position}</td>
      <td class="col-name">${p.name}</td>
      <td class="${scoreClass(p.total)}">${p.total}</td>
      <td>${p.round_score}</td>
      <td>${p.thru}</td>
    </tr>
  `).join("");

  return `
    <div class="tournament-name">${lb.tournament}</div>
    <div class="tournament-status">${lb.status}</div>
    <table class="leaderboard-table">
      <thead>
        <tr>
          <th>Pos</th><th>Player</th><th>Total</th><th>Rd</th><th>Thru</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function setCard(id, html) {
  document.querySelector(`#${id} .card-body`).innerHTML = html;
}

function setError(id, msg) {
  document.querySelector(`#${id} .card-body`).innerHTML =
    `<span class="error-msg">Failed to load: ${msg}</span>`;
}

async function renderLastUpdated(data) {
  const el = document.getElementById("last-updated");
  const ageMs = Date.now() - new Date(data.timestamp).getTime();
  const ageMins = Math.floor(ageMs / 60000);
  const ageStr = ageMins < 1 ? "just now" : `${ageMins}m ago`;

  const failedSources = Object.entries(data.statuses)
    .filter(([, v]) => v !== "ok")
    .map(([k]) => k)
    .join(", ");

  const stale = ageMs > STALE_MS ? `<span class="stale-badge">stale</span>` : "";

  el.innerHTML = `Updated ${ageStr}${stale}` +
    (failedSources ? ` &middot; errors: ${failedSources}` : "");
}

async function init() {
  const [lastUpdated, markets, news, pga, liv] = await Promise.allSettled([
    loadJSON("data/last_updated.json"),
    loadJSON("data/markets.json"),
    loadJSON("data/news.json"),
    loadJSON("data/pga.json"),
    loadJSON("data/liv.json"),
  ]);

  if (lastUpdated.status === "fulfilled") renderLastUpdated(lastUpdated.value);

  markets.status === "fulfilled"
    ? setCard("card-markets", renderMarkets(markets.value))
    : setError("card-markets", markets.reason.message);

  news.status === "fulfilled"
    ? setCard("card-news", renderNews(news.value))
    : setError("card-news", news.reason.message);

  pga.status === "fulfilled"
    ? setCard("card-pga", renderGolf(pga.value))
    : setError("card-pga", pga.reason.message);

  liv.status === "fulfilled"
    ? setCard("card-liv", renderGolf(liv.value))
    : setError("card-liv", liv.reason.message);
}

init();
