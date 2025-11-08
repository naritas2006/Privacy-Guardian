// Privacy Guardian - Background Service Worker
// Detects and monitors third-party requests on websites

// Store for tracking data
let trackerCounts = {};
let trackingData = {};

// Load tracker definitions from EasyPrivacy list (simplified version)
const knownTrackers = {
  "google-analytics.com": { name: "Google Analytics", category: "Analytics" },
  "doubleclick.net": { name: "DoubleClick", category: "Advertising" },
  "facebook.net": { name: "Facebook", category: "Social Media" },
  "facebook.com": { name: "Facebook", category: "Social Media" },
  "googlesyndication.com": { name: "Google Ads", category: "Advertising" },
  "googletagmanager.com": { name: "Google Tag Manager", category: "Analytics" },
  "hotjar.com": { name: "Hotjar", category: "Analytics" },
  "amazon-adsystem.com": { name: "Amazon Ads", category: "Advertising" },
  "scorecardresearch.com": { name: "ScoreCard Research", category: "Analytics" },
  "twitter.com": { name: "Twitter", category: "Social Media" },
  "adnxs.com": { name: "AppNexus", category: "Advertising" },
  "criteo.com": { name: "Criteo", category: "Advertising" },
  "rubiconproject.com": { name: "Rubicon Project", category: "Advertising" },
  "optimizely.com": { name: "Optimizely", category: "A/B Testing" },
  "chartbeat.com": { name: "Chartbeat", category: "Analytics" },
  "mixpanel.com": { name: "Mixpanel", category: "Analytics" },
};

// Check if a domain is a known tracker
function isKnownTracker(domain) {
  if (knownTrackers[domain]) {
    return knownTrackers[domain];
  }
  for (const trackerDomain in knownTrackers) {
    if (domain.endsWith(`.${trackerDomain}`) || domain === trackerDomain) {
      return knownTrackers[trackerDomain];
    }
  }
  return null;
}

function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function isThirdParty(details) {
  // Simple third-party check
  if (!details.initiator) return true;
  const reqDomain = extractDomain(details.url);
  const initiatorDomain = extractDomain(details.initiator);
  return reqDomain !== initiatorDomain;
}

// Privacy Score Calculation
function calculatePrivacyScore(trackers) {
  let score = 100;
  Object.values(trackers).forEach(tracker => {
    switch (tracker.category) {
      case 'Advertising': score -= 3; break;
      case 'Analytics': score -= 2; break;
      case 'Fingerprinting': score -= 4; break;
      default: score -= 1; break;
    }
  });
  return Math.max(score, 0);
}

// Update global tracker history for dashboard
function updateTrackerHistory(tabId) {
  if (!trackingData[tabId] || !trackingData[tabId].pageDomain) return;
  const domain = trackingData[tabId].pageDomain;
  const trackers = trackingData[tabId].trackers;
  const privacyScore = calculatePrivacyScore(trackers);
  const timestamp = Date.now();
  const blocked = false; // Not implemented
  chrome.storage.local.get(['trackerHistory', 'dailyHeavySites'], data => {
    const history = data.trackerHistory || {};
    if (!history[domain]) history[domain] = [];
    history[domain].unshift({
      privacyScore,
      blocked,
      trackers,
      timestamp
    });
    // Keep only last 10 visits per domain
    history[domain] = history[domain].slice(0, 10);
    chrome.storage.local.set({ trackerHistory: history });

    // Update daily heavy sites if privacy score < 50
    if (privacyScore < 90) {
      const today = new Date().toISOString().slice(0, 10);
      const dailyHeavySites = data.dailyHeavySites || {};
      if (!dailyHeavySites[today]) dailyHeavySites[today] = [];
      if (!dailyHeavySites[today].includes(domain)) {
        dailyHeavySites[today].push(domain);
      }
      chrome.storage.local.set({ dailyHeavySites });
    }
  });
}

// Process a web request
function processRequest(details) {
  if (!isThirdParty(details)) return;
  const tabId = details.tabId;
  const targetDomain = extractDomain(details.url);
  const trackerInfo = isKnownTracker(targetDomain);
  if (!trackerInfo || tabId < 0) return;
  if (!trackingData[tabId]) {
    trackingData[tabId] = {
      pageUrl: null,
      pageDomain: null,
      trackers: {}
    };
  }
  if (!trackingData[tabId].trackers[targetDomain]) {
    trackingData[tabId].trackers[targetDomain] = {
      name: trackerInfo.name,
      category: trackerInfo.category,
      count: 0,
      urls: []
    };
  }
  trackingData[tabId].trackers[targetDomain].count++;
  if (!trackingData[tabId].trackers[targetDomain].urls.includes(details.url) && trackingData[tabId].trackers[targetDomain].urls.length < 5) {
    trackingData[tabId].trackers[targetDomain].urls.push(details.url);
  }
  updateTrackerCount(tabId, targetDomain);
  saveTrackingData(tabId);
  updateTrackerHistory(tabId);
}

function updateTrackerCount(tabId, trackerDomain) {
  if (tabId < 0) return;
  if (!trackerCounts[tabId]) {
    trackerCounts[tabId] = new Set();
  }
  trackerCounts[tabId].add(trackerDomain);
  const count = trackerCounts[tabId].size;
  updateBadge(tabId, count);
}

function updateBadge(tabId, count) {
  if (tabId < 0) {
    return;
  }
  const trackerCount = count !== undefined ? count : (trackingData[tabId] ? Object.keys(trackingData[tabId].trackers).length : 0);
  chrome.action.setBadgeText({ text: trackerCount > 0 ? trackerCount.toString() : '', tabId: tabId });
  chrome.action.setBadgeBackgroundColor({ color: trackerCount > 10 ? '#E53935' : trackerCount > 5 ? '#FB8C00' : '#43A047', tabId: tabId });
}

function saveTrackingData(tabId) {
  if (!trackingData[tabId]) return;
  chrome.storage.local.set({ [`tab_${tabId}`]: trackingData[tabId] });
}

function handleTabUpdate(tabId, changeInfo, tab) {
  if (changeInfo.status === 'loading' && tab.url) {
    const pageDomain = extractDomain(tab.url);
    trackingData[tabId] = {
      pageUrl: tab.url,
      pageDomain: pageDomain,
      trackers: {}
    };
    chrome.action.setBadgeText({ text: '', tabId: tabId });
    saveTrackingData(tabId);
  }
}

function handleTabRemove(tabId) {
  delete trackingData[tabId];
  delete trackerCounts[tabId];
}

chrome.webRequest.onBeforeRequest.addListener(
  processRequest,
  { urls: ["<all_urls>"] }
);

chrome.tabs.onUpdated.addListener(handleTabUpdate);
chrome.tabs.onRemoved.addListener(handleTabRemove);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getTrackingData') {
    const tabId = message.tabId;
    if (trackingData[tabId]) {
      sendResponse(trackingData[tabId]);
    } else {
      chrome.storage.local.get([`tab_${tabId}`], (result) => {
        sendResponse(result[`tab_${tabId}`] || { trackers: {} });
      });
      return true;
    }
  }
  if (message.action === 'toggleBlocker') {
    sendResponse({ success: true });
  }
});
