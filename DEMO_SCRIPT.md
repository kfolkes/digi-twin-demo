# Digital Twin Builder — End-to-End Demo Script

> **Title:** Lights-Out Manufacturing with AI Agents — Digital Twin Builder  
> **Duration:** ~15 minutes (2 min context + 13 min across 6 demo sections)  
> **Setup:** Web UI at localhost:5173 open, ADT instance connected, browser visible to audience  
> **Features covered:** Digital twins, live telemetry, alerts, production planning, KPI dashboards, supply chain, edge computing, SDLC

---

## PART 1 — Context & Why This Matters (0:00 – 2:00)

### Opening (0:00 – 0:40)

> "Digital twins are one of the most powerful concepts in IoT and smart infrastructure — a live virtual replica of a physical environment. But if you've ever tried to build one, you know the pain: you're writing DTDL JSON schemas by hand, clicking through the Azure portal creating twin after twin, manually wiring relationships, and hoping you didn't misspell a model ID. It's slow, error-prone, and requires deep knowledge of the Digital Twins SDK."

### The Problem (0:40 – 1:10)

> "Today, building and *operating* a smart factory requires skills that rarely exist in the same person:
> 1. **Domain expertise** — knowing what a factory floor actually looks like
> 2. **DTDL knowledge** — writing the Digital Twins Definition Language models correctly
> 3. **Azure SDK proficiency** — using the Digital Twins API for CRUD operations
> 4. **Operational awareness** — monitoring telemetry, managing alerts, tracking KPIs, scheduling production, and managing supply chain
>
> What if the domain expert — the facilities manager or the factory engineer — could do *all of this* through natural language?"

### The Solution (1:10 – 1:40)

> "That's what we built. **Digital Twin Builder** is a lights-out manufacturing platform powered by the **GitHub Copilot SDK**. It goes beyond just creating twins — it's a full autonomous operations layer. The agent has **40+ tools** spanning six domains: twin management, real-time telemetry, predictive alerting, production planning with simulation, KPI dashboards, and supply chain visibility with edge computing.
>
> The architecture is a React frontend with a split-panel layout — chat on the left, live graph and contextual dashboards on the right. An Express API backend uses the Copilot SDK for AI reasoning and tool execution."

### Why the Copilot SDK — Not Foundry, Not Raw OpenAI (1:40 – 2:00)

> "You might ask — *why the Copilot SDK specifically?* There are three reasons:
>
> **First, developer velocity.** The Copilot SDK gives us tool-calling agents with one `npm install` and a JSON Schema per tool. No Azure AI Foundry project to provision, no AI Search index to configure, no agent service deployment to manage. We went from zero to 40+ tools in days, not weeks.
>
> **Second, streaming-first architecture.** The SDK gives us token-level SSE streaming out of the box. When the agent reasons through 5 tool calls to build a twin graph, the user sees every token and tool execution live — not a loading spinner followed by a wall of text. That real-time feedback is critical for trust in an autonomous manufacturing system.
>
> **Third, GitHub-native integration.** Because the SDK lives in the GitHub ecosystem, we get natural interop with GitHub Actions, repos, and the PR workflow. That let us build something nobody else has: **a full SDLC for Digital Twins** — commit models, open PRs, validate in CI, promote to production. You can't do that as cleanly with Foundry Agent Service because it's not designed for GitHub-native workflows.
>
> The Copilot SDK is the right tool when you need a *lightweight, streaming, tool-calling agent* that ships fast and integrates with the developer workflow. Foundry is great when you need managed RAG over enterprise documents. Different tools, different jobs."

---

## PART 2 — Digital Twin Creation (2:00 – 4:30)

### Setup Narration (2:00 – 2:15)

> "Let's start by building the factory. A manufacturing engineer opens the tool and either explores existing twins or builds from scratch."

### Live Demo Steps

**Step 1 — Deploy a factory template (2:15 – 3:00)**

Click **"Build From Scratch"** on the landing page, then click the **"Deploy template"** quick action chip.

> "I'll deploy the bottling-line template. The agent uploads DTDL models for ProductionLine, Station, Conveyor, and sensors, then creates every twin and wires the relationships. Watch the graph build itself in real time."

**Step 2 — Describe additional equipment (3:00 – 3:40)**

Type: `I have a production line with 3 CNC machines. Each machine has a spindle temperature sensor and a vibration sensor. The whole line also has one energy meter.`

> "Now I extend the factory. I describe new equipment in plain English. The agent creates the twins, selects DTDL models, and wires the relationships — **10 twins and 10 relationships** from a single sentence."

**Step 3 — Add conveyors and iterate (3:40 – 4:10)**

Type: `Add a conveyor between machine 1 and machine 2, and another between machine 2 and machine 3`

> "I iterate conversationally. The agent adds Conveyor twins between stations. **The twin graph evolves through conversation**, not through code."

**Step 4 — Verify the graph (4:10 – 4:30)**

Click **"Show graph"** quick action chip.

> "One click refreshes the full graph. You can see every station, sensor, and conveyor — color-coded by model type."

---

## PART 3 — Real-Time Telemetry & Monitoring (4:30 – 6:30)

### Setup Narration (4:30 – 4:40)

> "Now let's bring the factory to life. We need real-time sensor data flowing through these twins."

### Live Demo Steps

**Step 1 — Start telemetry simulation (4:40 – 5:10)**

Click the **"⚡ Start telemetry"** quick action chip.

> "I ask the agent to start telemetry simulation. It activates a simulator that generates realistic temperature, vibration, pressure, and energy readings for every equipment twin. Under the hood, this uses the telemetry SSE endpoint to push data in real time."

**Step 2 — Open the Monitor panel (5:10 – 5:40)**

Click the **"⚡ Monitor"** button in the header.

> "I open the Monitor panel. The **Live Telemetry** section shows real-time sparklines for every sensor — temperature, vibration, energy consumption. Each reading updates via Server-Sent Events, no polling. The **Alert Panel** above it shows the current health status of all twins."

**Step 3 — Set up alert rules (5:40 – 6:10)**

Click the **"🚨 Setup alerts"** quick action chip.

> "Now I ask the agent to set up default manufacturing alert rules. It creates threshold-based rules — temperature > 80°C triggers a warning, > 95°C triggers critical. Same for vibration. These rules evaluate against the live telemetry stream."

**Step 4 — Observe alerts firing (6:10 – 6:30)**

Watch the Alert Panel for alerts to appear.

> "Since our simulator occasionally generates values near the thresholds, you'll see alerts firing in real time. The graph overlay also updates — twin nodes turn orange for warnings and red for critical alerts. The operations team gets instant visibility without leaving this single screen."

---

## PART 4 — Production Planning & Simulation (6:30 – 9:00)

### Setup Narration (6:30 – 6:40)

> "With the factory monitored, let's move to autonomous production planning. Click the Planning button in the header."

### Live Demo Steps

**Step 1 — Open the Planning panel (6:40 – 6:50)**

Click the **"📋 Planning"** button in the header.

> "The Planning Dashboard shows production orders, schedules, bottleneck analysis, and simulation results — all in one panel."

**Step 2 — Create production orders (6:50 – 7:30)**

Type: `Create 3 production orders: 500 units of Widget-A due March 15 high priority, 200 units of Widget-B due March 20 medium priority, and 1000 units of Widget-C due March 10 critical priority`

> "I describe the production workload in natural language. The agent calls the create_production_order tool three times, setting quantities, priorities, due dates, and required station types automatically."

**Step 3 — Generate optimized schedule (7:30 – 8:00)**

Click the **"📅 Schedule"** quick action chip.

> "Now I ask for an optimized schedule. The agent runs constraint-based scheduling — considering station availability, order priority, due dates, and estimated cycle times. The Planning Dashboard updates to show the schedule timeline. Notice Widget-C got scheduled first because it's critical priority with the earliest due date."

**Step 4 — Identify bottlenecks (8:00 – 8:20)**

Click the **"🔄 Bottlenecks"** quick action chip.

> "The agent analyzes utilization per station and flags bottlenecks. It tells me which stations are overloaded and gives actionable recommendations — like adding a second Assembly station or extending the shift."

**Step 5 — Run a what-if simulation (8:20 – 9:00)**

Click the **"🔮 Simulate"** quick action chip, or type:
`Run a what-if simulation — what happens if we add a second Assembly station and increase conveyor speed by 20%?`

> "This is the power of the simulation engine. The agent creates a scenario, runs it against the current baseline, and returns projected impact: throughput change, cycle time reduction, energy cost delta. In this case, adding that station gives us a **15% throughput boost** at only 8% more energy cost. The factory planner can make data-driven capacity decisions without a spreadsheet."

---

## PART 5 — KPI Dashboards & Supply Chain (9:00 – 12:00)

### KPI Dashboards (9:00 – 10:30)

**Step 1 — Open KPI panel (9:00 – 9:10)**

Click the **"📈 KPIs"** button in the header.

> "The KPI Dashboard supports three personas — Engineer, Manager, and IT/OT. Each sees the metrics that matter to them."

**Step 2 — Get OEE report (9:10 – 9:40)**

Click the **"📈 OEE Report"** quick action chip.

> "I ask for OEE — Overall Equipment Effectiveness. The agent calculates Availability × Performance × Quality and returns a detailed breakdown. World-class OEE is 85%. The dashboard shows our OEE gauge, plus individual component scores. The engineer sees this and knows exactly where to focus."

**Step 3 — Compare shifts (9:40 – 10:00)**

Type: `Compare Day Shift vs Night Shift performance`

> "The agent compares throughput, OEE, energy cost per unit, and alert counts across shifts. It identifies the winning shift and explains why. The KPI Dashboard updates to show a side-by-side comparison."

**Step 4 — Executive summary (10:00 – 10:30)**

Type: `Give me a manager-level executive summary of plant performance`

> "For the Manager persona, the agent generates a comprehensive summary: OEE, throughput, active alerts, order completion rate, top bottleneck, and AI-generated recommendations. One prompt replaces a 30-minute daily standup report."

### Supply Chain & Inventory (10:30 – 12:00)

**Step 5 — Open Supply Chain panel (10:30 – 10:40)**

Click the **"🔗 Supply"** button in the header.

> "The Supply Chain View has three tabs: Inventory, Suppliers, and Shipments. Plus an overall health indicator at the top."

**Step 6 — Check inventory (10:40 – 11:10)**

Click the **"📦 Inventory"** quick action chip.

> "The agent checks all material inventory levels: stock quantities, days remaining until stockout, reorder status. Materials below the reorder point are flagged in red. I can see that polymer resin is at 3 days remaining — critical."

**Step 7 — Trigger replenishment (11:10 – 11:30)**

Type: `Trigger replenishment for any materials that are below their reorder point`

> "The agent runs an auto-replenishment check across all inventory. It automatically selects the best supplier based on reliability and lead time, creates replenishment orders, and tracks the new shipments. The Supply Chain View updates with the new orders."

**Step 8 — Supply chain health (11:30 – 11:50)**

Type: `Give me an overall supply chain health assessment`

> "The agent returns a health dashboard: critical inventory count, delayed shipments, at-risk suppliers, days until stockout, and AI recommendations. The overall status updates from 'warning' to 'healthy' after the replenishment orders."

**Step 9 — Edge deployment (11:50 – 12:00)**

Type: `What edge modules are available and deploy the OPCPublisher to edge-factory-01`

> "The agent lists available IoT Edge modules — OPC UA publisher, stream analytics, computer vision for quality inspection, anomaly detection — and generates a deployment manifest for the target device. This is how we extend the platform to the edge."

---

## PART 6 — SDLC: The Missing Layer & Wrap-Up (12:00 – 15:00)

### The Gap in the Ecosystem (12:00 – 12:15)

> "Here's something that surprised us during research: **Microsoft Learn recommends treating DTDL models like source code** — version them, review them, validate them. But there's no prescriptive end-to-end SDLC workflow anywhere in the documentation. No guidance on PR review for model changes, no CI validation pipeline for DTDL schemas, no environment promotion strategy from dev to staging to production.
>
> That's a real gap. In lights-out manufacturing, you can't just yolo a model change to production at 2 AM when nobody's watching the factory floor. You need the same rigor you'd apply to application code. So we built that missing layer."

### SDLC Flow (12:15 – 13:30)

> "The same chat agent that built the factory now handles the full software delivery lifecycle — and this is where the **Copilot SDK's GitHub-native design** really shines."

**Step 1 — Commit changes (12:15 – 12:35)**

Click the **"📝 Commit change"** quick action chip.

> "The agent commits all DTDL models and twin definitions to a new Git branch. It suggests a branch name based on what changed."

**Step 2 — Open a pull request (12:35 – 12:55)**

Click the **"🔀 Open PR"** quick action chip.

> "It opens a PR with a summary of all twin and model changes. The SDLC Status panel in the chat area updates with the PR link."

**Step 3 — Check CI (12:55 – 13:10)**

Click the **"✅ Check CI"** quick action chip.

> "The agent checks GitHub Actions pipeline status. It reports whether DTDL validation and twin schema tests passed."

**Step 4 — Release (13:10 – 13:30)**

Click the **"🚀 Release"** quick action chip.

> "It creates a release tag and drafts release notes from recent changes. This triggers the production deployment pipeline. One conversational surface, full lifecycle control.
>
> Let me be clear about why this matters: **no other digital twin tool does this today.** You either do it manually in the Azure portal, or you build custom scripting glue. We built an AI agent that handles the entire lifecycle — from 'describe my factory' to 'deploy to production' — in a single conversation. The SDLC piece is what makes this production-ready, not just a prototype."

### Architecture Wrap-Up & Competitive Edge (13:30 – 15:00)

> "Let me highlight what makes this work and why we believe it stands out.
>
> **Tech stack:**
> - **GitHub Copilot SDK** — creates AI sessions with tool definitions. No prompt routing or function-calling logic. The SDK handles all the reasoning.
> - **40+ agent tools** across six domains:
>   - **Twin management** — create, update, delete, query twins and relationships
>   - **Real-time telemetry** — IoT simulation with SSE streaming
>   - **Predictive alerting** — threshold-based rules evaluated against live data
>   - **Production planning** — order management, constraint scheduling, bottleneck analysis, what-if simulation
>   - **KPI dashboards** — OEE, throughput, shift comparison, executive summaries
>   - **Supply chain** — inventory tracking, auto-replenishment, supplier management, shipment tracking, edge deployment
>   - **SDLC** — Git commits, PRs, CI checks, releases
> - **React + React Flow** — split-panel UI with live graph, sparkline telemetry, contextual dashboards
> - **Azure Digital Twins** — production backend for the twin graph
>
> **Why the Copilot SDK was the right choice:**
> We evaluated three paths — raw OpenAI APIs, Azure AI Foundry Agent Service, and the Copilot SDK. Raw OpenAI means writing your own tool dispatch loop, retry logic, and streaming plumbing. Foundry Agent Service is powerful for RAG-heavy enterprise scenarios, but it requires provisioning an AI project, configuring vector stores, and deploying agent infrastructure — that's overhead we didn't need. The Copilot SDK gave us *tool-calling, streaming, and session management in a single package* with zero infrastructure beyond our Express server. We defined tools as JSON Schema, the SDK routes to them automatically, and we got token-level SSE streaming for free.
>
> **The three things no one else has:**
> 1. **Digital Twin SDLC** — commit DTDL models, PR review, CI validation, environment promotion. Microsoft Learn says to do this but provides no implementation. We built it.
> 2. **Lights-out manufacturing from chat** — not just twin creation, but full autonomous operations: monitoring, alerting, scheduling, KPIs, supply chain — all through one agent.
> 3. **Tool composability** — we started with 13 twin tools, then added telemetry, alerting, planning, KPIs, supply chain, and SDLC as additional tool arrays. The SDK orchestrates 40+ tools without any routing logic from us.
>
> The key insight: **the Copilot SDK turns any API into a conversational agent**. We started with Azure Digital Twins CRUD, then kept layering domains. The SDK scaled effortlessly.
>
> This is what **lights-out manufacturing** looks like: an AI agent that can build the factory, monitor it, plan production, track KPIs, manage supply chain, and deploy changes — all from a single chat interface.
>
> Thank you."

---

## Quick Reference — All Demo Commands

| Section | What to Type/Click |
|---|---|
| **Twin Creation** | |
| Deploy template | Click **"Deploy template"** chip → select bottling-line |
| Describe factory | `I have a production line with 3 CNC machines. Each machine has a spindle temperature sensor and a vibration sensor. The whole line also has one energy meter.` |
| Add conveyors | `Add a conveyor between machine 1 and machine 2, and another between machine 2 and machine 3` |
| Review graph | Click **"Show graph"** chip |
| **Telemetry & Alerts** | |
| Start telemetry | Click **"⚡ Start telemetry"** chip |
| Open Monitor | Click **"⚡ Monitor"** header button |
| Setup alerts | Click **"🚨 Setup alerts"** chip |
| Check health | Click **"🩺 Health check"** chip |
| **Production Planning** | |
| Open Planning | Click **"📋 Planning"** header button |
| Create orders | `Create 3 production orders: 500 units of Widget-A due March 15 high priority, 200 units of Widget-B due March 20 medium priority, and 1000 units of Widget-C due March 10 critical priority` |
| Optimize schedule | Click **"📅 Schedule"** chip |
| Find bottlenecks | Click **"🔄 Bottlenecks"** chip |
| Run simulation | Click **"🔮 Simulate"** chip or type: `Run a what-if simulation — what happens if we add a second Assembly station and increase conveyor speed by 20%?` |
| **KPI Dashboards** | |
| Open KPIs | Click **"📈 KPIs"** header button |
| OEE report | Click **"📈 OEE Report"** chip |
| Compare shifts | `Compare Day Shift vs Night Shift performance` |
| Executive summary | `Give me a manager-level executive summary of plant performance` |
| **Supply Chain** | |
| Open Supply Chain | Click **"🔗 Supply"** header button |
| Check inventory | Click **"📦 Inventory"** chip |
| Auto-replenish | `Trigger replenishment for any materials that are below their reorder point` |
| Supply health | `Give me an overall supply chain health assessment` |
| Edge deployment | `What edge modules are available and deploy the OPCPublisher to edge-factory-01` |
| **SDLC** | |
| Commit | Click **"📝 Commit change"** chip |
| Open PR | Click **"🔀 Open PR"** chip |
| Check CI | Click **"✅ Check CI"** chip |
| Release | Click **"🚀 Release"** chip |

---

## Panel Navigation Reference

| Header Button | What It Shows |
|---|---|
| **⚡ Monitor** | Alert Panel (active alerts, twin health) + Live Telemetry (sparklines, sensor readings) |
| **📋 Planning** | Production orders, schedule timeline, bottleneck analysis, simulation results |
| **📈 KPIs** | OEE gauge, throughput report, shift comparison, manager summary (3 persona views) |
| **🔗 Supply** | Inventory levels, supplier list, shipment tracking, supply chain health indicator |
| **📦 Assets** | DTDL model library browser |

---

## Pre-Demo Checklist

- [ ] `ADT_INSTANCE_URL` set to `https://krystaldigitwins.api.wcus.digitaltwins.azure.net`
- [ ] `GITHUB_TOKEN` set via `gh auth token`
- [ ] `GITHUB_REPO_OWNER` and `GITHUB_REPO_NAME` configured for SDLC tools
- [ ] `az login` completed (for DefaultAzureCredential)
- [ ] API server running (`pnpm run dev` in `src/api/`)
- [ ] Web server running (`pnpm run dev` in `src/web/`)
- [ ] Browser open to `http://localhost:5173`
- [ ] **Twin prep:** optionally deploy building-tutorial template ahead of time, or start fresh
- [ ] Browser zoom set to ~110% for readability
- [ ] Dark mode enabled (looks better on projectors with dark backgrounds)
- [ ] GitHub Actions secrets configured: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`
- [ ] GitHub Actions vars configured: `ADT_DEV_INSTANCE_URL`, `ADT_PROD_INSTANCE_URL`
- [ ] Workflows present in repo: `validate-pr.yml`, `deploy-dev.yml`, `deploy-prod.yml`
- [ ] Verify all header panel buttons work: ⚡ Monitor, 📋 Planning, 📈 KPIs, 🔗 Supply

---

## Troubleshooting Tips

| Issue | Fix |
|---|---|
| Telemetry not appearing in Monitor panel | Make sure you clicked "Start telemetry" chip first — the simulator must be running |
| No alerts firing | Check that alert rules exist (click "Setup alerts") and telemetry is active |
| Planning Dashboard empty | Create production orders first, then generate a schedule |
| KPI panel shows zeros | KPI data is computed from simulated baseline data — it works immediately |
| Supply Chain health shows "healthy" | Expected — replenishment orders restore stock. Check before replenishing to see warnings |
| Edge modules empty | Edge device registry is seeded with demo devices on server start |
| SDLC tools failing | Ensure `GITHUB_TOKEN`, `GITHUB_REPO_OWNER`, and `GITHUB_REPO_NAME` are set |

---

## Anticipated Judge Questions & Winning Answers

Prepare for these. Confident, concise answers here will set you apart.

### "Why did you choose the Copilot SDK instead of Azure AI Foundry Agent Service?"

> "Great question. We evaluated both. Foundry Agent Service is designed for **RAG-heavy enterprise scenarios** — you set up an AI project, configure vector stores, deploy agent infrastructure. That's powerful when you need document grounding over thousands of PDFs.
>
> But our use case is **tool-calling, not retrieval.** We have 40+ tools that call Azure Digital Twins, generate schedules, evaluate KPIs, manage supply chain. The Copilot SDK gave us tool dispatch, session management, and token-level SSE streaming with a single `npm install` and JSON Schema definitions. Zero infrastructure beyond our Express server.
>
> Foundry would have added 3-4 Azure resources we didn't need and slowed us down. The Copilot SDK let us go from zero to 40+ tools in days. Right tool for the job."

### "Couldn't you do this with raw OpenAI function calling?"

> "Technically yes, but you'd be rebuilding what the SDK gives you for free:
> - **Tool dispatch loop** — the SDK automatically routes to the right tool, handles retries, and manages the multi-turn conversation state.
> - **SSE streaming** — token-level streaming is built in. With raw OpenAI, you'd write your own streaming plumbing.
> - **Session management** — the SDK handles conversation context, tool results, and multi-step reasoning chains.
>
> We wanted to spend our time building manufacturing domain tools, not AI infrastructure plumbing. The SDK let us do that."

### "What makes this different from just a chatbot wrapper around Azure Digital Twins?"

> "Three things that go well beyond a chatbot:
>
> 1. **Full autonomous operations.** This isn't just CRUD. The agent monitors live telemetry, fires predictive alerts, schedules production, runs what-if simulations, tracks KPIs, manages supply chain, and deploys to IoT Edge. That's a lights-out manufacturing platform, not a chatbot.
>
> 2. **Digital Twin SDLC.** Microsoft's own documentation says to treat DTDL models like source code, but provides no implementation for the development lifecycle. We built the missing layer — PR review, CI validation, environment promotion — entirely through the agent.
>
> 3. **Multi-persona dashboards.** Engineers, plant managers, and IT/OT admins each get their own view. The KPI dashboard adapts to the persona. The supply chain view shows inventory, suppliers, and shipments. These aren't chat responses — they're live dashboards that update in real time."

### "How does the SDLC for Digital Twins work? Why is that important?"

> "Today, if you change a DTDL model in production, there's no safety net. No PR review, no automated validation, no rollback. Microsoft Learn explicitly recommends version control for DTDL models but stops short of providing a workflow.
>
> We built that complete workflow: the agent commits DTDL models and twin definitions to a Git branch, opens a PR with a clear summary of changes, monitors GitHub Actions CI for schema validation, and creates release tags that trigger production deployment. The SDLC Status panel in the UI shows branch, PR, pipeline status, and release in real time.
>
> In lights-out manufacturing — where the factory runs autonomously — you *cannot* afford to push a bad model change at 2 AM. This SDLC layer is what makes the platform production-ready."

### "Is this connected to real Azure Digital Twins or is it mocked?"

> "The twin management tools — create, update, delete, query, relationships — all hit a **real Azure Digital Twins instance** via the `@azure/digital-twins-core` SDK with `DefaultAzureCredential`. Everything you see in the graph viewer is live data from Azure.
>
> The telemetry, planning, KPI, and supply chain features use in-memory simulation services. In production, you'd swap the telemetry simulator for IoT Hub ingestion, and the planning service for a connection to your MES. The architecture is designed for that — each tool calls a service layer that can be backed by any data source."

### "How many tools does the agent have? Doesn't it get confused?"

> "40+ tools across seven domains. The Copilot SDK handles tool selection automatically through the model's function-calling capability. We don't write any routing logic. The system prompt describes each domain and when to use its tools, and the model's reasoning takes care of the rest.
>
> In practice, a single user prompt like 'run a simulation' triggers 2-3 tools in sequence — create scenario, run simulation, return results. The SDK handles the multi-step chain. We've tested prompts that chain up to 8 tools and it works reliably."

### "What would you do next if you had more time?"

> "Three things:
> 1. **Real IoT Hub integration** — replace the telemetry simulator with actual device-to-cloud messages from IoT Hub. The SSE streaming architecture is already built for it.
> 2. **Azure Machine Learning for predictive maintenance** — train anomaly detection models on the telemetry history and integrate predictions into the alert system.
> 3. **Multi-factory federation** — extend the twin graph to model multiple factories with a global supply chain view. The tool architecture scales — just add tools for cross-factory queries."

### "Why Digital Twins? How is this relevant to the competition?"

> "The competition is about showing what the Copilot SDK can do. We chose Digital Twins because it's a **complex, multi-API, multi-persona domain** that really stress-tests the SDK's tool orchestration. It's not a simple CRUD app — the agent has to reason about graph relationships, model schemas, real-time data streams, scheduling constraints, and deployment pipelines.
>
> If the SDK can handle 40+ tools across seven domains for autonomous manufacturing, it can handle anything. That's the point we're making."
