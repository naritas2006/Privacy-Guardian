// Privacy Guardian - Background Service Worker
// Detects and monitors third-party requests on websites

// Store for tracking data
// Global tracker counts per tab
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
  "quantserve.com": { name: "Quantcast", category: "Analytics" },
  "outbrain.com": { name: "Outbrain", category: "Advertising" },
  "taboola.com": { name: "Taboola", category: "Advertising" }
};

// Helper function to extract domain from URL
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return url;
  }
}

// Check if a domain is a known tracker
function isKnownTracker(domain) {
  // Check exact match
  if (knownTrackers[domain]) {
    return knownTrackers[domain];
  }
  
  // Check if domain ends with any known tracker domain
  for (const trackerDomain in knownTrackers) {
    if (domain.endsWith(`.${trackerDomain}`) || domain === trackerDomain) {
      return knownTrackers[trackerDomain];
    }
  }
  
  return null;
}

// Check if a request is third-party
function isThirdParty(details) {
  if (!details.initiator || !details.url) return false;
  
  const initiatorDomain = extractDomain(details.initiator);
  const targetDomain = extractDomain(details.url);
  
  // Compare base domains (e.g., example.com from sub.example.com)
  const getBaseDomain = (domain) => {
    const parts = domain.split('.');
    if (parts.length > 2) {
      return parts.slice(-2).join('.');
    }
    return domain;
  };
  
  return getBaseDomain(initiatorDomain) !== getBaseDomain(targetDomain);
}

// Process a web request
// Process a web request
function processRequest(details) {
  // Skip non-third-party requests
  if (!isThirdParty(details)) return;
  
  const tabId = details.tabId;
  const targetDomain = extractDomain(details.url);
  const trackerInfo = isKnownTracker(targetDomain);
  
  // Skip if not a known tracker or invalid tabId
  if (!trackerInfo || tabId < 0) return;
  
  // Add console logging for tracker detection
  console.log(`Privacy Guardian: Tracker found -> ${targetDomain} (${trackerInfo.name}, ${trackerInfo.category})`);
  
  // Initialize tracking data for this tab if needed
  if (!trackingData[tabId]) {
    trackingData[tabId] = {
      pageUrl: null,
      pageDomain: null,
      trackers: {}
    };
  }
  
  // Add tracker to the list
  if (!trackingData[tabId].trackers[targetDomain]) {
    trackingData[tabId].trackers[targetDomain] = {
      name: trackerInfo.name,
      category: trackerInfo.category,
      count: 0,
      urls: []
    };
  }
  
  // Update tracker data
  trackingData[tabId].trackers[targetDomain].count++;
  
  // Store unique URLs (up to 5 per tracker)
  if (!trackingData[tabId].trackers[targetDomain].urls.includes(details.url) && 
      trackingData[tabId].trackers[targetDomain].urls.length < 5) {
    trackingData[tabId].trackers[targetDomain].urls.push(details.url);
  }
  
  // Update tracker count using the new function
  updateTrackerCount(tabId, targetDomain);
  
  // Save data to storage
  saveTrackingData(tabId);
}

// Update the extension badge with tracker count
function updateTrackerCount(tabId, trackerDomain) {
  // Validate tabId - skip invalid tab IDs
  if (tabId < 0) return;
  
  if (!trackerCounts[tabId]) {
    trackerCounts[tabId] = new Set();
  }
  trackerCounts[tabId].add(trackerDomain);
  const count = trackerCounts[tabId].size;
  updateBadge(tabId, count);
}

// Update the extension badge with tracker count
function updateBadge(tabId, count) {
  // Validate tabId - Chrome extension APIs require tabId >= 0
  if (tabId < 0) {
    console.log(`Privacy Guardian: Skipping badge update for invalid tabId: ${tabId}`);
    return;
  }
  
  // Use provided count or fallback to trackingData
  const trackerCount = count !== undefined ? count : 
    (trackingData[tabId] ? Object.keys(trackingData[tabId].trackers).length : 0);
  
  chrome.action.setBadgeText({
    text: trackerCount > 0 ? trackerCount.toString() : '',
    tabId: tabId
  });
  
  chrome.action.setBadgeBackgroundColor({
    color: trackerCount > 10 ? '#E53935' : trackerCount > 5 ? '#FB8C00' : '#43A047',
    tabId: tabId
  });
  
  console.log(`Privacy Guardian: Updated badge for tab ${tabId} - ${trackerCount} trackers`);
}

// Save tracking data to storage
function saveTrackingData(tabId) {
  if (!trackingData[tabId]) return;
  
  chrome.storage.local.set({
    [`tab_${tabId}`]: trackingData[tabId]
  });
}

// Update page URL when tab is updated
function handleTabUpdate(tabId, changeInfo, tab) {
  if (changeInfo.status === 'loading' && tab.url) {
    // Reset tracking data for this tab
    const pageDomain = extractDomain(tab.url);
    
    trackingData[tabId] = {
      pageUrl: tab.url,
      pageDomain: pageDomain,
      trackers: {}
    };
    
    // Reset badge
    chrome.action.setBadgeText({
      text: '',
      tabId: tabId
    });
    
    // Save initial state
    saveTrackingData(tabId);
  }
}

// Clean up when a tab is closed
function handleTabRemove(tabId) {
  delete trackingData[tabId];
  delete trackerCounts[tabId]; // Clean up tracker counts too
  console.log(`Privacy Guardian: Cleaned up data for closed tab ${tabId}`);
}

// Set up listeners
chrome.webRequest.onBeforeRequest.addListener(
  processRequest,
  { urls: ["<all_urls>"] }
);

chrome.tabs.onUpdated.addListener(handleTabUpdate);
chrome.tabs.onRemoved.addListener(handleTabRemove);

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getTrackingData') {
    const tabId = message.tabId;
    
    if (trackingData[tabId]) {
      sendResponse(trackingData[tabId]);
    } else {
      // Try to get from storage
      chrome.storage.local.get([`tab_${tabId}`], (result) => {
        sendResponse(result[`tab_${tabId}`] || { trackers: {} });
      });
      return true; // Required for async response
    }
  }
  
  if (message.action === 'toggleBlocker') {
    // This would implement the optional blocking functionality
    // Not implemented in this MVP version
    sendResponse({ success: true });
  }
});