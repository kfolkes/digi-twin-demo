# Pitch Slides — Digital Twin Builder

Copy each slide into your PowerPoint. Suggested layout notes in [brackets].

---

## SLIDE 1 — The Problem & Our Solution

**Title:** Digital Twin Builder — Lights-Out Manufacturing with the GitHub Copilot SDK

[Left column]

### The Gap

- Building & operating a smart factory requires **4 separate skillsets**: domain expertise, DTDL modeling, Azure SDK proficiency, and operational awareness
- Microsoft Learn recommends treating DTDL models like source code — but provides **zero SDLC implementation**: no PR review, no CI validation, no environment promotion
- No existing tool lets a factory engineer **build, monitor, plan, and deploy** digital twins from a single interface

[Right column]

### Our Solution

- **40+ Copilot SDK agent tools** across 7 domains — all driven by natural language
- **One chat interface** replaces the Azure portal, custom scripts, and spreadsheets

| Domain | What the Agent Does |
|---|---|
| Twin Management | Create, update, delete, query twins & relationships from plain English |
| Real-Time Telemetry | Live SSE-streamed sensor data with sparkline dashboards |
| Predictive Alerting | Threshold rules evaluated against live telemetry, auto-firing alerts |
| Production Planning | Order management, constraint scheduling, what-if simulation |
| KPI Dashboards | OEE, throughput, shift comparison, executive summaries (3 personas) |
| Supply Chain | Inventory tracking, auto-replenishment, supplier management, edge deployment |
| SDLC | Git commits, PR review, CI validation, release tags — the missing layer |

---

## SLIDE 2 — Why the Copilot SDK & Competitive Edge

**Title:** Why the Copilot SDK — Architecture & Differentiators

[Top section — Architecture diagram description]

```
React + React Flow UI  ←→  Express API + Copilot SDK  ←→  Azure Digital Twins
   Chat | Graph | Dashboards     40+ Tools | SSE Streaming      Live Twin Graph
```

[Left column]

### Why Copilot SDK over Foundry / Raw OpenAI

| | Copilot SDK | Foundry Agent Service | Raw OpenAI |
|---|---|---|---|
| Setup | `npm install` + JSON Schema | AI Project + AI Search + Agent deploy | Manual function-call loop |
| Streaming | Token-level SSE built-in | Polling-based | Build your own |
| Tool dispatch | Automatic routing & retries | Automatic | Build your own |
| GitHub integration | Native (same ecosystem) | Requires custom bridging | N/A |
| Infrastructure | Zero beyond Express server | 3-4 Azure resources | Your own stack |

**Bottom line:** Copilot SDK = lightweight, streaming, tool-calling agent that ships fast. Foundry = managed RAG over enterprise docs. Different tools, different jobs. Ours needed tools, not retrieval.

[Right column]

### Three Things No One Else Has

**1. Digital Twin SDLC**
Commit DTDL → PR review → CI validation → production release.
Microsoft says to do this. Nobody built it. We did.

**2. Lights-Out Manufacturing from Chat**
Not just CRUD — full autonomous ops: monitor, alert, schedule, simulate, track KPIs, manage supply chain, deploy to edge. One agent, one conversation.

**3. 40+ Tool Composability**
Started with 13 twin tools. Added telemetry, alerting, planning, KPIs, supply chain, SDLC as tool arrays. The SDK orchestrates everything — zero routing logic from us.

[Footer]

**Tech:** Node 24 · TypeScript · React 19 · React Flow · Vite 7 · GitHub Copilot SDK · Azure Digital Twins · SSE Streaming
