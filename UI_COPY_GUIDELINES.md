# UI Copy & Language Architecture Guidelines

> **CRITICAL ARCHITECTURE RULE: STRICT ENGLISH-ONLY UI & MICROCOPY**
> **DO NOT INTRODUCE BENGALI OR VERBOSE TEXT TO ANY FRONTEND OR BACKEND CODE.**

## Policy Overview
1. **Language Standard**:
   - The entire PayVerify BD platform interface (merchant dashboard, buyer checkout, public payment links, invoices, documentation, modal dialogues, alerts, toasts, and API responses) **MUST REMAIN 100% IN PROFESSIONAL ENGLISH**.
   - Under no circumstances should any developer, automated agent, or contributor add Bengali characters or Bengali translations to user-facing files.

2. **Concise Microcopy**:
   - High information density with minimal words (Stripe-like fintech standards).
   - Use punchy, high-impact English words instead of verbose descriptive paragraphs.
   - Avoid filler text, redundant explanations, or bloated help blocks.

3. **Currency Formatting**:
   - The currency symbol `৳` (or `BDT`) is preserved for monetary figures (e.g., `৳5,000.00`).
   - All accompanying labels ("Amount", "Today's Volume", "Payable Amount") remain strictly English.

4. **Codebase Developer Markers**:
   - All components and routes contain the top-level enforcement banner:
     ```typescript
     // NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.
     ```
