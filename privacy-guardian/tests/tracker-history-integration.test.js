// Integration Test: Tracker History Aggregation
// Purpose: Verify that tracker history is correctly aggregated and stored in chrome.storage.local

// Mock Chrome API
const chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  runtime: {
    onMessage: {
      addListener: jest.fn()
    }
  },
  tabs: {
    onUpdated: {
      addListener: jest.fn()
    },
    onRemoved: {
      addListener: jest.fn()
    }
  },
  webRequest: {
    onBeforeRequest: {
      addListener: jest.fn()
    }
  },
  action: {
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn()
  }
};

// Hoist setPromises so tests can await storage writes
let setPromises = [];

// Mock known trackers (simplified for testing)
const knownTrackers = {
  "google-analytics.com": { name: "Google Analytics", category: "Analytics" },
  "doubleclick.net": { name: "DoubleClick", category: "Advertising" },
  "facebook.net": { name: "Facebook", category: "Social Media" }
};

// Global tracking data
let globalTrackerHistory = {};
let trackingData = {};

// Helper functions
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname;
    const parts = host.split('.');
    return parts.length > 2 ? parts.slice(-2).join('.') : host;
  } catch (e) {
    const host = url;
    const parts = host.split('.');
    return parts.length > 2 ? parts.slice(-2).join('.') : host;
  }
}

function isKnownTracker(domain) {
  if (knownTrackers[domain]) return knownTrackers[domain];
  for (const trackerDomain in knownTrackers) {
    if (domain.endsWith(`.${trackerDomain}`) || domain === trackerDomain) {
      return knownTrackers[trackerDomain];
    }
  }
  return null;
}

// Save function (mocked)
function saveTrackingData(tabId) {
  // No-op for test
}

function updateTrackerHistory(tabId) {
  if (trackingData[tabId] && trackingData[tabId].pageDomain) {
    const domain = trackingData[tabId].pageDomain;
    let newTotalTrackers = 0;
    let newTrackers = {};

    for (const trackerDomain in trackingData[tabId].trackers) {
      const tracker = trackingData[tabId].trackers[trackerDomain];
      newTrackers[trackerDomain] = { ...tracker };
      newTotalTrackers += tracker.count;
    }

    chrome.storage.local.get('trackerHistory', (data) => {
      let updatedTrackerHistory = { ...data.trackerHistory };

      if (newTotalTrackers === 0 && Object.keys(newTrackers).length === 0) {
        if (updatedTrackerHistory[domain]) {
          delete updatedTrackerHistory[domain];
        }
      } else {
        updatedTrackerHistory[domain] = {
          totalTrackers: newTotalTrackers,
          trackers: newTrackers,
        };
      }
      chrome.storage.local.set({ trackerHistory: updatedTrackerHistory });
    });
  }
}

// ✅ Fixed processRequest — tracks only known trackers
function processRequest(details) {
  const tabId = details.tabId;
  const targetDomain = extractDomain(details.url);
  const trackerInfo = isKnownTracker(targetDomain);

  if (!trackerInfo || tabId < 0) return; // skip if not tracker or invalid tab

  if (!trackingData[tabId]) {
    trackingData[tabId] = {
      pageUrl: details.initiator || details.url,
      pageDomain: extractDomain(details.initiator || details.url),
      trackers: {},
    };
  }

  if (!trackingData[tabId].trackers[targetDomain]) {
    trackingData[tabId].trackers[targetDomain] = {
      name: trackerInfo.name,
      category: trackerInfo.category,
      count: 0,
      urls: [],
    };
  }

  trackingData[tabId].trackers[targetDomain].count++;

  if (
    !trackingData[tabId].trackers[targetDomain].urls.includes(details.url) &&
    trackingData[tabId].trackers[targetDomain].urls.length < 5
  ) {
    trackingData[tabId].trackers[targetDomain].urls.push(details.url);
  }

  saveTrackingData(tabId);
  updateTrackerHistory(tabId);
}

// ✅ Jest Tests
describe('Tracker History Aggregation', () => {
  beforeEach(() => {
    globalTrackerHistory = {};
    trackingData = {};
    let mockStorage = { trackerHistory: {} };

    chrome.storage.local.get.mockImplementation((keys, callback) => {
      if (keys === 'trackerHistory') {
        callback({ trackerHistory: mockStorage.trackerHistory });
      } else {
        callback({});
      }
    });

    setPromises = [];
    chrome.storage.local.set.mockImplementation((data) => {
      const promise = new Promise(resolve => {
        if (data.trackerHistory) mockStorage.trackerHistory = data.trackerHistory;
        resolve();
      });
      setPromises.push(promise);
      return promise;
    });
  });

  test('should aggregate tracker history correctly for multiple domains', async () => {
    processRequest({ tabId: 1, initiator: "https://example.com", url: "https://www.google-analytics.com/analytics.js" });
    processRequest({ tabId: 1, initiator: "https://example.com", url: "https://connect.facebook.net/en_US/fbevents.js" });
    processRequest({ tabId: 1, initiator: "https://example.com", url: "https://www.google-analytics.com/collect" });

    processRequest({ tabId: 2, initiator: "https://another-site.com", url: "https://doubleclick.net/ad.js" });
    processRequest({ tabId: 2, initiator: "https://another-site.com", url: "https://www.google-analytics.com/analytics.js" });
    processRequest({ tabId: 2, initiator: "https://another-site.com", url: "https://www.google-analytics.com/analytics.js" });

    await Promise.all(setPromises);
    let history;
    await new Promise(resolve => {
      chrome.storage.local.get('trackerHistory', (result) => {
        history = result.trackerHistory;
        resolve();
      });
    });

    expect(history["example.com"]).toBeDefined();
    expect(Object.keys(history["example.com"].trackers).length).toBe(2);
    expect(history["example.com"].trackers["google-analytics.com"].count).toBe(2);
    expect(history["example.com"].trackers["facebook.net"].count).toBe(1);

    expect(history["another-site.com"]).toBeDefined();
    expect(Object.keys(history["another-site.com"].trackers).length).toBe(2);
    expect(history["another-site.com"].trackers["doubleclick.net"].count).toBe(1);
    expect(history["another-site.com"].trackers["google-analytics.com"].count).toBe(2);

    expect(chrome.storage.local.set).toHaveBeenCalled();
  });

  test('should correctly update tracker counts and URLs for existing trackers', async () => {
    processRequest({ tabId: 1, initiator: "https://test-site.com", url: "https://www.google-analytics.com/analytics.js" });
    processRequest({ tabId: 1, initiator: "https://test-site.com", url: "https://www.google-analytics.com/collect" });
    processRequest({ tabId: 1, initiator: "https://test-site.com", url: "https://www.google-analytics.com/analytics.js" });

    await Promise.all(setPromises);
    let history;
    await new Promise(resolve => {
      chrome.storage.local.get('trackerHistory', (result) => {
        history = result.trackerHistory;
        resolve();
      });
    });

    expect(history["test-site.com"]).toBeDefined();
    expect(Object.keys(history["test-site.com"].trackers).length).toBe(1);
    expect(history["test-site.com"].trackers["google-analytics.com"].count).toBe(3);
    expect(history["test-site.com"].trackers["google-analytics.com"].urls.length).toBe(2);
    expect(history["test-site.com"].trackers["google-analytics.com"].urls).toContain("https://www.google-analytics.com/analytics.js");

  });

  test('should not aggregate non-tracker requests', async () => {
    const nonTrackerRequest = {
      url: 'https://www.test-site.com/image.png',
      type: 'image',
      initiator: 'https://www.test-site.com',
      tabId: 4
    };
    processRequest(nonTrackerRequest);

    const trackerRequest = {
      tabId: 4,
      url: 'https://www.google-analytics.com/analytics.js',
      type: 'script',
      initiator: 'https://www.test-site.com',
    };
    processRequest(trackerRequest);
    processRequest(trackerRequest);
    processRequest(trackerRequest);

    const anotherNonTrackerRequest = {
      url: 'https://www.test-site.com/style.css',
      type: 'stylesheet',
      initiator: 'https://www.test-site.com',
      tabId: 4
    };
    processRequest(anotherNonTrackerRequest);

    await Promise.all(setPromises);
    let history;
    await new Promise(resolve => {
      chrome.storage.local.get('trackerHistory', (result) => {
        history = result.trackerHistory;
        resolve();
      });
    });

    expect(history["test-site.com"]).toBeDefined();
    expect(Object.keys(history["test-site.com"].trackers).length).toBe(1);
    expect(history["test-site.com"].trackers["google-analytics.com"].count).toBe(3);
    expect(history["test-site.com"].trackers["google-analytics.com"].urls.length).toBe(1);
    expect(history["test-site.com"].trackers["google-analytics.com"].urls).toContain("https://www.google-analytics.com/analytics.js");

  });

  test('should not aggregate non-tracker requests (no tracker found)', async () => {
    processRequest({ tabId: 3, initiator: "https://non-tracker-site.com", url: "https://non-tracker-site.com/image.png" });
    processRequest({ tabId: 3, initiator: "https://non-tracker-site.com", url: "https://non-tracker-site.com/script.js" });

    await Promise.all(setPromises);
    let history;
    await new Promise(resolve => {
      chrome.storage.local.get('trackerHistory', (result) => {
        history = result.trackerHistory;
        resolve();
      });
    });

    expect(history["non-tracker-site.com"]).toBeUndefined();
  });
});