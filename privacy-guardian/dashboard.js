// Privacy Guardian Dashboard Logic

// Storage Module
const Storage = {
  async get(key) {
    return new Promise(resolve => {
      chrome.storage.local.get(key, data => resolve(data[key]));
    });
  },
  async set(key, value) {
    return new Promise(resolve => {
      chrome.storage.local.set({ [key]: value }, () => resolve());
    });
  }
};

// Tracker Class
class Tracker {
  constructor(domain, type) {
    this.domain = domain;
    this.type = type;
  }
  getScore() {
    switch (this.type) {
      case 'Advertising': return 3;
      case 'Analytics': return 2;
      case 'Fingerprinting': return 4;
      default: return 1;
    }
  }
}

// Privacy Score Calculation (average of all sites)
function calculatePrivacyScore(trackers) {
  let score = 100;
  trackers.forEach(tracker => {
    score -= tracker.getScore();
  });
  return Math.max(score, 0);
}

// UI Module
const UI = {
  renderHistory(history) {
    const el = document.getElementById('history-list');
    el.innerHTML = '';
    if (!history || Object.keys(history).length === 0) {
      el.innerHTML = '<div class="empty-msg"><i class="fas fa-history"></i> No tracker history yet. Browse the web to see your privacy data.</div>';
      return;
    }
    let entries = Object.entries(history);
    if (sortByScore) {
      entries.sort((a, b) => b[1][0].privacyScore - a[1][0].privacyScore);
    }
    if (filterHeavy) {
      entries = entries.filter(([site, visits]) => visits[0].privacyScore < 50);
    }
    entries.forEach(([site, visits]) => {
      const latest = visits[0];
      const card = document.createElement('div');
      card.className = 'site-card';
      const scoreColor = latest.privacyScore >= 80 ? '#43A047' : latest.privacyScore >= 60 ? '#FB8C00' : '#E53935';
      const isExpanded = false;
      card.innerHTML = `
        <div class="site-header">
          <span class="site-domain">${site}</span>
          <span class="site-score" style="color: ${scoreColor}">${latest.privacyScore}/100</span>
          <span class="site-status ${latest.blocked ? 'blocked' : 'unblocked'}">${latest.blocked ? 'Blocked' : 'Unblocked'}</span>
          <button class="expand-btn" data-site="${site}"><i class="fas fa-chevron-down"></i></button>
        </div>
        <div class="site-trackers">
          ${Object.entries(latest.trackers).map(([domain, t]) => `<span class="tracker-badge ${t.category}" title="${t.category} tracker: ${t.name || domain}">${t.name || domain}</span>`).join(' ')}
        </div>
        <div class="site-timestamp">${new Date(latest.timestamp).toLocaleString()}</div>
        <div class="site-details" style="display: none;">
          <p><strong>Full URL:</strong> ${latest.pageUrl || 'N/A'}</p>
          <p><strong>Tracker Count:</strong> ${Object.keys(latest.trackers).length}</p>
          <p><strong>Categories:</strong> ${[...new Set(Object.values(latest.trackers).map(t => t.category))].join(', ')}</p>
        </div>
      `;
      el.appendChild(card);
    });
  },
  renderChart(scores) {
    const el = document.getElementById('score-chart');
    if (!scores.length) {
      el.innerHTML = '';
      return;
    }
    // Simple bar chart
    const maxScore = 100;
    const chartHeight = 100;
    const barWidth = 30;
    const bars = scores.slice(-10).map(score => {
      const height = (score / maxScore) * chartHeight;
      const color = score >= 80 ? '#43A047' : score >= 60 ? '#FB8C00' : '#E53935';
      return `<div class="chart-bar" style="height: ${height}px; background-color: ${color}; width: ${barWidth}px;" title="Score: ${score}"></div>`;
    }).join('');
    el.innerHTML = `<div class="chart-container">${bars}</div>`;
  },
  renderScore(scores) {
    const el = document.getElementById('score-visual');
    if (!scores.length) {
      el.innerHTML = '<div class="empty-msg"><i class="fas fa-info-circle"></i> No privacy score data yet. Visit some websites to see your score.</div>';
      return;
    }
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const color = avg >= 80 ? '#43A047' : avg >= 60 ? '#FB8C00' : '#E53935';
    el.innerHTML = `
      <div class="score-display">
        <div class="score-text">Average Privacy Score: <span style="color: ${color}">${avg}/100</span></div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${avg}%; background-color: ${color}"></div>
        </div>
      </div>
    `;
  },
  renderSummary(summary) {
    const el = document.getElementById('summary-info');
    const icon = summary.count > 0 ? '<i class="fas fa-exclamation-triangle" style="color: #E53935;"></i>' : '<i class="fas fa-check-circle" style="color: #43A047;"></i>';
    el.innerHTML = `${icon} ${summary.count} tracking-heavy sites today.`;
  },
  renderTip(tip) {
    document.getElementById('tip-content').textContent = tip;
  },
  renderRecommendations(recs) {
    const el = document.getElementById('recommendation-list');
    el.innerHTML = '';
    const popularSites = [
      { site: 'Google', alternative: 'DuckDuckGo' },
      { site: 'Facebook', alternative: 'MeWe' },
      { site: 'YouTube', alternative: 'PeerTube' },
      { site: 'NYTimes', alternative: 'ProPublica' },
      { site: 'Instagram', alternative: 'Pixelfed' }
    ];
    popularSites.forEach(rec => {
      const div = document.createElement('div');
      div.textContent = `${rec.site} → Try: ${rec.alternative}`;
      el.appendChild(div);
    });
    recs.forEach(rec => {
      const div = document.createElement('div');
      div.textContent = `${rec.site} → Try: ${rec.alternative}`;
      el.appendChild(div);
    });
  }
};

// Tips Module
const Tips = [
  "Use privacy-focused browsers like Brave or Firefox.",
  "Regularly clear your cookies and site data.",
  "Consider using a VPN for enhanced privacy.",
  "Review site permissions regularly.",
  "Block third-party cookies for better privacy."
];

function getDailyTip() {
  const today = new Date().toISOString().slice(0, 10);
  return Storage.get('lastTipDate').then(lastDate => {
    let tipIdx = 0;
    if (lastDate === today) {
      return Storage.get('lastTipIdx').then(idx => Tips[idx]);
    } else {
      tipIdx = Math.floor(Math.random() * Tips.length);
      Storage.set('lastTipDate', today);
      Storage.set('lastTipIdx', tipIdx);
      return Tips[tipIdx];
    }
  });
}

// Recommendations Module
async function getRecommendations(site) {
  const res = await fetch('recommendations.json');
  const data = await res.json();
  return data[site] ? [{ site, alternative: data[site] }] : [];
}

// Global variables for sorting/filtering
let currentHistory = {};
let sortByScore = false;
let filterHeavy = false;

// Initialization
async function initDashboard() {
  // Tracker history
  currentHistory = await Storage.get('trackerHistory') || {};
  UI.renderHistory(currentHistory);

  // Privacy score (average of all sites)
  let scores = [];
  Object.values(currentHistory).forEach(visits => {
    if (visits[0] && visits[0].privacyScore !== undefined) {
      scores.push(visits[0].privacyScore);
    }
  });
  UI.renderScore(scores);

  // Chart
  UI.renderChart(scores);

  // Daily summary
  const dailyHeavySites = await Storage.get('dailyHeavySites') || {};
  const today = new Date().toISOString().slice(0, 10);
  const heavySites = dailyHeavySites[today] || [];
  const summary = { count: heavySites.length };
  UI.renderSummary(summary);

  // Tip
  const tip = await getDailyTip();
  UI.renderTip(tip);

  // Recommendations (for demo, show for first site)
  let recs = [];
  const firstSite = Object.keys(currentHistory)[0];
  if (firstSite) {
    recs = await getRecommendations(firstSite);
  }
  UI.renderRecommendations(recs);
}

document.addEventListener('DOMContentLoaded', initDashboard);

document.getElementById('refresh-btn').addEventListener('click', () => {
  initDashboard();
});

document.getElementById('sort-score-btn').addEventListener('click', () => {
  sortByScore = !sortByScore;
  UI.renderHistory(currentHistory);
  document.getElementById('sort-score-btn').innerHTML = sortByScore ? '<i class="fas fa-sort-numeric-up"></i> Sort by Score' : '<i class="fas fa-sort-numeric-down"></i> Sort by Score';
});

document.getElementById('filter-heavy-btn').addEventListener('click', () => {
  filterHeavy = !filterHeavy;
  UI.renderHistory(currentHistory);
  document.getElementById('filter-heavy-btn').innerHTML = filterHeavy ? '<i class="fas fa-filter"></i> Show All' : '<i class="fas fa-filter"></i> Heavy Only';
});

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('expand-btn') || e.target.closest('.expand-btn')) {
    const btn = e.target.closest('.expand-btn');
    const site = btn.dataset.site;
    const details = btn.parentElement.nextElementSibling.nextElementSibling.nextElementSibling;
    const isExpanded = details.style.display !== 'none';
    details.style.display = isExpanded ? 'none' : 'block';
    btn.innerHTML = isExpanded ? '<i class="fas fa-chevron-down"></i>' : '<i class="fas fa-chevron-up"></i>';
  }
});

document.getElementById('dark-mode-toggle').addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  const icon = document.querySelector('#dark-mode-toggle i');
  icon.className = document.body.classList.contains('dark-mode') ? 'fas fa-sun' : 'fas fa-moon';
  Storage.set('darkMode', document.body.classList.contains('dark-mode'));
});

// Load dark mode preference
Storage.get('darkMode').then(dark => {
  if (dark) {
    document.body.classList.add('dark-mode');
    document.querySelector('#dark-mode-toggle i').className = 'fas fa-sun';
  }
});
