# Privacy Guardian

A lightweight Chrome extension that helps non-technical users see and understand third-party tracking on websites they visit. Privacy Guardian is 100% local, with no external servers, focusing on awareness rather than heavy blocking.

## Features

- **Tracker Detection**: Identifies third-party requests and cookies using Chrome's webRequest API
- **Visual Dashboard**: Clean, minimal popup interface showing:
  - Number of trackers detected on the current site
  - Types of data involved (cookies)
  - Categorized list of trackers (Analytics, Advertising, Social Media)
- **Privacy-Focused**: All processing happens locally - no data leaves your browser
- **Optional Blocking**: Toggle to block trackers on specific sites
- **Known Tracker Database**: Uses a simplified version of common tracker lists

## Installation

### From ZIP File

1. Download the ZIP file of this extension
2. Extract the ZIP file to a folder on your computer
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" by toggling the switch in the top right corner
5. Click "Load unpacked" and select the extracted folder
6. The Privacy Guardian extension should now be installed and visible in your Chrome toolbar

### From Source Code

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" by toggling the switch in the top right corner
4. Click "Load unpacked" and select the folder containing the extension files
5. The Privacy Guardian extension should now be installed and visible in your Chrome toolbar

## Permissions Used

This extension requires the following permissions:

- **webRequest**: To monitor network requests and identify trackers
- **storage**: To store tracker data and preferences locally
- **activeTab**: To access information about the current tab
- **host permissions** (`<all_urls>`): To monitor requests across all websites

## How It Works

1. The extension monitors all outgoing web requests from the pages you visit
2. It identifies third-party requests by comparing the domain of the request with the domain of the page
3. It checks these third-party domains against a database of known trackers
4. The popup displays a summary of trackers found on the current page
5. All data is stored locally in your browser using chrome.storage.local

## Privacy Statement

- **100% Local Processing**: All data processing happens within your browser
- **No Data Collection**: This extension does not collect or transmit any of your browsing data
- **No External Servers**: The extension does not communicate with any external servers
- **No Fingerprinting**: The extension does not use or detect browser fingerprinting techniques

## Development

### Project Structure

## Testing & Quality Assurance

### Run Tests

To run all unit and integration tests:

    npm run test

### Run Coverage

To generate a coverage report:

    npm run coverage

Coverage reports will be available in the `privacy-guardian/coverage` directory.

### Mutation Testing

To run mutation tests with Stryker:

    npm run mutation

Mutation reports will be available in the `privacy-guardian/reports/mutation` directory.

## Building the Extension

To build a distributable ZIP file for Chrome installation:

    npm run build

The ZIP file will be located in the `dist` directory.

## Continuous Integration

This project uses GitHub Actions for CI/CD. The workflow installs dependencies, runs tests, checks coverage, runs mutation testing, and builds the distributable ZIP file automatically on each push.