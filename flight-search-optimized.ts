import Kernel, { type KernelContext } from '@onkernel/sdk';
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

const kernel = new Kernel();
const app = kernel.app('flight-search-optimized');

// Define schema for flight data extraction
const FlightSchema = z.object({
  airline: z.string().describe("The airline name (e.g., 'Emirates', 'Lufthansa')"),
  price: z.string().describe("The total price as displayed (e.g., '$1,234', '€890')"),
  duration: z.string().describe("Total flight duration (e.g., '14h 30m', '18h 5m')"),
  stops: z.number().describe("Number of stops (0 for nonstop, 1, 2, etc.)"),
  departureTime: z.string().describe("Departure time from origin"),
  arrivalTime: z.string().describe("Arrival time at destination"),
});

const FlightResultsSchema = z.object({
  flights: z.array(FlightSchema).describe("Array of flight options found on the page"),
  totalResults: z.number().describe("Total number of flights found"),
});

type FlightSearchPayload = {
  origin: string;
  destination: string;
  departDate: string;
  returnDate: string;
};

/**
 * OPTIMIZED VERSION using Stagehand primitives instead of full CUA agent
 *
 * Key improvements:
 * 1. Uses act() for form filling - single LLM call per action
 * 2. Uses extract() with Zod schema - structured data extraction
 * 3. Uses observe() for waiting - explicit wait conditions
 * 4. Browser pools for faster startup
 * 5. Retry logic for transient failures
 * 6. Session Inspector URL in output
 */
app.action('search-flights', async (ctx: KernelContext, payload: FlightSearchPayload) => {
  console.log('🚀 Starting optimized flight search with Stagehand primitives...');
  console.log('Search params:', payload);

  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`Attempt ${attempt}/${MAX_RETRIES}...`);

    let kernelBrowser;
    let stagehand;

    try {
      // 1. Create Kernel browser with optimizations
      kernelBrowser = await kernel.browsers.create({
        invocation_id: ctx.invocation_id,
        stealth: true,
        pool: 'flight-search-pool', // Use browser pool for faster startup
        profile_id: 'google-flights-profile', // Persist cookies/sessions
      });

      console.log('✅ Kernel browser created:', kernelBrowser.session_id);
      console.log(`📊 Session Inspector: https://app.onkernel.com/sessions/${kernelBrowser.session_id}`);

      // 2. Connect Stagehand to Kernel browser
      stagehand = new Stagehand({
        env: "LOCAL",
        localBrowserLaunchOptions: {
          cdpUrl: kernelBrowser.cdp_ws_url,
        },
        modelName: "openai/gpt-4o",
        apiKey: process.env.OPENAI_API_KEY,
        verbose: 1,
        domSettleTimeout: 30_000,
      });

      await stagehand.init();
      console.log('✅ Stagehand initialized');

      // 3. Navigate to Google Flights
      const page = stagehand.page;
      await page.goto('https://www.google.com/travel/flights', { waitUntil: 'networkidle' });
      console.log('✅ Navigated to Google Flights');

      // Wait for page to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 4. Use act() primitive for form filling (cheaper + faster than agent)
      console.log('📝 Filling in origin...');
      await stagehand.act({
        action: `Click on the "Where from?" field and type "${payload.origin}"`
      });
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('📝 Selecting origin from dropdown...');
      await stagehand.act({
        action: `Click on the first matching airport suggestion for ${payload.origin}`
      });
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('📝 Filling in destination...');
      await stagehand.act({
        action: `Click on the "Where to?" field and type "${payload.destination}"`
      });
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('📝 Selecting destination from dropdown...');
      await stagehand.act({
        action: `Click on the first matching airport suggestion for ${payload.destination}`
      });
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('📅 Setting departure date...');
      await stagehand.act({
        action: `Set the departure date to ${payload.departDate}`
      });
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('📅 Setting return date...');
      await stagehand.act({
        action: `Set the return date to ${payload.returnDate}`
      });
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('🔍 Clicking search button...');
      await stagehand.act({
        action: "Click the Search button to search for flights"
      });

      // 5. Use observe() to wait for results to load
      console.log('⏳ Waiting for flight results to load...');
      await stagehand.observe({
        instruction: "Wait until flight results are visible on the page with prices displayed",
        timeoutMs: 45000,
      });

      // Wait additional time for all results to render
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log('✅ Flight results loaded');

      // 6. Use extract() with Zod schema for structured data extraction
      console.log('📊 Extracting flight data...');
      const flightData = await stagehand.extract({
        instruction: "Extract all visible flight options from the results page, including airline, price, duration, stops, departure time, and arrival time",
        schema: FlightResultsSchema,
        modelName: "openai/gpt-4o",
      });

      console.log(`✅ Extracted ${flightData.flights.length} flights`);

      // Find cheapest flight
      const cheapestFlight = flightData.flights.reduce((min, flight) => {
        // Extract numeric price for comparison (remove currency symbols and commas)
        const getNumericPrice = (priceStr: string) => {
          return parseFloat(priceStr.replace(/[^0-9.]/g, ''));
        };
        return getNumericPrice(flight.price) < getNumericPrice(min.price) ? flight : min;
      }, flightData.flights[0]);

      console.log('💰 Cheapest flight:', cheapestFlight);

      // Cleanup
      await stagehand.close();
      await kernel.browsers.deleteByID(kernelBrowser.session_id);
      console.log('🧹 Cleaned up browser session');

      return {
        success: true,
        data: {
          searchParams: payload,
          totalFlights: flightData.flights.length,
          cheapestFlight,
          allFlights: flightData.flights,
          sessionInspectorUrl: `https://app.onkernel.com/sessions/${kernelBrowser.session_id}`,
        },
        message: `Found ${flightData.flights.length} flights. Cheapest: ${cheapestFlight.airline} - ${cheapestFlight.price}`,
      };

    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Attempt ${attempt} failed:`, error);

      // Clean up browser even on error
      try {
        if (stagehand) await stagehand.close();
        if (kernelBrowser) await kernel.browsers.deleteByID(kernelBrowser.session_id);
      } catch (cleanupError) {
        console.error('Error cleaning up browser:', cleanupError);
      }

      // If not the last attempt, wait before retrying
      if (attempt < MAX_RETRIES) {
        const waitTime = attempt * 5000; // Progressive backoff: 5s, 10s
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // All retries failed
  return {
    success: false,
    error: lastError?.message || 'Unknown error after all retries',
    message: `Flight search failed after ${MAX_RETRIES} attempts`,
  };
});

export default app;
