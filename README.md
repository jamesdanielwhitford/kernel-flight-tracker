# Autonomous AI Flight Tracker

This project uses AI agents (Claude + Stagehand + Kernel) to autonomously search for flights and track prices over time.

## Latest Flight Search Results

**Last Updated:** January 21, 2026
**Status:** ❌ Failed

**Route:** Johannesburg → Athens
**Dates:** June 15, 2026 to June 29, 2026


### ⚠️ Agent Error

The AI agent encountered issues during the flight search:

```
Failed to execute task: {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count, limit: 0, model: computer-use-preview\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: computer-use-preview\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: computer-use-preview\nPlease retry in 16.530305391s.","status":"RESOURCE_EXHAUSTED","details":[{"@type":"type.googleapis.com/google.rpc.Help","links":[{"description":"Learn more about Gemini API quotas","url":"https://ai.google.dev/gemini-api/docs/rate-limits"}]},{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_input_token_count","quotaId":"GenerateContentInputTokensPerModelPerMinute-FreeTier","quotaDimensions":{"location":"global","model":"computer-use-preview"}},{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier","quotaDimensions":{"model":"computer-use-preview","location":"global"}},{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier","quotaDimensions":{"location":"global","model":"computer-use-preview"}}]},{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"16s"}]}}
```

**Note:** The automated search will try again on the next scheduled run.


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

*Last automated update: 2026-01-21T12:43:47.698Z*
