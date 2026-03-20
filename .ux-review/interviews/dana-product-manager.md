# Persona Interview: Dana Kim (Product Manager)

## Pre-Use Expectations

- I expect Forge to give me a bird's-eye view of the product — not just a list of tickets, but a sense of where things stand and where we're stuck. That's the thing I'm always trying to construct manually from Jira and stand-up notes.
- I expect the Flow Board to be my home base. I'll check it every morning before standup. It should load fast and tell me the story of the sprint without me clicking into individual specs.
- I expect setting up a product to be the first thing I do, and I'm hoping the tool guides me through the hierarchy — product, then intentions, then expectations, then specs — rather than dropping me on a blank form and hoping I figure it out.
- I expect to be able to export something useful for stakeholders. Not necessarily a full spec dump, but at minimum a Markdown summary I can paste into a doc or share in Slack. If the export is only useful for engineers, that limits my use of the tool significantly.
- I'm not a developer, so I don't need to understand everything in the Context block of a spec (stack, auth, patterns). But I do need the non-technical parts — what the spec is for, what it delivers, what the current phase is — to be easy to read without scrolling past walls of code-adjacent content.
- I expect WIP limits to be configurable. Right now we're a small team and our limits will be different from what the defaults assume. I need to set those without writing code or editing a config file.

## Key Concerns

- **No dashboard or summary metrics:** My biggest frustration with most dev tools is that they show me all the detail and none of the summary. I want to know: how many specs are in each phase right now, how long has each spec been in its current phase, and is anything blocked? If I have to count the cards on the board myself, that's a product gap.
- **Hierarchy setup is a prerequisite, not a feature:** If I have to create a product, then add intentions, then add expectations before a single spec can exist, I will bounce off the tool on day one. New users — including me — will try to create a spec first because that's the thing we understand. The tool needs to handle that gracefully, not just fail silently.
- **Export for stakeholders, not just engineers:** I need to be able to pull something out of Forge that I can share with my CEO or a client without them needing to log in. YAML is useless to them. Markdown is borderline. I need to know whether the Markdown export is human-readable prose or a structured document that looks like a config file.
- **Visibility into blockers without reading every card:** If a spec is stuck in Review because it failed the completeness checklist, or because it's hit a WIP limit, I need to see that from the board without clicking into the spec. The board cards need to surface the reason for being stuck, not just the current phase.
- **WIP limits and phase-change rules I don't fully understand:** I understand the concept of WIP limits, but what exactly triggers a WIP limit warning in Forge? Is it per-phase, per-product, per-intention? And who can override it — just the tech lead, or anyone? I need these rules explained somewhere accessible, not buried in documentation.
- **Stakeholder-facing summary missing:** I don't see a way to generate a status report. After our weekly review, I want to send the team something that says "here's where every spec stands." That feels like a gap that will push me back to maintaining a separate spreadsheet.

## Must-Have Features

- A phase summary count visible on the board without scrolling — "3 In Progress, 2 in Review, 1 blocked" at a glance
- Ability to configure WIP limits through the UI, not through code or environment variables
- A Markdown export that reads like a brief for a human, not a config for a machine
- Guided setup flow for new products that walks through the hierarchy in order
- Some visual indicator on board cards that shows why a spec is blocked or stuck (checklist failure, WIP limit, etc.)
- Quick navigation from board card to full spec detail and back without losing board scroll position

## Deal-Breakers

- If I cannot see the big picture without opening individual specs, I will maintain my own tracking spreadsheet alongside Forge, which immediately makes Forge optional rather than essential.
- If the export feature only serves engineers (YAML-first, Markdown as an afterthought), I cannot use it in stakeholder communications and will revert to manually writing status updates.
- If configuring WIP limits or product settings requires editing code or a config file, I cannot do it without involving a developer — which adds friction every time our team size or pace changes.
- If the hierarchy is so strictly enforced that I cannot create a spec until I've built out the full product-intention-expectation chain, the tool will feel like it's working against me on day one. I'll set it up wrong, get frustrated, and tell the team it's not ready.

## Questions They'd Ask

1. "Can I see a summary count of specs per phase somewhere on the board — like a column header showing '3 cards' in each lane?"
2. "How do I know which specs have been sitting in the same phase for too long — is there any kind of age indicator or stale flag?"
3. "Can I configure WIP limits from the product settings page, or is that something a developer has to set up?"
4. "When I export a spec to Markdown, does it include the phase it's in and what's still missing from the completeness checklist?"
5. "Is there any way to get a board-level export — something that shows all specs and their current phase — that I can share with someone who doesn't have access to Forge?"
6. "What's the fastest way to set up a new product from scratch, including intentions and expectations, so I can get a spec created in one sitting?"
7. "If a spec is blocked because of a WIP limit, how does that show up on the board — does the card look different, or do I only find out when I try to move it?"
