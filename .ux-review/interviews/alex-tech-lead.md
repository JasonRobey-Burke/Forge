# Persona Interview: Alex Rivera (Tech Lead)

## Pre-Use Expectations

- I expect Forge to be a leaner alternative to Jira — no epic/story/sub-task ceremony, just something that maps cleanly to how I already think about features: what are we building, what must it do, and can an AI agent pick it up and run with it?
- I expect the spec to be the primary artifact. Everything else — intentions, expectations, products — should exist to give the spec structure, not to create busywork.
- I expect some kind of template or form that guides me through the required sections without me having to remember what to fill in. If I open a blank page every time, I'll end up with inconsistent specs.
- I expect the Flow Board to look and behave roughly like a Kanban board — columns for each phase, cards I can move, WIP limits visible. I've used Trello and Linear, so I have a mental model ready.
- I expect export to YAML or Markdown to be a single click. My whole workflow depends on piping these specs into an AI agent, so friction here breaks my day.
- I expect the completeness checklist to catch my mistakes before I hand the spec off — things like forgetting to link expectations or leaving the boundary section empty.
- I expect the product → intention → expectation → spec hierarchy to make sense once I see it, even if it's unfamiliar terminology. I'll tolerate a learning curve of about one session.

## Key Concerns

- **AI-readiness of exports:** My core use case is exporting a spec and feeding it to an AI coding agent. If the exported YAML or Markdown loses structure — misses sections, flattens the hierarchy, or omits edge cases — the whole investment is wasted. I need to be able to trust that what the AI sees is exactly what I wrote.
- **Speed of spec authoring:** I have 15 to 30 minutes per spec. If the form is slow to navigate, requires too many page loads, or forces me to set up the full hierarchy before I can create a single spec, I'll abandon it and go back to writing markdown files by hand.
- **Board as a control panel, not just a view:** I don't just want to look at the board; I need to act from it. If I can't move a card, see why it's blocked, or jump to the spec detail without losing my place, the board is decorative.
- **Quality gates that actually enforce quality:** I want the Draft-to-Ready gate to be strict. If it lets under-specified specs through, my team will start gaming the checklist and the tool loses its value. But I also need an override path for urgent work — with a paper trail.
- **Team visibility without a manager dashboard:** I'm not a PM. I don't need reports. But I do need to see at a glance which specs are blocked, which are in review, and what my team is working on right now. If I have to click into every card to get that context, the board isn't doing its job.
- **Context inheritance from product:** I set up the product's tech stack, patterns, and auth context once. Every spec should inherit that automatically. If I have to re-enter our auth setup on every spec, something is wrong.

## Must-Have Features

- Single-click export to both YAML and Markdown from the spec detail page
- Completeness checklist that runs live as I edit, not just on transition attempt
- Flow Board with visible WIP limits and blocked-state indicators per card
- Ability to link one spec to multiple expectations (my features often satisfy several)
- Override path on the Draft-to-Ready gate with a required reason field
- Context block auto-populated from the parent product when a new spec is created

## Deal-Breakers

- If the YAML export drops any section or produces malformed output, I cannot use this tool. The AI agent will hallucinate missing context and I'm back to fixing broken code.
- If creating a spec requires me to first create a product, then an intention, then an expectation before I can write anything, the onboarding friction will kill adoption on my team. There should be a way to start with the spec and backfill the hierarchy.
- If the Flow Board requires mouse drag-and-drop as the only way to move cards, and I'm on a call sharing my screen, I'll look clumsy. A dropdown or button transition is the minimum.
- If there's no way to see all specs across intentions in a single filtered view, I can't do a morning standup sweep efficiently.

## Questions They'd Ask

1. "When I export a spec to YAML, does the file include the linked expectations and their edge cases, or just the spec body?"
2. "How does context inheritance work — if I update the product's stack section after a spec was created, does the spec update or stay frozen at the snapshot?"
3. "Can I create a spec and leave the intention/expectation fields empty temporarily, then fill them in later without losing work?"
4. "What happens if a spec hits a WIP limit — does it block the move visually on the board, or just silently fail?"
5. "Is there a bulk action to move multiple specs between phases, or is it always one at a time?"
6. "Can I filter the board by spec assignee or by intention, or is it always the full product board?"
7. "What does the override reason field look like in the audit trail — can I pull a report of all overrides this sprint?"
