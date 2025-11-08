// Unit Test: Tracker Count Updating
// Purpose: Ensure that tracker counts per tab are stored and updated correctly without duplicates

// Mock implementation of tracker counting
let trackerCounts = {};

function updateTrackerCount(tabId, trackerDomain) {
  if (tabId < 0) return;
  
  if (!trackerCounts[tabId]) {
    trackerCounts[tabId] = new Set();
  }
  trackerCounts[tabId].add(trackerDomain);
  return trackerCounts[tabId].size;
}

function resetTrackerCounts() {
  trackerCounts = {};
}

// Test function
function testTrackerCounting() {
  console.log("=== TRACKER COUNT UPDATING TEST ===");
  
  // Reset for clean test
  resetTrackerCounts();
  
  // Test cases
  const testScenarios = [
    {
      name: "Single tab with unique trackers",
      actions: [
        { tabId: 1, domain: "google-analytics.com", expectedCount: 1 },
        { tabId: 1, domain: "facebook.net", expectedCount: 2 },
        { tabId: 1, domain: "doubleclick.net", expectedCount: 3 }
      ]
    },
    {
      name: "Single tab with duplicate trackers",
      actions: [
        { tabId: 2, domain: "google-analytics.com", expectedCount: 1 },
        { tabId: 2, domain: "google-analytics.com", expectedCount: 1 }, // Duplicate
        { tabId: 2, domain: "facebook.net", expectedCount: 2 },
        { tabId: 2, domain: "facebook.net", expectedCount: 2 } // Duplicate
      ]
    },
    {
      name: "Multiple tabs with different trackers",
      actions: [
        { tabId: 3, domain: "google-analytics.com", expectedCount: 1 },
        { tabId: 4, domain: "facebook.net", expectedCount: 1 },
        { tabId: 3, domain: "doubleclick.net", expectedCount: 2 },
        { tabId: 4, domain: "google-analytics.com", expectedCount: 2 }
      ]
    },
    {
      name: "Invalid tab ID handling",
      actions: [
        { tabId: -1, domain: "google-analytics.com", expectedCount: undefined },
        { tabId: 5, domain: "facebook.net", expectedCount: 1 }
      ]
    }
  ];
  
  // Run tests
  let passCount = 0;
  let failCount = 0;
  
  testScenarios.forEach((scenario, scenarioIndex) => {
    console.log(`Scenario ${scenarioIndex + 1}: ${scenario.name}`);
    resetTrackerCounts();
    
    scenario.actions.forEach((action, actionIndex) => {
      const count = updateTrackerCount(action.tabId, action.domain);
      const passed = count === action.expectedCount;
      
      console.log(`  Action ${actionIndex + 1}: Add ${action.domain} to tab ${action.tabId}`);
      console.log(`    Expected count: ${action.expectedCount}`);
      console.log(`    Actual count: ${count}`);
      console.log(`    Result: ${passed ? "PASS" : "FAIL"}`);
      
      if (passed) {
        passCount++;
      } else {
        failCount++;
      }
    });
    
    console.log("---");
  });
  
  console.log(`Summary: ${passCount} passed, ${failCount} failed`);
  console.log("==============================");
  
  return { passed: passCount, failed: failCount };
}

// Run the test
testTrackerCounting();