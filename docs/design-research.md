# Design Research & Inspiration Notes

**Product:** Memory Reliability Layer for Business AI Agents  
**Stage:** Stage 1 — Frontend & Product Experience  
**Date:** October 2026  

---

## 1. Research Overview

The Memory Reliability Layer is a high-assurance developer console and reliability interface for business AI agents. Rather than adopting conversational chatbot tropes or flashy consumer "AI gradients", the interface draws heavily from proven infrastructure, observability, and data-lineage tools.

---

## 2. References & Analysis

### Reference 1: Linear
- **Link:** [linear.app](https://linear.app)
- **Category:** Modern developer workflow & issue tracking
- **What was useful:**
  - Ultra-crisp typography hierarchy using Inter and monospace identifiers.
  - Keyboard-first feel and density: compact table rows with contextual badges.
  - Subtle status indicators: tiny colored dots alongside muted status pills instead of giant warning blocks.
  - Restrained dark/light charcoal navigation with neutral content area.
- **What was deliberately not copied:**
  - Issue-specific primitives (cycles, backlog, project milestones).
  - Heavy modal keyboard-intercept overlays that hide context.
- **Our resulting design decision:**
  - Deep charcoal (`#16191d` / `#212529`) persistent sidebar with crisp high-contrast nav items and live counters.
  - 8px grid system with compact table spacing and clean border delineation (`#e9ecef` / `#dee2e6`).

---

### Reference 2: Datadog & Sentry
- **Link:** [datadoghq.com](https://datadoghq.com) / [sentry.io](https://sentry.io)
- **Category:** Observability, Incident Management & Event Triage
- **What was useful:**
  - "Needs Attention" incident triage table layout with explicit distinction between supported states and unconfirmed conflicts.
  - Evidence & breadcrumb visualization: showing timestamps, exact source references (`email-demo-001`, `invoice-demo-001`), and event chains.
  - Clear amber warning states for conflicts vs green for explicitly resolved vs blue for supported.
- **What was deliberately not copied:**
  - Overly cluttered multi-chart grid with dozens of time-series graphs that do not apply to categorical fact lineage.
  - Complex query DSL syntax bars that distract from natural business fact lookup.
- **Our resulting design decision:**
  - Dedicated "Needs Attention" conflict cards with side-by-side assertion comparisons.
  - Structured Query Panel: explicitly returns "Conflict detected — No single current value can be confirmed" rather than picking a winner arbitrarily.

---

### Reference 3: GitHub Source History & Git Blame
- **Link:** [github.com](https://github.com)
- **Category:** Source control, commit history, and immutable lineage
- **What was useful:**
  - Chronological immutable history timeline (`created` -> `assertion_added` -> `conflict_detected` -> `resolved`).
  - Clear preservation of superseded or unselected assertions even after resolution (never erasing original evidence).
  - Commit-style metadata badges: Monospace IDs (`fact-001`, `assert-001a`), author/user signatures (`Priya Sharma`), ISO timestamps.
- **What was deliberately not copied:**
  - Code diff viewer syntax highlighting (not needed for tabular/key-value facts).
- **Our resulting design decision:**
  - History timeline component showing every event with timestamp, description, and link to associated assertion.
  - Fact assertions maintain immutable identity: resolving a fact picks a selected assertion and marks a reason, but leaves the alternative assertion in place for full auditability.

---

### Reference 4: Stripe Dashboard
- **Link:** [stripe.com](https://stripe.com)
- **Category:** SaaS Operations & Financial Data Lineage
- **What was useful:**
  - Detail drawer / slide-over pattern for drill-down without losing table context.
  - Metadata definition lists (Entity, Attribute, Status, Last Updated, Authority).
  - Clean responsive breakpoint behavior: converting wide tables into stacked card lists on mobile screens (<768px).
- **What was deliberately not copied:**
  - Financial charts, churn metrics, and revenue widgets that are irrelevant to business memory.
- **Our resulting design decision:**
  - Both dedicated route (`/facts/:id`) and quick review drawer/modal capability.
  - Responsive layout: fluid data table for desktop/tablet; stacked responsive cards with clear touch targets on mobile (320px–390px).

---

## 3. License & Attribution Notes
All design patterns utilized are standard developer UI conventions implemented using open-source utility classes (Tailwind CSS) and icons from Lucide (`lucide-react`, ISC license). No proprietary assets, trademarks, or copyrighted artwork are included.

