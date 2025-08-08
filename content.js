// Privacy Guardian - Content Script
// This script runs in the context of web pages

// This content script is minimal for the MVP version
// It can be expanded later to handle more complex interactions

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getPageInfo') {
    // Send page information back to the requester
    sendResponse({
      url: window.location.href,
      domain: window.location.hostname,
      title: document.title
    });
  }
  
  return true; // Required for async response
});