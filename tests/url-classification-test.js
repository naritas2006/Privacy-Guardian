// Unit Test: URL Classification
// Purpose: Test that your classification mapping works correctly

// Known trackers with classifications
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

// Test function
function testURLClassification() {
  console.log("=== URL CLASSIFICATION TEST ===");
  
  // Test cases
  const testCases = [
    // Test category counts
    { 
      name: "Category distribution check",
      test: () => {
        const categories = {};
        
        // Count trackers by category
        for (const domain in knownTrackers) {
          const category = knownTrackers[domain].category;
          categories[category] = (categories[category] || 0) + 1;
        }
        
        console.log("  Category distribution:");
        for (const category in categories) {
          console.log(`    ${category}: ${categories[category]} trackers`);
        }
        
        // Verify we have at least one tracker in each expected category
        const expectedCategories = ["Analytics", "Advertising", "Social Media", "A/B Testing"];
        const missingCategories = expectedCategories.filter(cat => !categories[cat]);
        
        if (missingCategories.length > 0) {
          console.log(`  Missing categories: ${missingCategories.join(", ")}`);
          return false;
        }
        
        return true;
      }
    },
    
    // Test specific mappings
    {
      name: "Specific tracker classification check",
      test: () => {
        const expectedMappings = [
          { domain: "google-analytics.com", expectedCategory: "Analytics" },
          { domain: "facebook.net", expectedCategory: "Social Media" },
          { domain: "doubleclick.net", expectedCategory: "Advertising" },
          { domain: "optimizely.com", expectedCategory: "A/B Testing" }
        ];
        
        let allCorrect = true;
        
        console.log("  Specific tracker classifications:");
        for (const mapping of expectedMappings) {
          const actualCategory = knownTrackers[mapping.domain]?.category;
          const isCorrect = actualCategory === mapping.expectedCategory;
          
          console.log(`    ${mapping.domain}: expected "${mapping.expectedCategory}", got "${actualCategory}" - ${isCorrect ? "PASS" : "FAIL"}`);
          
          if (!isCorrect) {
            allCorrect = false;
          }
        }
        
        return allCorrect;
      }
    },
    
    // Test for consistency
    {
      name: "Classification consistency check",
      test: () => {
        const domainsByCategory = {};
        
        // Group domains by category
        for (const domain in knownTrackers) {
          const category = knownTrackers[domain].category;
          if (!domainsByCategory[category]) {
            domainsByCategory[category] = [];
          }
          domainsByCategory[category].push(domain);
        }
        
        // Check for naming consistency within categories
        let allConsistent = true;
        
        console.log("  Classification consistency:");
        for (const category in domainsByCategory) {
          // Check if domains with similar names have the same category
          const domains = domainsByCategory[category];
          
          // Example: Check if all Google services are consistently categorized
          if (category === "Analytics") {
            const googleAnalyticsDomains = domains.filter(d => d.includes("google") && d.includes("analytic"));
            const otherGoogleDomains = Object.keys(knownTrackers).filter(d => 
              d.includes("google") && !d.includes("analytic") && knownTrackers[d].category !== "Analytics"
            );
            
            console.log(`    Google analytics domains in Analytics category: ${googleAnalyticsDomains.length}`);
            console.log(`    Google domains in other categories: ${otherGoogleDomains.length}`);
            
            if (googleAnalyticsDomains.length === 0) {
              console.log("    FAIL: No Google analytics domains found in Analytics category");
              allConsistent = false;
            }
          }
        }
        
        return allConsistent;
      }
    }
  ];
  
  // Run tests
  let passCount = 0;
  let failCount = 0;
  
  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.name}`);
    
    const passed = testCase.test();
    
    console.log(`  Overall result: ${passed ? "PASS" : "FAIL"}`);
    
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
testURLClassification();