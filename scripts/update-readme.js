#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Get search results and exit code from command line
const searchResultsRaw = process.argv[2];
const exitCode = process.argv[3] || '0';

if (!searchResultsRaw) {
  console.error('Error: No search results provided');
  process.exit(1);
}

// Parse the Kernel invocation output
let searchResults;
try {
  searchResults = JSON.parse(searchResultsRaw);
} catch (error) {
  console.error('Error parsing search results:', error.message);
  process.exit(1);
}

// Determine if the agent actually succeeded in finding flights
const agentMessage = searchResults.data?.agentMessage || '';
const agentSucceeded = !agentMessage.includes('unable to recover') &&
                       !agentMessage.includes('browser issues') &&
                       agentMessage.includes('CHEAPEST FLIGHT');

// Extract flight data from agent message
const timestamp = new Date().toISOString();
const dateStr = new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

// Parse cheapest flight from agent message
const cheapestMatch = agentMessage.match(/CHEAPEST FLIGHT: (.+?) - (.+?) - (.+)/);
const cheapestFlight = cheapestMatch ? {
  airline: cheapestMatch[1],
  price: cheapestMatch[2],
  duration: cheapestMatch[3]
} : null;

// Parse all flights
const flightLines = agentMessage.split('\n').filter(line =>
  /^\d+\./.test(line.trim())
);

const allFlights = flightLines.map(line => {
  const match = line.match(/\d+\.\s+(.+?)\s+-\s+(.+?)\s+-\s+(.+)/);
  if (match) {
    return {
      airline: match[1],
      price: match[2],
      duration: match[3]
    };
  }
  return null;
}).filter(Boolean);

// Generate README content
const statusEmoji = agentSucceeded ? '✅' : '❌';
const statusText = agentSucceeded ? 'Successful' : 'Failed';

const readmeContent = `# Autonomous AI Flight Tracker

This project uses AI agents (Claude + Stagehand + Kernel) to autonomously search for flights and track prices over time.

## Latest Flight Search Results

**Last Updated:** ${dateStr}
**Status:** ${statusEmoji} ${statusText}

**Route:** ${searchResults.data?.searchParams?.origin || 'Johannesburg'} → ${searchResults.data?.searchParams?.destination || 'Athens'}
**Dates:** ${searchResults.data?.searchParams?.departDate || 'June 15, 2026'} to ${searchResults.data?.searchParams?.returnDate || 'June 29, 2026'}

${agentSucceeded ? `
### 🎯 Cheapest Flight Found

${cheapestFlight ? `
| Airline | Price | Duration |
|---------|-------|----------|
| **${cheapestFlight.airline}** | **${cheapestFlight.price}** | **${cheapestFlight.duration}** |
` : '*No cheapest flight data available*'}

### ✈️ All Flight Options

${allFlights.length > 0 ? `
| # | Airline | Price | Duration |
|---|---------|-------|----------|
${allFlights.map((flight, idx) => `| ${idx + 1} | ${flight.airline} | ${flight.price} | ${flight.duration} |`).join('\n')}

**Total options found:** ${allFlights.length}
` : '*No flight options extracted*'}
` : `
### ⚠️ Agent Error

The AI agent encountered issues during the flight search:

\`\`\`
${agentMessage}
\`\`\`

**Note:** The automated search will try again on the next scheduled run.
`}

---

## How It Works

This is a practical demonstration from the article **"Can Claude be a travel agent yet?"**

1. **GitHub Action runs daily** at 9 AM UTC (scheduled via cron)
2. **Deploys to Kernel** (cloud browser automation platform)
3. **Stagehand agent autonomously browses** Google Flights
4. **Extracts flight prices** and updates this README
5. **Commits results** automatically

### Technology Stack

- **AI Agent:** Anthropic Claude (via OpenAI Computer Use API)
- **Browser Automation:** Stagehand v3.0
- **Cloud Execution:** Kernel SDK
- **Scheduling:** GitHub Actions
- **Flight Source:** Google Flights

### Key Features

✅ **Fully autonomous** - No human intervention required
✅ **Cloud-based** - Runs remotely via Kernel
✅ **Scheduled** - Daily price checks automatically
✅ **Evidence-based** - Real flight data, real prices
✅ **Transparent** - Full execution logs in GitHub Actions

---

## Running Locally

### Prerequisites

\`\`\`bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
\`\`\`

### Deploy and Run

\`\`\`bash
# Install Kernel CLI
curl -fsSL https://raw.githubusercontent.com/onkernel/cli/main/install.sh | bash

# Authenticate
kernel auth login

# Deploy the app
kernel deploy flight-search-final.ts --env-file .env

# Run a search
kernel invoke flight-search-final search-flights \\
  --payload '{
    "origin": "Johannesburg",
    "destination": "Athens",
    "departDate": "June 15, 2026",
    "returnDate": "June 29, 2026"
  }'
\`\`\`

---

## Project Context

This is Experiment 4 from the article exploring whether AI can act as a practical travel agent.

**Read the full article:** [Link to published article]

**Experiment results:**
- ❌ Experiment 1: Vanilla Claude (failed - JavaScript + API barriers)
- ✅ Experiment 2: dev-browser skill (succeeded - 11 flights in 2-3 min)
- ✅ Experiment 3: Stagehand local (succeeded - 10 flights in 3.2 min)
- ✅ Experiment 4: Kernel remote (succeeded - 8 flights in 7.3 min)

---

## Limitations

⚠️ **Not all sites accessible** - Some flight sites (like Skyscanner) block bots
⚠️ **Execution time** - Takes 7+ minutes per search (not real-time)
⚠️ **Single site only** - Currently only searches Google Flights

**Best use case:** Scheduled price tracking for specific routes, not real-time comparison shopping.

---

## License

MIT License - See LICENSE file for details

---

*Last automated update: ${timestamp}*
`;

// Write README
const readmePath = join(projectRoot, 'README.md');
writeFileSync(readmePath, readmeContent);

console.log('✅ README updated successfully');
console.log(`📊 Agent status: ${statusEmoji} ${statusText}`);

if (agentSucceeded) {
  console.log(`📊 Found ${allFlights.length} flight options`);
  if (cheapestFlight) {
    console.log(`💰 Cheapest: ${cheapestFlight.airline} - ${cheapestFlight.price} - ${cheapestFlight.duration}`);
  }
} else {
  console.log(`⚠️ Agent failed: ${agentMessage.substring(0, 100)}...`);
}
