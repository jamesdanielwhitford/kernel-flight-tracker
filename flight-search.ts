import Kernel, { type KernelContext } from '@onkernel/sdk';
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

const kernel = new Kernel();
const app = kernel.app('flight-search');

// Define payload schema
const FlightSearchPayload = z.object({
  origin: z.string(),
  destination: z.string(),
  departDate: z.string(),
  returnDate: z.string(),
});

app.action('multi-site-search', async (ctx: KernelContext, payload: unknown) => {
  const validatedPayload = FlightSearchPayload.parse(payload);

  console.log('Starting multi-site flight search...');
  console.log('Payload:', validatedPayload);

  // 1. Create Kernel browser
  const kernelBrowser = await kernel.browsers.create({
    invocation_id: ctx.invocation_id,
    stealth: true,
  });

  console.log('Kernel browser created:', kernelBrowser.session_id);

  // 2. Connect Stagehand to Kernel browser
  const stagehand = new Stagehand({
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
  console.log('Stagehand initialized');

  try {
    // 3. Use agent mode for autonomous browsing
    const result = await autonomousFlightSearch(stagehand, validatedPayload);
    console.log('Search completed successfully');
    return result;
  } finally {
    await stagehand.close();
    await kernel.browsers.deleteByID(kernelBrowser.session_id);
    console.log('Cleaned up browser session');
  }
});

async function autonomousFlightSearch(stagehand: Stagehand, payload: z.infer<typeof FlightSearchPayload>) {
  const { origin, destination, departDate, returnDate } = payload;

  // Agent configuration with forceful prompting (learned from Exp 3e)
  const systemPrompt = `CRITICAL INSTRUCTIONS:
- You MUST complete the entire multi-site flight search without asking for user confirmation
- DO NOT stop and ask "Should I proceed?" - just proceed automatically
- Your job is NOT done until you have visited ALL specified sites and extracted flight data from each
- Visit Google Flights, Kayak, and Skyscanner
- Extract prices, layover times, connections, and boarding times for each option
- Compile all results into a comprehensive comparison`;

  const instruction = `Find flights from ${origin} to ${destination} for ${departDate} to ${returnDate}.

Visit these websites in order:
1. Google Flights (google.com/flights)
2. Kayak (kayak.com)
3. Skyscanner (skyscanner.com)

For EACH site:
- Navigate to the site
- Fill in the search form
- Execute the search
- Extract flight options with: airline, price, duration, layover details, connection airports

Compile a comprehensive comparison table showing all options from all three sites.`;

  const page = stagehand.context.pages()[0];

  // Start with Google Flights to avoid ambiguous navigation
  console.log('Navigating to Google Flights...');
  await page.goto('https://www.google.com/flights');

  console.log('Starting autonomous agent execution...');

  const agent = stagehand.agent({
    modelName: "openai/gpt-4o",
    systemPrompt: systemPrompt,
  });

  const result = await agent.execute({
    instruction: instruction,
    maxSteps: 150,
  });

  console.log('Agent execution completed');
  console.log('Result:', result);

  return {
    success: true,
    data: result,
    message: 'Multi-site flight search completed',
  };
}
