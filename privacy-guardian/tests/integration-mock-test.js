// Integration Mock Test (without real Chrome API)
// Purpose: Simulate processRequest() without opening Chrome

// Mock Chrome API
const chrome = {
  action: {
    setBadgeText: function(details) {
      console.log(`[MOCK] chrome.action.setBadgeText: ${JSON.stringify(details)}`);
      return true;
    },
    setBadgeBackgroundColor: function(details) {
      console.log(`[MOCK] chrome.action.setBadgeBackgroundColor: ${JSON.stringify(details)}`);
      return true;
    }
  },
  storage: {
    local: {
      set: function(data) {
        console.log(`[MOCK] chrome.storage.local.set: ${JSON.stringify(data)}`);
        return true;
      }
    }
  }
};

// Known trackers (simplified for testing)
const knownTrackers = {
  "google-analytics.com": { name: "Google Analytics", category: "Analytics" },
  "doubleclick.net": { name: "DoubleClick", category: "Advertising" },
  "facebook.net": { name: "Facebook", category: "Social Media" }
};

// Global tracker counts per tab
let trackerCounts = {};
let trackingData = {};

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

// Update tracker count
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
}

// Save tracking data to storage
function saveTrackingData(tabId) {
  if (!trackingData[tabId]) return;
  
  chrome.storage.local.set({
    [`tab_${tabId}`]: trackingData[tabId]
  });
}

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

// Test function
function runIntegrationTest() {
  console.log("=== INTEGRATION MOCK TEST ===");
  
  // Reset data
  trackerCounts = {};
  trackingData = {};
  
  // Mock web requests
  const mockRequests = [
    {
      tabId: 1,
      initiator: "https://example.com",
      url: "https://www.google-analytics.com/analytics.js"
    },
    {
      tabId: 1,
      initiator: "https://example.com",
      url: "https://connect.facebook.net/en_US/fbevents.js"
    },
    {
      tabId: 1,
      initiator: "https://example.com",
      url: "https://example.com/styles.css" // Same domain, should be ignored
    },
    {
      tabId: 1,
      initiator: "https://example.com",
      url: "https://www.google-analytics.com/collect" // Duplicate domain, should be counted once
    },
    {
      tabId: 2,
      initiator: "https://another-site.com",
      url: "https://doubleclick.net/ad.js"
    },
    {
      tabId: -1, // Invalid tab ID, should be ignored
      initiator: "https://example.com",
      url: "https://www.google-analytics.com/analytics.js"
    }
  ];
  
  // Process each request
  console.log("Processing mock requests:");
  mockRequests.forEach((request, index) => {
    console.log(`\nRequest ${index + 1}:`);
    console.log(`  From: ${request.initiator}`);
    console.log(`  To: ${request.url}`);
    console.log(`  Tab ID: ${request.tabId}`);
    
    processRequest(request);
  });
  
  // Verify results
  console.log("\nTest Results:");
  
  // Check tab 1
  console.log("\nTab 1 trackers:");
  if (trackingData[1] && trackingData[1].trackers) {
    const trackerCount = Object.keys(trackingData[1].trackers).length;
    console.log(`  Total unique trackers: ${trackerCount}`);
    console.log(`  Expected: 2`);
    console.log(`  Result: ${trackerCount === 2 ? "PASS" : "FAIL"}`);
    
    for (const domain in trackingData[1].trackers) {
      const tracker = trackingData[1].trackers[domain];
      console.log(`  - ${domain} (${tracker.name}, ${tracker.category}): ${tracker.count} requests`);
    }
  } else {
    console.log("  No trackers found for Tab 1 - FAIL");
  }
  
  // Check tab 2
  console.log("\nTab 2 trackers:");
  if (trackingData[2] && trackingData[2].trackers) {
    const trackerCount = Object.keys(trackingData[2].trackers).length;
    console.log(`  Total unique trackers: ${trackerCount}`);
    console.log(`  Expected: 1`);
    console.log(`  Result: ${trackerCount === 1 ? "PASS" : "FAIL"}`);
    
    for (const domain in trackingData[2].trackers) {
      const tracker = trackingData[2].trackers[domain];
      console.log(`  - ${domain} (${tracker.name}, ${tracker.category}): ${tracker.count} requests`);
    }
  } else {
    console.log("  No trackers found for Tab 2 - FAIL");
  }
  
  // Check invalid tab
  console.log("\nInvalid Tab (-1):");
  if (trackingData[-1]) {
    console.log("  Data found for invalid tab - FAIL");
  } else {
    console.log("  No data for invalid tab - PASS");
  }
  
  console.log("\n==============================");
}

// Run the test
runIntegrationTest();