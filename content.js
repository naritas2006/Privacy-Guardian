// Privacy Guardian - Content Script
// This script runs in the context of web pages

// Log when content script is initialized
console.log(`Privacy Guardian: Content script initialized on ${window.location.hostname}`);

// This content script is minimal for the MVP version
// It can be expanded later to handle more complex interactions

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(`Privacy Guardian: Content script received message:`, message);
  
  if (message.action === 'getPageInfo') {
    // Send page information back to the requester
    const response = {
      url: window.location.href,
      domain: window.location.hostname,
      title: document.title
    };
    
    console.log(`Privacy Guardian: Sending page info:`, response);
    sendResponse(response);
  }
  
  return true; // Required for async response
});