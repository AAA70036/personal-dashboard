const STALE_MS = 60 * 60 * 1000; // 1 hour

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

function formatChange(val, pct) {
  const sign = val > 0 ? "+" : "";
  return `${sign}${val} (${sign}${pct}%)`;
}

function renderMarkets(data) {
  const indexes = Object.entries(data.indexes).map(([name, q]) => `
    <div class="index-row">
      <span class="index-name">${name}</span>
      <span class="index-price">${q.price.toLocaleString()}</span>
      <span class="${changeClass(q.pct_change)}">${formatChange(q.change, q.pct_change)}</span>
    </div>
  `).join("");

  const gainers = data.gainers.map(m => `
    <div class="mover-row">
      <span>${m.symbol}</span>
      <span class="change-pos">${formatChange(m.change, m.pct_change)}</span>
    </div>
  `).join("");

  const losers = data.losers.map(m => `
    <div class="mover-row">
      <span>${m.symbol}</span>
      <span class="change-neg">${formatChange(m.change, m.pct_change)}</span>
    </div>
  `).join("");

  return `
    ${indexes}
    <div class="movers-section">
      <div class="movers-label">Top Gainers</div>
      ${gainers}
    </div>
    <div class="movers-section">
      <div class="movers-label">Top Losers</div>
      ${losers}
    </div>
  `;
}

function renderNews(data) {
  return data.items.map(item => {
    const date = item.published ? new Date(item.published).toLocaleString() : "";
    return `
      <div class="news-item">
        <a href="${item.link}" target="_blank" rel="noopener">${item.title}</a>
        <div class="news-meta">${item.source} &middot; ${date}</div>
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
      <div class="card-body" style="color:#555">No leaderboard data yet.</div>
    `;
  }

  const rows = lb.players.map(p => `
    <tr>
      <td>${p.position}</td>
      <td>${p.name}</td>
      <td class="score-total">${p.total}</td>
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
  const ts = new Date(data.timestamp);
  const ageMs = Date.now() - ts.getTime();
  const ageMins = Math.floor(ageMs / 60000);
  const ageStr = ageMins < 1 ? "just now" : `${ageMins}m ago`;

  let statusStr = Object.entries(data.statuses)
    .filter(([, v]) => v !== "ok")
    .map(([k]) => k)
    .join(", ");

  const stale = ageMs > STALE_MS
    ? `<span class="stale-badge">stale</span>`
    : "";

  el.innerHTML = `Last updated ${ageStr}${stale}` +
    (statusStr ? ` &middot; fetch errors: ${statusStr}` : "");
}

async function init() {
  const [lastUpdated, markets, news, pga, liv] = await Promise.allSettled([
    loadJSON("data/last_updated.json"),
    loadJSON("data/markets.json"),
    loadJSON("data/news.json"),
    loadJSON("data/pga.json"),
    loadJSON("data/liv.json"),
  ]);

  if (lastUpdated.status === "fulfilled") {
    renderLastUpdated(lastUpdated.value);
  }

  if (markets.status === "fulfilled") {
    setCard("card-markets", renderMarkets(markets.value));
  } else {
    setError("card-markets", markets.reason.message);
  }

  if (news.status === "fulfilled") {
    setCard("card-news", renderNews(news.value));
  } else {
    setError("card-news", news.reason.message);
  }

  if (pga.status === "fulfilled") {
    setCard("card-pga", renderGolf(pga.value));
  } else {
    setError("card-pga", pga.reason.message);
  }

  if (liv.status === "fulfilled") {
    setCard("card-liv", renderGolf(liv.value));
  } else {
    setError("card-liv", liv.reason.message);
  }
}

init();
