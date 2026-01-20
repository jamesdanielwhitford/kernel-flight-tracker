import Kernel, { type KernelContext } from '@onkernel/sdk';
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

const kernel = new Kernel();
const app = kernel.app('skyscanner-test');

app.action('test-bot-blocker', async (ctx: KernelContext) => {
  console.log('Starting Skyscanner bot blocker test...');

  // 1. Create Kernel browser with stealth mode
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
    const result = await testSkyscannerAccess(stagehand);
    console.log('Test completed');
    return result;
  } finally {
    await stagehand.close();
    await kernel.browsers.deleteByID(kernelBrowser.session_id);
    console.log('Cleaned up browser session');
  }
});

async function testSkyscannerAccess(stagehand: Stagehand) {
  const page = stagehand.context.pages()[0];

  // EXTREMELY forceful system prompt
  const systemPrompt = `YOU ARE A PERSISTENT WEB NAVIGATION AGENT.

CRITICAL RULES:
1. You MUST get past any bot detection, CAPTCHA, or blocking pages you encounter
2. You MUST try EVERY possible method to bypass blocks:
   - Wait for elements to load
   - Click "I am human" buttons if present
   - Solve simple CAPTCHAs if possible
   - Try refreshing the page
   - Try waiting longer for bot detection to pass
   - Look for skip buttons or continue buttons
3. DO NOT give up when you see a bot blocker page
4. DO NOT report "blocked" unless you've tried at least 5 different bypass methods
5. Your ONLY job is to reach the actual Skyscanner flight search page
6. Be creative and persistent - try unconventional approaches

IF YOU SEE A BOT BLOCKER:
- First, wait 10 seconds to see if it auto-resolves
- Look for any clickable elements (checkboxes, buttons, links)
- Try clicking anywhere on the page to trigger interactions
- Check if scrolling helps
- Try waiting another 20 seconds
- Look for alternative navigation paths

YOU MUST NOT STOP until you either:
A) Successfully reach the Skyscanner search form, OR
B) Have exhausted at least 10 different bypass attempts

Report your progress step by step so we can see what you tried.`;

  const instruction = `Navigate to Skyscanner.com and get past ANY bot detection or blocking pages.

Your goal: Reach the actual flight search page where you can see:
- A "From" input field
- A "To" input field
- Date selection fields
- A search button

Steps to take:
1. Navigate to https://www.skyscanner.com
2. If you encounter a bot blocker/CAPTCHA page:
   - Wait at least 10 seconds
   - Look for "I am human" checkboxes or verification buttons
   - Try clicking any interactive elements
   - Scroll the page
   - Wait another 20 seconds if needed
   - Try refreshing if nothing works
3. Keep trying different approaches until you reach the search form
4. Once you see the search form, report: "SUCCESS - reached Skyscanner search page"
5. If after 10 different attempts you still can't get past the blocker, report what you tried

Be persistent and creative. Do not give up easily.`;

  console.log('Navigating to Skyscanner...');
  await page.goto('https://www.skyscanner.com');

  console.log('Starting aggressive bot blocker bypass attempt...');

  const agent = stagehand.agent({
    modelName: "openai/gpt-4o",
    systemPrompt: systemPrompt,
  });

  const result = await agent.execute({
    instruction: instruction,
    maxSteps: 80, // Give it plenty of steps to try different approaches
  });

  console.log('Agent execution completed');
  console.log('Result:', result);

  return {
    success: true,
    data: result,
    message: 'Skyscanner bot blocker test completed',
  };
}
