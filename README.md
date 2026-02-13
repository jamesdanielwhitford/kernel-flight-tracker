# Autonomous AI Flight Tracker

This project uses AI agents (Claude + Stagehand + Kernel) to autonomously search for flights and track prices over time.

## Latest Flight Search Results

**Last Updated:** February 13, 2026
**Status:** ✅ Successful

**Route:** Johannesburg → Athens
**Dates:** June 15, 2026 to June 29, 2026


### 🎯 Cheapest Flight Found


| Airline | Price | Duration |
|---------|-------|----------|
| **Airlink & Turkish Airlines** | **$538** | **24 hr 20 min** |


### ✈️ All Flight Options


| # | Airline | Price | Duration |
|---|---------|-------|----------|
| 1 | Airlink & Turkish Airlines | $538 | 24 hr 20 min |
| 2 | Ethiopian & Turkish Airlines | $621 | 17 hr 55 min |
| 3 | Emirates | $736 | 21 hr 5 min |
| 4 | Qatar Airways | $737 | 14 hr 30 min |
| 5 | Emirates | $759 | 15 hr 40 min |
| 6 | Qatar Airways | $907 | 15 hr 15 min |
| 7 | Lufthansa & South African | $990 | 14 hr 55 min |
| 8 | Ethiopian & Aegean | $995 | 14 hr 30 min |

**Total options found:** 8



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

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### Deploy and Run

```bash
# Install Kernel CLI
curl -fsSL https://raw.githubusercontent.com/onkernel/cli/main/install.sh | bash

# Authenticate
kernel auth login

# Deploy the app
kernel deploy flight-search-final.ts --env-file .env

# Run a search
kernel invoke flight-search-final search-flights \
  --payload '{
    "origin": "Johannesburg",
    "destination": "Athens",
    "departDate": "June 15, 2026",
    "returnDate": "June 29, 2026"
  }'
```

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

*Last automated update: 2026-02-13T09:36:53.604Z*
