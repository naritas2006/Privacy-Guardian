// Privacy Guardian - Popup Script

// DOM elements
const trackerCountElement = document.getElementById('tracker-count');
const siteDomainElement = document.getElementById('site-domain');
const siteStatusElement = document.getElementById('site-status');
const trackersListElement = document.getElementById('trackers-list');
const blockToggleElement = document.getElementById('block-toggle');
const dashboardBtn = document.getElementById('dashboard-btn');

// Get current tab information
async function getCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

// Update the UI with tracking data
function updateUI(trackingData) {
  // If no tracking data available
  if (!trackingData || !trackingData.trackers) {
    trackerCountElement.textContent = '0';
    siteDomainElement.textContent = 'Unknown';
    siteStatusElement.textContent = 'No data';
    siteStatusElement.className = 'status-unknown';
    trackersListElement.innerHTML = '<div class="no-trackers-message">No tracking data available for this site.</div>';
    blockToggleElement.checked = false;
    return;
  }

  // Update site information
  siteDomainElement.textContent = trackingData.pageDomain || 'Unknown';
  
  // Count trackers
  const trackerCount = Object.keys(trackingData.trackers).length;
  trackerCountElement.textContent = trackerCount;
  
  // Update status indicator
  if (trackerCount === 0) {
    siteStatusElement.textContent = 'Safe';
    siteStatusElement.className = 'status-safe';
  } else if (trackerCount < 5) {
    siteStatusElement.textContent = 'Some Trackers';
    siteStatusElement.className = 'status-caution';
  } else {
    siteStatusElement.textContent = 'Heavy Tracking';
    siteStatusElement.className = 'status-danger';
  }
  
  // Update trackers list
  if (trackerCount === 0) {
    trackersListElement.innerHTML = '<div class="no-trackers-message">No trackers detected on this site yet.</div>';
    blockToggleElement.checked = false;
    return;
  }
  
  // Clear previous list
  trackersListElement.innerHTML = '';
  
  // Add each tracker to the list
  Object.entries(trackingData.trackers).forEach(([domain, tracker]) => {
    const trackerElement = document.createElement('div');
    trackerElement.className = 'tracker-item';
    
    trackerElement.innerHTML = `
      <div class="tracker-name">${tracker.name || domain}</div>
      <div class="tracker-category">${tracker.category || 'Unknown'}</div>
      <div class="tracker-count-small">Requests: ${tracker.count || 0}</div>
    `;
    
    trackersListElement.appendChild(trackerElement);
  });
}

// Initialize the popup
async function initPopup() {
  try {
    const currentTab = await getCurrentTab();
    // Request tracking data from background script
    chrome.runtime.sendMessage(
      { action: 'getTrackingData', tabId: currentTab.id },
      (trackingData) => {
        if (chrome.runtime.lastError) {
          console.error('Error getting tracking data:', chrome.runtime.lastError);
          return;
        }
        updateUI(trackingData);
      }
    );
  } catch (err) {
    console.error('Error initializing popup:', err);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initPopup);
document.getElementById('dashboard-btn').addEventListener('click', function() {
  chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
});