// Unit Test: Tracker Matching Logic
// Purpose: Make sure your detection function correctly identifies trackers from your known list

// Import functions to test (in a real environment, you would use import/require)
// For testing purposes, we'll redefine the functions here
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return url;
  }
}

// Known trackers list (simplified version for testing)
const knownTrackers = {
  "google-analytics.com": { name: "Google Analytics", category: "Analytics" },
  "doubleclick.net": { name: "DoubleClick", category: "Advertising" },
  "facebook.net": { name: "Facebook", category: "Social Media" },
  "facebook.com": { name: "Facebook", category: "Social Media" },
  "googlesyndication.com": { name: "Google Ads", category: "Advertising" },
  "amazon-adsystem.com": { name: "Amazon Ads", category: "Advertising" }
};

// Function to test
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

// Test function
function testTrackerMatching() {
  console.log("=== TRACKER MATCHING LOGIC TEST ===");
  
  // Test cases
  const testCases = [
    // Exact matches
    { input: "google-analytics.com", expected: "Google Analytics" },
    { input: "facebook.net", expected: "Facebook" },
    
    // Subdomain matches
    { input: "www.google-analytics.com", expected: "Google Analytics" },
    { input: "static.doubleclick.net", expected: "DoubleClick" },
    { input: "connect.facebook.net", expected: "Facebook" },
    
    // Non-matches
    { input: "example.com", expected: null },
    { input: "google.com", expected: null },
    { input: "analytics-platform.com", expected: null },
    
    // Edge cases
    { input: "mygoogle-analytics.com", expected: null }, // Should not match
    { input: "doubleclick.net.malicious.com", expected: null } // Should not match
  ];
  
  // Run tests
  let passCount = 0;
  let failCount = 0;
  
  testCases.forEach((testCase, index) => {
    const result = isKnownTracker(testCase.input);
    const actualName = result ? result.name : null;
    const passed = actualName === testCase.expected;
    
    console.log(`Test ${index + 1}: ${testCase.input}`);
    console.log(`  Expected: ${testCase.expected || "null"}`);
    console.log(`  Actual: ${actualName || "null"}`);
    console.log(`  Result: ${passed ? "PASS" : "FAIL"}`);
    
    if (passed) {
      passCount++;
    } else {
      failCount++;
    }
    
    console.log("---");
  });
  
  console.log(`Summary: ${passCount} passed, ${failCount} failed`);
  console.log("==============================");
  
  return { passed: passCount, failed: failCount };
}

// Run the test
testTrackerMatching();