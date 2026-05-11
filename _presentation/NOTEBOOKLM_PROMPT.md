# NotebookLM Prompt — AI Orchestra Presentation

> **How to use:** Upload `AI_ORCHESTRA_OVERVIEW.md` as a source in NotebookLM, then paste the prompt below into the chat. NotebookLM will generate a visual presentation (Studio → Presentation) based on your source.

---

## Upload instructions

1. Go to [notebooklm.google.com](https://notebooklm.google.com)
2. Create a new notebook.
3. Add source → "Upload file" → select `AI_ORCHESTRA_OVERVIEW.md`.
4. Wait for the source to be indexed.
5. Click "Studio" in the top-right → "Presentation".
6. Paste the prompt below into the instructions field.
7. Click "Generate".

---

## Prompt

```
You are creating a technical presentation called "AI Orchestra — From Zero to Self-Improving Agentic Infrastructure in One Session" for an audience of senior software engineers and AI engineers who are already familiar with IDE agents (Cursor, Claude Code, Copilot) and agentic development patterns. The audience is technical, curious, and appropriately sceptical. The tone should be direct, confident, and grounded — no marketing fluff.

Use the uploaded source document as the single source of truth. Do not invent facts or add content not present in the source.

Structure the presentation as exactly 12 slides:

Slide 1 — Title slide
Title: "AI Orchestra"
Subtitle: "Universal Agentic Infrastructure for Any Project, Any IDE"
Include a one-line hook from section 1.1 of the source.

Slide 2 — The Problem
Draw from section 1 (The Problem This Solves).
Use two columns: "Without orchestration" on the left vs "With orchestration" on the right.
Keep bullets short — max 8 words each. 5–6 bullets per column.

Slide 3 — What It Is (Concept)
Draw from section 2.
Use the three-layer model (2.2) as the visual anchor: three stacked horizontal bands labelled Core spec, Per-project install, IDE runtime.
Add the key insight from 2.4 as a pull-quote at the bottom.

Slide 4 — How It Works (5-step flow)
Draw from section 3.3.
Use a numbered left-to-right flow diagram. Each step: short label + 1 sentence description.
Mark steps 1–4 as READ-ONLY in a subtle badge. Mark step 5 as WRITE (requires consent).

Slide 5 — What Gets Installed (Core)
Draw from section 4.1.
Use a simple 2-column table: Component | Purpose.
Headline: "Every install, regardless of scope."

Slide 6 — Roles and Skills
Draw from sections 4.2 and 4.3.
Left half: 10 roles as a compact list with their auto-install trigger in parentheses.
Right half: skill categories as a grouped list with 2–3 example skills each.
Headline: "The installed agent knows the project's roles and can invoke 30+ skills by trigger phrase."

Slide 7 — Stack-Specific Packs
Draw from section 4.4.
Use one row per stack. For each: stack name + 3–4 key pattern areas.
Headline: "Detected automatically. Layered on top of the universal foundation."

Slide 8 — IDE Adapter Support
Draw from section 5.
Use a 4-row table: IDE | Support level | Key mechanism.
Add a note: "Same ai-orchestra/ folder serves all four IDEs. No fork required."

Slide 9 — The Self-Improving Loop
Draw from section 6.
Use a circular flow diagram with 4 nodes: Session → Stop-hook fires → AI_LEARNINGS.md updated → Next session starts with more context → (back to Session).
Include the pull-quote from the end of section 6 about institutional memory.

Slide 10 — Safety Guarantees
Draw from section 7.
Use a checklist format with a clear ✓ or shield icon for each guarantee.
Include all 5 guarantees from the source. Keep each to one line.

Slide 11 — Before / After
Draw from section 8.
Use two clearly separated columns side by side.
Left: "Without AI Orchestra" (5 bullets, each starting with a ✗).
Right: "With AI Orchestra" (5 bullets, each starting with a ✓).
Make the contrast stark and concrete.

Slide 12 — How to Get It + Q&A primer
Draw from sections 10 and 11.
Left panel: the two install commands in a code block. Below: key facts (version, zero cost, zero account, MIT, no dependencies).
Right panel: pick the 3 most likely audience questions from section 11 and give a one-sentence answer for each.
Headline: "One command. One session. Permanent infrastructure."

Formatting requirements:
- Use a dark background theme (dark navy or charcoal) with high-contrast text.
- Code blocks should use a monospace font with a slightly lighter background panel.
- Pull-quotes should be larger font, lighter color, italic.
- Avoid clipart or decorative icons unless they serve the content (shield for safety, circular arrow for the loop, flow arrows for the 5-step diagram).
- Speaker notes: add 2–3 sentences of speaker notes under each slide with the key point to emphasise verbally and any anticipated question to address.
```

---

## Tips for a better result

- If the generated presentation is too brief on a slide, click the slide and use "Regenerate" with the instruction: "Expand this slide. Include more detail from the source on [topic]."
- If a slide is too long, use: "Condense this slide to 5 bullets max. Keep only the most important points."
- For the flow diagram on Slide 4 and the circular diagram on Slide 9, if NotebookLM doesn't generate a visual, add the instruction: "Describe this as a step-by-step numbered list instead of a diagram."
- To add your own branding (logo, company name), edit the title slide after generation.
- Export as PDF or Google Slides for sharing.

---

## Alternative: Audio Overview prompt (for a podcast-style briefing before the presentation)

If you want to generate a short audio overview first (to understand the material or share with colleagues who prefer listening), click "Audio Overview" in Studio and use this prompt:

```
Generate a 6-minute conversational briefing on AI Orchestra for two senior engineers — one sceptical about adding more tooling, one excited about agentic development. The sceptical one should ask the hard questions (maintenance burden, safety, IDE lock-in, what happens when it goes wrong). The enthusiastic one should answer from the source. Cover the problem, the concept, how it works, what it installs, the self-improving loop, and the safety guarantees. End with both agreeing on a single most important benefit. Keep the tone sharp and professional — no hype, no jargon beyond what's in the source.
```
