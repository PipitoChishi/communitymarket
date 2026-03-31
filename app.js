/* ══════════════════════════════════════════════════════════
   PriceWatch – app.js
   Frontend logic – all data loaded from the REST API
   API base: http://localhost:3001/api
   ══════════════════════════════════════════════════════════ */

'use strict';

const API = 'http://localhost:3001/api';

// ────────────────────────────────────────────────────────────
// STATE
// ────────────────────────────────────────────────────────────
let activeCategory = 'all';
let activeChartCat = 'groceries';
let searchQuery    = '';
let sortMode       = 'recent';
let visibleCount   = 9;
let allProducts    = [];   // cached from last fetch
let priceChart     = null; // Chart.js instance

// ────────────────────────────────────────────────────────────
// CONSTANTS
// ────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id:'all',          label:'All',           emoji:'🌐' },
  { id:'groceries',    label:'Groceries',     emoji:'🛒' },
  { id:'vegetables',   label:'Vegetables',    emoji:'🥦' },
  { id:'fuel',         label:'Fuel',          emoji:'⛽' },
  { id:'electronics',  label:'Electronics',   emoji:'💻' },
  { id:'clothing',     label:'Clothing',      emoji:'👕' },
  { id:'medicine',     label:'Medicine',      emoji:'💊' },
  { id:'transport',    label:'Transport',     emoji:'🚗' },
  { id:'housing',      label:'Housing',       emoji:'🏠' },
];

// ────────────────────────────────────────────────────────────
// INIT
// ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  setupNavScroll();
  setupHamburger();
  buildFilterPills();
  setupSearch();
  setupSort();
  setupChartTabs();
  setupLoadMore();

  // Show skeletons while data loads
  showProductSkeletons();
  showOverviewSkeletons();

  // Parallel data load
  await Promise.all([
    loadStats(),
    loadTicker(),
    loadOverview(),
    loadProducts(),
    loadChart(activeChartCat),
    loadLeaderboard(),
    loadFeed(),
  ]);

  // Live polling every 20 seconds
  setInterval(() => { loadTicker(); loadFeed(); }, 20_000);
});

// ────────────────────────────────────────────────────────────
// FETCH HELPER
// ────────────────────────────────────────────────────────────
async function apiFetch(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

// ────────────────────────────────────────────────────────────
// STATS
// ────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const data = await apiFetch('/stats');
    animateCounter('statReports',   data.reports,    '');
    animateCounter('statUsers',     data.contribs,   '');
    animateCounter('statCities',    data.cities,     '+');
    animateCounter('statCategories',data.categories, '+');
  } catch (e) {
    console.warn('Stats load failed:', e.message);
  }
}

function animateCounter(elId, end, suffix) {
  const el = document.getElementById(elId);
  if (!el) return;
  const duration = 1800;
  const start = Date.now();
  const tick = () => {
    const progress = Math.min((Date.now() - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * end).toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ────────────────────────────────────────────────────────────
// TICKER
// ────────────────────────────────────────────────────────────
async function loadTicker() {
  try {
    const items = await apiFetch('/ticker');
    buildTicker(items);
  } catch (e) {
    console.warn('Ticker load failed:', e.message);
  }
}

function buildTicker(items) {
  const track = document.getElementById('tickerTrack');
  if (!track) return;
  const all = [...items, ...items]; // duplicate for seamless loop
  track.innerHTML = all.map(t => `
    <span class="ticker-item">
      <span>${t.icon}</span>
      <span class="t-name">${t.name}</span>
      <span class="t-price">${t.price}</span>
      <span class="${t.up ? 't-up' : 't-down'}">${t.up ? '▲' : '▼'} ${t.change}</span>
    </span>
  `).join('');
}

// ────────────────────────────────────────────────────────────
// OVERVIEW CARDS
// ────────────────────────────────────────────────────────────
function showOverviewSkeletons() {
  const grid = document.getElementById('overviewGrid');
  if (!grid) return;
  grid.innerHTML = Array(8).fill(`
    <div class="overview-card" style="gap:12px;display:flex;flex-direction:column;">
      <div class="skeleton" style="width:40px;height:40px;border-radius:8px;"></div>
      <div class="skeleton" style="width:60%;height:12px;"></div>
      <div class="skeleton" style="width:80%;height:28px;"></div>
      <div class="skeleton" style="width:50%;height:12px;"></div>
    </div>
  `).join('');
}

async function loadOverview() {
  try {
    const cards = await apiFetch('/overview');
    buildOverview(cards);
  } catch (e) {
    console.warn('Overview load failed:', e.message);
    document.getElementById('overviewGrid').innerHTML =
      `<p style="color:var(--text3);text-align:center;grid-column:1/-1;">Could not load market data.</p>`;
  }
}

function buildOverview(cards) {
  const grid = document.getElementById('overviewGrid');
  if (!grid) return;
  const grads = [
    '#7c6bff,#5eead4','#f97316,#fbbf24','#34d399,#38bdf8','#fb7185,#f97316',
    '#818cf8,#c084fc','#38bdf8,#34d399','#fb7185,#fb923c','#a78bfa,#60a5fa'
  ];
  grid.innerHTML = cards.map((d, i) => `
    <div class="overview-card" style="--card-grad:linear-gradient(135deg,${grads[i % grads.length]});">
      <div class="ov-icon">${d.icon}</div>
      <div class="ov-label">${d.label}</div>
      <div class="ov-price">${d.price}</div>
      <div class="ov-change ${d.up ? 'up' : 'down'}">${d.up ? '▲' : '▼'} ${d.change} vs last report</div>
      <div class="ov-meta">${d.meta}</div>
    </div>
  `).join('');
}

// ────────────────────────────────────────────────────────────
// CHART
// ────────────────────────────────────────────────────────────
async function loadChart(category) {
  try {
    const data = await apiFetch(`/chart/${category}`);
    const labels = data.points.map(p => {
      const d = new Date(p.date);
      return d.toLocaleDateString('en-IN', { day:'numeric', month:'short' });
    });
    const prices = data.points.map(p => p.price);
    renderChart(labels, prices, data.color, data.label);
    updateChartLegend(prices, data.color, data.label);
  } catch (e) {
    console.warn('Chart load failed:', e.message);
  }
}

function renderChart(labels, prices, color, label) {
  const ctx = document.getElementById('priceChart');
  if (!ctx) return;
  const context = ctx.getContext('2d');

  const gradient = context.createLinearGradient(0, 0, 0, 350);
  gradient.addColorStop(0, hexToRgba(color, 0.35));
  gradient.addColorStop(1, hexToRgba(color, 0.0));

  const dataset = {
    label,
    data: prices,
    borderColor: color,
    backgroundColor: gradient,
    fill: true,
    tension: 0.4,
    pointRadius: 3,
    pointHoverRadius: 7,
    pointBackgroundColor: color,
    pointBorderColor: '#fff',
    pointBorderWidth: 2,
    borderWidth: 2.5,
  };

  if (priceChart) {
    priceChart.data.labels             = labels;
    priceChart.data.datasets[0]        = dataset;
    priceChart.update('active');
  } else {
    priceChart = new Chart(context, {
      type: 'line',
      data: { labels, datasets: [dataset] },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 3,
        interaction: { intersect:false, mode:'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(17,20,34,0.95)',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: 12,
            titleColor: '#9ba3c7',
            bodyColor:  '#e8eaf6',
            callbacks: {
              label: ctx => ` ₹ ${ctx.parsed.y.toFixed(2)}`,
            }
          }
        },
        scales: {
          x: {
            grid:  { color:'rgba(255,255,255,0.04)', drawBorder:false },
            ticks: { color:'#5b6494', font:{ size:11 }, maxTicksLimit:10 }
          },
          y: {
            grid:  { color:'rgba(255,255,255,0.04)', drawBorder:false },
            ticks: { color:'#5b6494', font:{ size:11 }, callback: v => '₹' + v }
          }
        }
      }
    });
  }
}

function updateChartLegend(prices, color, label) {
  const max = Math.max(...prices), min = Math.min(...prices);
  const cur = prices[prices.length - 1];
  const change = (((cur - prices[0]) / prices[0]) * 100).toFixed(1);
  const up = change >= 0;
  document.getElementById('chartLegend').innerHTML = `
    <div class="legend-item"><span class="legend-dot" style="background:${color}"></span>${label}</div>
    <div class="legend-item">📍 Current: <strong>₹${cur}</strong></div>
    <div class="legend-item">📈 30-day High: <strong>₹${max}</strong></div>
    <div class="legend-item">📉 30-day Low: <strong>₹${min}</strong></div>
    <div class="legend-item">Trend: <strong style="color:${up ? '#34d399' : '#fb7185'}">${up ? '▲' : '▼'} ${Math.abs(change)}%</strong></div>
  `;
}

function setupChartTabs() {
  document.querySelectorAll('.chart-tab').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeChartCat = btn.dataset.cat;
      await loadChart(activeChartCat);
    });
  });
}

// ────────────────────────────────────────────────────────────
// PRODUCTS
// ────────────────────────────────────────────────────────────
function showProductSkeletons() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  grid.innerHTML = Array(6).fill(`
    <div class="product-card" style="gap:10px;display:flex;flex-direction:column;">
      <div class="skeleton" style="width:90px;height:20px;border-radius:99px;"></div>
      <div class="skeleton" style="width:80%;height:18px;"></div>
      <div class="skeleton" style="width:60%;height:12px;"></div>
      <div style="display:flex;gap:8px;align-items:center;">
        <div class="skeleton" style="width:80px;height:32px;"></div>
        <div class="skeleton" style="width:120px;height:40px;flex:1;border-radius:8px;"></div>
      </div>
      <div class="skeleton" style="width:100%;height:12px;"></div>
    </div>
  `).join('');
}

async function loadProducts() {
  try {
    const params = new URLSearchParams({ sort: sortMode, limit: 100 });
    if (activeCategory !== 'all') params.set('category', activeCategory);
    if (searchQuery) params.set('search', searchQuery);

    const data = await apiFetch(`/products?${params}`);
    allProducts = data;
    renderProducts();
  } catch (e) {
    console.warn('Products load failed:', e.message);
    document.getElementById('productsGrid').innerHTML =
      `<div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--text3);">
        <div style="font-size:3rem;margin-bottom:12px;">⚠️</div>
        <p>Could not connect to the server. Make sure it's running on port 3001.</p>
        <p style="margin-top:8px;font-size:0.82rem;">Run: <code style="background:var(--surface);padding:2px 8px;border-radius:4px;">npm start</code></p>
      </div>`;
  }
}

function getFilteredProducts() {
  let list = [...allProducts];
  if (activeCategory !== 'all') list = list.filter(p => p.category === activeCategory);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q)  ||
      p.city.toLowerCase().includes(q)  ||
      (p.store && p.store.toLowerCase().includes(q))
    );
  }
  switch (sortMode) {
    case 'price-asc':  list.sort((a,b) => a.price - b.price); break;
    case 'price-desc': list.sort((a,b) => b.price - a.price); break;
    case 'change':
      list.sort((a,b) => {
        const ca = a.pctChange ? a.pctChange.value : 0;
        const cb = b.pctChange ? b.pctChange.value : 0;
        return cb - ca;
      });
      break;
    default: break;
  }
  return list;
}

function sparklineSVG(product) {
  const base = product.prev_price || product.price;
  const cur  = product.price;
  const pts  = [base];
  let v = base;
  for (let i = 0; i < 9; i++) { v += (Math.random()-0.4)*(base*0.04); pts.push(v); }
  pts.push(cur);
  const mn = Math.min(...pts), mx = Math.max(...pts);
  const rng = mx - mn || 1;
  const W = 220, H = 40;
  const coords = pts.map((p,i) => {
    const x = (i / (pts.length-1)) * W;
    const y = H - ((p - mn) / rng) * (H - 6) - 3;
    return `${x},${y}`;
  });
  const up = cur >= base;
  const color = up ? '#34d399' : '#fb7185';
  const areaPath = `M${coords.join('L')}L${W},${H}L0,${H}Z`;
  return `<svg class="sparkline-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <defs>
      <linearGradient id="sg${product.id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path class="spark-area" d="${areaPath}" fill="url(#sg${product.id})"/>
    <polyline class="spark-line" points="${coords.join(' ')}" stroke="${color}"/>
  </svg>`;
}

function priceDisplay(p) {
  if (p.price >= 1000) return '₹' + (p.price/1000).toFixed(1) + 'k';
  return '₹' + p.price;
}

function renderProducts() {
  const grid  = document.getElementById('productsGrid');
  const list  = getFilteredProducts();
  const shown = list.slice(0, visibleCount);

  if (!shown.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--text3);">
        <div style="font-size:3rem;margin-bottom:12px;">🔍</div>
        <p>No products found. Try adjusting your filters.</p>
      </div>`;
    document.getElementById('loadMoreBtn').style.display = 'none';
    return;
  }

  grid.innerHTML = shown.map(p => {
    const ch      = p.pctChange || { value:0, direction:'flat' };
    const catInfo = CATEGORIES.find(c => c.id === p.category) || { emoji:'📦', label:p.category };
    const chCls   = ch.direction === 'up' ? 'up' : ch.direction === 'down' ? 'down' : 'flat';
    const arrow   = ch.direction === 'up' ? '▲' : ch.direction === 'down' ? '▼' : '–';
    return `
    <div class="product-card" id="product-${p.id}" onclick="showProductDetail(${p.id})">
      <div class="pc-category-badge">${catInfo.emoji} ${catInfo.label}</div>
      <div class="pc-name">${p.name}</div>
      <div class="pc-location">📍 ${p.store}, ${p.city}</div>
      <div class="pc-price-row">
        <div class="pc-price">${priceDisplay(p)}</div>
        <div class="pc-unit">${p.unit}</div>
        <div class="pc-change ${chCls}">${arrow} ${ch.value}%</div>
      </div>
      <div class="pc-sparkline">${sparklineSVG(p)}</div>
      <div class="pc-meta">
        <span>${p.verified ? '<span class="pc-verified">✓ Verified</span>' : '⏳ Unverified'}</span>
        <span>👤 ${p.reporter}</span>
        <span>🕐 ${p.time}</span>
      </div>
    </div>`;
  }).join('');

  const btn = document.getElementById('loadMoreBtn');
  btn.style.display = list.length > visibleCount ? 'inline-flex' : 'none';
}

function showProductDetail(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  showToast(`📊 ${p.name} – ₹${p.price} ${p.unit} at ${p.store}, ${p.city}`);
}

function setupSearch() {
  document.getElementById('searchInput').addEventListener('input', e => {
    searchQuery  = e.target.value.trim();
    visibleCount = 9;
    renderProducts();
  });
}

function setupSort() {
  document.getElementById('sortSelect').addEventListener('change', e => {
    sortMode = e.target.value;
    renderProducts();
  });
}

function setupLoadMore() {
  document.getElementById('loadMoreBtn').addEventListener('click', () => {
    visibleCount += 6;
    renderProducts();
  });
}

// ────────────────────────────────────────────────────────────
// FILTER PILLS
// ────────────────────────────────────────────────────────────
function buildFilterPills() {
  const wrap = document.getElementById('filterPills');
  if (!wrap) return;
  wrap.innerHTML = CATEGORIES.map(c => `
    <button class="filter-pill ${c.id === 'all' ? 'active' : ''}" id="pill-${c.id}" data-id="${c.id}">
      ${c.emoji} ${c.label}
    </button>
  `).join('');
  wrap.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      wrap.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.dataset.id;
      visibleCount   = 9;
      renderProducts();
    });
  });
}

// ────────────────────────────────────────────────────────────
// LEADERBOARD
// ────────────────────────────────────────────────────────────
async function loadLeaderboard() {
  try {
    const data = await apiFetch('/leaderboard');
    buildLeaderboard(data);
  } catch (e) {
    console.warn('Leaderboard load failed:', e.message);
  }
}

function buildLeaderboard(data) {
  const table = document.getElementById('lbTable');
  if (!table) return;
  const rankClass = r => r===1?'top1': r===2?'top2': r===3?'top3':'';

  table.innerHTML = `
    <thead><tr>
      <th>#</th><th>Contributor</th><th>Reports</th><th>Points</th><th>Badges</th>
    </tr></thead>
    <tbody>
    ${data.map(u => `
      <tr>
        <td><span class="lb-rank ${rankClass(u.rank)}">${u.medal}</span></td>
        <td><div class="lb-user">
          <div class="lb-avatar">${u.avatar}</div>
          <div>
            <div class="lb-username">${u.username}</div>
            <div class="lb-city">📍 ${u.city}</div>
          </div>
        </div></td>
        <td>${u.reports.toLocaleString()}</td>
        <td><span class="lb-pts">${u.points.toLocaleString()}</span></td>
        <td>${u.badges.join(' ') || '–'}</td>
      </tr>
    `).join('')}
    </tbody>`;

  document.getElementById('badgesRow').innerHTML = [
    { e:'🥉', l:'Bronze Reporter' },
    { e:'🔥', l:'On Fire' },
    { e:'📍', l:'Local Hero' },
  ].map(b => `<div class="badge">${b.e} ${b.l}</div>`).join('');
}

// ────────────────────────────────────────────────────────────
// FEED
// ────────────────────────────────────────────────────────────
async function loadFeed() {
  try {
    const data = await apiFetch('/feed');
    buildRecentFeed(data);
  } catch (e) {
    console.warn('Feed load failed:', e.message);
  }
}

function buildRecentFeed(data) {
  const el = document.getElementById('recentFeed');
  if (!el) return;
  el.innerHTML = data.map(f => `
    <div class="feed-item">
      <div class="feed-avatar">${f.avatar}</div>
      <div class="feed-content">
        <div class="feed-name">${f.name} <span class="feed-time">${f.time}</span></div>
        <div class="feed-detail">📦 ${f.product} · 📍 ${f.city}</div>
      </div>
    </div>
  `).join('');
}

// ────────────────────────────────────────────────────────────
// MODAL
// ────────────────────────────────────────────────────────────
function openModal() {
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('productName').focus(), 50);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

document.getElementById('openSubmitModal').addEventListener('click', openModal);
document.getElementById('modalClose').addEventListener('click', closeModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ────────────────────────────────────────────────────────────
// SUBMIT PRICE
// ────────────────────────────────────────────────────────────
document.getElementById('priceForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Submitting…';

  const body = {
    name:     document.getElementById('productName').value.trim(),
    category: document.getElementById('productCategory').value,
    price:    parseFloat(document.getElementById('productPrice').value),
    unit:     document.getElementById('productUnit').value,
    store:    document.getElementById('storeName').value.trim(),
    city:     document.getElementById('locationName').value.trim(),
    reporter: document.getElementById('reporterName').value.trim(),
    note:     document.getElementById('priceNote').value.trim(),
  };

  try {
    const res = await fetch(`${API}/products`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Submission failed');
    }

    const newProduct = await res.json();

    // Prepend to cached list and re-render
    allProducts.unshift(newProduct);
    visibleCount = 9;
    renderProducts();

    // Refresh stats counter
    const statEl = document.getElementById('statReports');
    if (statEl) {
      const cur = parseInt(statEl.textContent.replace(/\D/g, ''), 10) || 0;
      statEl.textContent = (cur + 1).toLocaleString();
    }

    // Refresh ticker and feed
    await Promise.all([loadTicker(), loadFeed()]);

    e.target.reset();
    closeModal();
    showToast(`✅ Price reported! +${newProduct.pointsAwarded} pts. Thanks, ${newProduct.reporter || 'Contributor'}!`);
  } catch (err) {
    showToast(`❌ ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit Report ✓';
  }
});

// ────────────────────────────────────────────────────────────
// NAV
// ────────────────────────────────────────────────────────────
function setupNavScroll() {
  const nav = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  });
}

function setupHamburger() {
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('mobileMenu').classList.toggle('open');
  });
}

function closeMobile() {
  document.getElementById('mobileMenu').classList.remove('open');
}

// ────────────────────────────────────────────────────────────
// LOCATION
// ────────────────────────────────────────────────────────────
document.getElementById('locationBtn').addEventListener('click', () => {
  if (!navigator.geolocation) { showToast('⚠️ Geolocation not supported.'); return; }
  showToast('📍 Detecting your location…');
  navigator.geolocation.getCurrentPosition(
    pos => showToast(`✅ Location set! (${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)})`),
    ()   => showToast('⚠️ Location permission denied.')
  );
});

// ────────────────────────────────────────────────────────────
// TOAST
// ────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 4500);
}

// ────────────────────────────────────────────────────────────
// HELPER
// ────────────────────────────────────────────────────────────
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}
