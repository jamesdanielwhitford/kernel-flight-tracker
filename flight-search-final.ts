import Kernel, { type KernelContext } from '@onkernel/sdk';
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

const kernel = new Kernel();
const app = kernel.app('flight-search-final');

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
  flights: z.array(FlightSchema).describe("Array of flight options"),
  origin: z.string(),
  destination: z.string(),
  departDate: z.string(),
  returnDate: z.string(),
});

type FlightSearchPayload = {
  origin: string;
  destination: string;
  departDate: string;
  returnDate: string;
};

app.action('search-flights', async (ctx: KernelContext, payload: FlightSearchPayload) => {
  console.log('Starting Google Flights search with structured extraction...');
  console.log('Search params:', payload);

  // 1. Create Kernel browser with stealth mode
  const kernelBrowser = await kernel.browsers.create({
    invocation_id: ctx.invocation_id,
    stealth: true,
  });

  console.log('Kernel browser created:', kernelBrowser.session_id);

  try {
    // 2. Connect Stagehand to Kernel browser
    const stagehand = new Stagehand({
      env: "LOCAL",
      localBrowserLaunchOptions: {
        cdpUrl: kernelBrowser.cdp_ws_url,
      },
      modelName: "google/gemini-2.0-flash-exp",
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      verbose: 1,
      domSettleTimeout: 30_000,
    });

    await stagehand.init();
    console.log('Stagehand initialized');

    // 3. Navigate to Google Flights and fill in search form
    const page = stagehand.context.pages()[0];
    await page.goto('https://www.google.com/travel/flights');

    console.log('Navigated to Google Flights');

    // 4. Use CUA agent with explicit step-by-step instructions (pattern from Experiment 3e)
    const agent = stagehand.agent({
      mode: 'cua',
      model: "google/gemini-2.0-flash-exp",
      systemPrompt: `You are a helpful travel assistant that finds cheap flights.

CRITICAL INSTRUCTIONS:
- You MUST complete the entire task without asking for user confirmation
- DO NOT stop and ask "Should I proceed?" - just proceed automatically
- Your job is NOT done until you have reached the flight results page with visible prices
- Complete ALL steps from search form to results page`,
    });

    console.log('Starting autonomous form fill and search...');

    const result = await agent.execute({
      instruction: `Your task is to find and report the cheapest flight from ${payload.origin} to ${payload.destination} for ${payload.departDate} to ${payload.returnDate}.

CRITICAL: You MUST complete this ENTIRE task. Do NOT stop and ask for confirmation. Just do it.

Steps you MUST complete (all of them, no stopping early):

1. Fill in "Where from?" with "${payload.origin}" and select the matching airport
2. Fill in "Where to?" with "${payload.destination}" and select the matching airport
3. Set departure date: ${payload.departDate}
4. Set return date: ${payload.returnDate}
5. Click the Search button (DO NOT ASK - JUST CLICK IT)
6. Wait for results to fully load (at least 5 seconds)
7. Look at ALL the flight options shown on the results page
8. Extract the prices, airlines, and durations
9. Report your findings in this format:

CHEAPEST FLIGHT: [airline] - [price] - [duration]

ALL OPTIONS FOUND:
1. [airline] - [price] - [duration]
2. [airline] - [price] - [duration]
3. [airline] - [price] - [duration]
(continue for all visible options)

Your task is ONLY complete when you have reported actual flight prices.
DO NOT ask "should I proceed?" - PROCEED AUTOMATICALLY.`,
      maxSteps: 50,
    });

    console.log('Agent execution complete!');
    console.log('Agent result:', result.message);

    await stagehand.close();
    await kernel.browsers.deleteByID(kernelBrowser.session_id);
    console.log('Cleaned up browser session');

    return {
      success: true,
      data: {
        searchParams: payload,
        agentMessage: result.message,
        completed: result.completed,
      },
      message: 'Flight search completed successfully',
    };

  } catch (error) {
    console.error('Error during flight search:', error);

    // Clean up browser even on error
    try {
      await kernel.browsers.deleteByID(kernelBrowser.session_id);
    } catch (cleanupError) {
      console.error('Error cleaning up browser:', cleanupError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Flight search failed',
    };
  }
});

export default app;
