/**
 * Playwright demo recording script — records the full Digital Twin Builder
 * end-to-end walkthrough as a video (.webm) for voice-over.
 *
 * Usage:
 *   node scripts/record-demo.mjs
 *
 * Prerequisites:
 *   - API running (pnpm run dev in src/api with GITHUB_TOKEN set)
 *   - Web running (pnpm run dev in src/web) at http://localhost:5173
 *
 * Output:
 *   demo-recording/demo-video.webm
 */

import { chromium } from "playwright";
import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "..", "demo-recording");
const APP_URL = "http://localhost:5173";

// Timing helpers
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PAUSE_SHORT = 1500;   // Brief pause between actions
const PAUSE_MEDIUM = 3000;  // Pause to let content render
const PAUSE_LONG = 5000;    // Pause for agent tool execution
const PAUSE_XLARGE = 10000; // Pause for multi-tool agent responses
const PAUSE_AGENT = 15000;  // Long wait for complex agent operations

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

/** Type text character by character with a human-like delay */
async function humanType(page, selector, text, delay = 40) {
  await page.click(selector);
  await sleep(300);
  for (const char of text) {
    await page.keyboard.type(char, { delay });
  }
  await sleep(500);
}

/** Click a quick action chip by its label text */
async function clickChip(page, label) {
  console.log(`   → Clicking chip: ${label}`);
  const chip = page.locator(".quick-chip", { hasText: label }).first();
  await chip.waitFor({ state: "visible", timeout: 10000 });
  await chip.scrollIntoViewIfNeeded();
  await sleep(500);
  await chip.click();
}

/** Click a header button by its text */
async function clickHeaderButton(page, text) {
  console.log(`   → Clicking header: ${text}`);
  const btn = page.locator(".library-toggle", { hasText: text }).first();
  await btn.waitFor({ state: "visible", timeout: 5000 });
  await btn.click();
}

/** Wait for agent response to finish streaming */
async function waitForAgent(page, timeout = PAUSE_AGENT) {
  console.log(`   → Waiting for agent (up to ${timeout / 1000}s)...`);
  // First, wait a moment for the request to start (button becomes disabled)
  await sleep(2000);
  // Then wait until the send button is re-enabled (agent done streaming)
  try {
    await page.locator(".input-form button[type='submit']:not([disabled])").waitFor({
      state: "visible",
      timeout,
    });
  } catch {
    console.log("   → Agent timeout (continuing anyway)");
  }
  await sleep(PAUSE_MEDIUM);
  // Scroll chat to bottom to see latest response
  try {
    await page.evaluate(() => {
      const msgs = document.querySelectorAll(".messages");
      if (msgs.length > 0) {
        const el = msgs[msgs.length - 1];
        el.scrollTo(0, el.scrollHeight);
      }
    });
  } catch { /* ignore scroll errors */ }
  await sleep(PAUSE_SHORT);
}

/** Submit the current message in the input form */
async function submitMessage(page) {
  const btn = page.locator(".input-form button[type='submit']");
  await btn.waitFor({ state: "visible", timeout: 5000 });
  await btn.click();
}

// ─── Main recording flow ─────────────────────────────────────────────────────

(async () => {
  console.log("🎬 Starting demo recording with Microsoft Edge...");
  console.log(`   Output: ${OUTPUT_DIR}`);

  const browser = await chromium.launch({
    channel: "msedge",
    headless: false,
    args: ["--start-maximized"],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: OUTPUT_DIR, size: { width: 1920, height: 1080 } },
    colorScheme: "dark",
  });

  const page = await context.newPage();

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // PART 1 — Landing Page (show starter prompts)
    // ═══════════════════════════════════════════════════════════════════════
    console.log("📍 Part 1: Landing page");
    await page.goto(APP_URL, { waitUntil: "networkidle" });
    await sleep(PAUSE_MEDIUM);

    // Slowly scroll the landing page to show starter prompts
    await page.mouse.wheel(0, 200);
    await sleep(PAUSE_SHORT);
    await page.mouse.wheel(0, -200);
    await sleep(PAUSE_MEDIUM);

    // ═══════════════════════════════════════════════════════════════════════
    // PART 2 — Digital Twin Creation
    // ═══════════════════════════════════════════════════════════════════════
    console.log("📍 Part 2: Digital Twin Creation");

    // Click "Build From Scratch" flow card
    console.log("   → Clicking 'Build From Scratch'");
    const buildCard = page.locator(".flow-card", { hasText: "Build From Scratch" });
    await buildCard.waitFor({ state: "visible", timeout: 10000 });
    await buildCard.click();
    await waitForAgent(page);

    // Click "Deploy template" quick action
    await clickChip(page, "Deploy template");
    await waitForAgent(page);

    // Describe additional equipment
    console.log("   → Describing factory equipment");
    await humanType(
      page,
      ".input-form input",
      "I have a production line with 3 CNC machines. Each machine has a spindle temperature sensor and a vibration sensor. The whole line also has one energy meter."
    );
    await submitMessage(page);
    await waitForAgent(page, 20000);

    // Add conveyors
    console.log("   → Adding conveyors");
    await humanType(
      page,
      ".input-form input",
      "Add a conveyor between machine 1 and machine 2, and another between machine 2 and machine 3"
    );
    await submitMessage(page);
    await waitForAgent(page);

    // Show graph
    await clickChip(page, "Show graph");
    await waitForAgent(page);

    // Pause on graph view
    await sleep(PAUSE_LONG);

    // ═══════════════════════════════════════════════════════════════════════
    // PART 3 — Real-Time Telemetry & Monitoring
    // ═══════════════════════════════════════════════════════════════════════
    console.log("📍 Part 3: Telemetry & Monitoring");

    // Start telemetry
    await clickChip(page, "Start telemetry");
    await waitForAgent(page);

    // Open Monitor panel
    await clickHeaderButton(page, "Monitor");
    await sleep(PAUSE_LONG);

    // Let sparklines populate
    await sleep(PAUSE_LONG);

    // Setup alerts
    await clickChip(page, "Setup alerts");
    await waitForAgent(page);

    // Show health check
    await clickChip(page, "Health check");
    await waitForAgent(page);

    // Linger on monitor panel to show live data
    await sleep(PAUSE_LONG);

    // ═══════════════════════════════════════════════════════════════════════
    // PART 4 — Production Planning & Simulation
    // ═══════════════════════════════════════════════════════════════════════
    console.log("📍 Part 4: Production Planning & Simulation");

    // Open Planning panel
    await clickHeaderButton(page, "Planning");
    await sleep(PAUSE_MEDIUM);

    // Create production orders
    await humanType(
      page,
      ".input-form input",
      "Create 3 production orders: 500 units of Widget-A due March 15 high priority, 200 units of Widget-B due March 20 medium priority, and 1000 units of Widget-C due March 10 critical priority"
    );
    await submitMessage(page);
    await waitForAgent(page, 20000);

    // Optimize schedule
    await clickChip(page, "Schedule");
    await waitForAgent(page);

    // Identify bottlenecks
    await clickChip(page, "Bottlenecks");
    await waitForAgent(page);

    // Run simulation
    await humanType(
      page,
      ".input-form input",
      "Run a what-if simulation — what happens if we add a second Assembly station and increase conveyor speed by 20%?"
    );
    await submitMessage(page);
    await waitForAgent(page, 20000);
    await sleep(PAUSE_LONG);

    // ═══════════════════════════════════════════════════════════════════════
    // PART 5 — KPI Dashboards
    // ═══════════════════════════════════════════════════════════════════════
    console.log("📍 Part 5: KPI Dashboards");

    // Open KPI panel
    await clickHeaderButton(page, "KPIs");
    await sleep(PAUSE_MEDIUM);

    // OEE Report
    await clickChip(page, "OEE Report");
    await waitForAgent(page);

    // Compare shifts
    await humanType(
      page,
      ".input-form input",
      "Compare Day Shift vs Night Shift performance"
    );
    await submitMessage(page);
    await waitForAgent(page);

    // Executive summary
    await humanType(
      page,
      ".input-form input",
      "Give me a manager-level executive summary of plant performance"
    );
    await submitMessage(page);
    await waitForAgent(page, 20000);
    await sleep(PAUSE_LONG);

    // ═══════════════════════════════════════════════════════════════════════
    // PART 6 — Supply Chain
    // ═══════════════════════════════════════════════════════════════════════
    console.log("📍 Part 6: Supply Chain");

    // Open Supply Chain panel
    await clickHeaderButton(page, "Supply");
    await sleep(PAUSE_MEDIUM);

    // Check inventory
    await clickChip(page, "Inventory");
    await waitForAgent(page);

    // Trigger replenishment
    await humanType(
      page,
      ".input-form input",
      "Trigger replenishment for any materials that are below their reorder point"
    );
    await submitMessage(page);
    await waitForAgent(page);

    // Supply chain health
    await humanType(
      page,
      ".input-form input",
      "Give me an overall supply chain health assessment"
    );
    await submitMessage(page);
    await waitForAgent(page);

    // Edge deployment
    await humanType(
      page,
      ".input-form input",
      "What edge modules are available and deploy the OPCPublisher to edge-factory-01"
    );
    await submitMessage(page);
    await waitForAgent(page);
    await sleep(PAUSE_LONG);

    // ═══════════════════════════════════════════════════════════════════════
    // PART 7 — SDLC
    // ═══════════════════════════════════════════════════════════════════════
    console.log("📍 Part 7: SDLC");

    // Close the supply chain panel to show the graph again
    await clickHeaderButton(page, "Supply");
    await sleep(PAUSE_SHORT);

    // Commit changes
    await clickChip(page, "Commit change");
    await waitForAgent(page);

    // Open PR
    await clickChip(page, "Open PR");
    await waitForAgent(page);

    // Check CI
    await clickChip(page, "Check CI");
    await waitForAgent(page);

    // Release
    await clickChip(page, "Release");
    await waitForAgent(page);

    await sleep(PAUSE_LONG);

    // ═══════════════════════════════════════════════════════════════════════
    // PART 8 — Final panoramic view
    // ═══════════════════════════════════════════════════════════════════════
    console.log("📍 Part 8: Final panoramic view");

    // Show each panel one more time quickly for a final sweep
    await clickHeaderButton(page, "Monitor");
    await sleep(PAUSE_MEDIUM);
    await clickHeaderButton(page, "Planning");
    await sleep(PAUSE_MEDIUM);
    await clickHeaderButton(page, "KPIs");
    await sleep(PAUSE_MEDIUM);
    await clickHeaderButton(page, "Supply");
    await sleep(PAUSE_MEDIUM);

    // Close panel and show graph
    await clickHeaderButton(page, "Supply");
    await sleep(PAUSE_LONG);

    console.log("✅ Demo flow complete!");
  } catch (err) {
    console.error("❌ Error during recording:", err.message);
    console.error(err.stack);
    // Take a screenshot on failure for debugging
    try {
      await page.screenshot({ path: join(OUTPUT_DIR, "error-screenshot.png") });
      console.log("   Screenshot saved to demo-recording/error-screenshot.png");
    } catch { /* ignore */ }
  } finally {
    await page.close();
    await context.close();
    await browser.close();
    console.log(`\n🎥 Recording saved to: ${OUTPUT_DIR}`);
    console.log("   Look for the .webm file in that directory.");
    console.log("   You can add your voice-over narration on top of it.");
  }
})();
