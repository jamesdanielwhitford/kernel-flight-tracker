#!/bin/bash

# Local testing script for flight search before deploying to GitHub Actions
# This script tests the full workflow locally

set -e  # Exit on any error

echo "🧪 Testing flight search locally..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ Error: .env file not found"
  echo "   Create .env with: OPENAI_API_KEY=your_key_here"
  exit 1
fi

# Load environment variables
source .env

if [ -z "$OPENAI_API_KEY" ]; then
  echo "❌ Error: OPENAI_API_KEY not set in .env"
  exit 1
fi

# Check if Kernel CLI is installed
if ! command -v kernel &> /dev/null; then
  echo "❌ Error: Kernel CLI not installed"
  echo "   Install with: curl -fsSL https://raw.githubusercontent.com/onkernel/cli/main/install.sh | bash"
  exit 1
fi

# Check if authenticated
if ! kernel auth status &> /dev/null; then
  echo "❌ Error: Not authenticated with Kernel"
  echo "   Run: kernel auth login"
  exit 1
fi

echo "✅ Prerequisites checked"
echo ""

# Deploy to Kernel
echo "📦 Deploying to Kernel..."
kernel deploy flight-search-final.ts --env-file .env

if [ $? -ne 0 ]; then
  echo "❌ Deployment failed"
  exit 1
fi

echo "✅ Deployment successful"
echo ""

# Run the search
echo "🔍 Running flight search..."
echo "   Origin: Johannesburg"
echo "   Destination: Athens"
echo "   Dates: June 15-29, 2026"
echo ""

OUTPUT=$(kernel invoke flight-search-final search-flights \
  --payload '{
    "origin": "Johannesburg",
    "destination": "Athens",
    "departDate": "June 15, 2026",
    "returnDate": "June 29, 2026"
  }' \
  --wait)

echo "✅ Search completed!"
echo ""
echo "📊 Results:"
echo "$OUTPUT"
echo ""

# Save results to temp file for parsing test
echo "$OUTPUT" > /tmp/flight-search-results.json

# Test README update script
echo "📝 Testing README update..."
node scripts/update-readme.js "$OUTPUT"

if [ $? -eq 0 ]; then
  echo "✅ README update successful"
  echo ""
  echo "📄 Check README.md to see updated content"
else
  echo "❌ README update failed"
  exit 1
fi

echo ""
echo "🎉 All tests passed!"
echo ""
echo "Next steps:"
echo "  1. Review README.md to verify formatting"
echo "  2. Create private GitHub repo: gh repo create kernel-flight-tracker --private"
echo "  3. Set up secrets: gh secret set OPENAI_API_KEY -b \"your_key\""
echo "  4. Set up secrets: gh secret set KERNEL_API_KEY -b \"your_key\""
echo "  5. Push code and trigger workflow"
