# Persona Interview: Marcus Thompson (Senior Developer, Accessibility Advocate)

## Pre-Use Expectations

- I expect a modern web app built in React to have at minimum WCAG 2.1 AA compliance. That means sufficient color contrast, keyboard navigability for every interactive element, visible focus indicators, and proper ARIA labeling on dynamic content.
- I expect a Kanban-style board to be one of the higher-risk areas for accessibility. Drag-and-drop is the canonical example of an interaction that is completely inaccessible without a keyboard alternative. I'll be looking for that alternative immediately.
- I expect shadcn/ui components to carry reasonable baseline accessibility, since that library is built on Radix UI primitives which do provide keyboard support. But that's only the baseline — what the team builds on top of those primitives is what usually introduces regressions.
- I expect the completeness checklist to be the most complex interactive component in the app, and therefore the most likely place where focus management breaks. When items update live while I type in the editor, I need to know that focus is not being stolen and screen readers are being notified of changes appropriately.
- I expect phase transition controls — moving a spec from Draft to Ready, for instance — to be reachable and operable by keyboard. If the only affordance is a drag handle on a card, that's a blocker for me.
- I operate at 150% browser zoom. I expect the layout to remain usable — no truncated labels, no overlapping buttons, no horizontal scroll appearing on main content areas.
- I expect high-contrast text throughout. Faded placeholder text, light gray metadata, and muted badge labels are the most common contrast failures I see in tools like this.

## Key Concerns

- **Flow Board drag-and-drop:** This is my first and biggest concern. If the only way to move a spec between phases is to drag a card from one column to another, the board is inaccessible. There must be a keyboard-operable alternative — a dropdown, a button set, a context menu — that is reachable from within the card itself without a mouse.
- **Focus management on dynamic content:** The completeness checklist updates live as the spec form changes. Every time a checklist item flips from incomplete to complete, the DOM is modified. If React re-renders naively, my keyboard focus position may be lost or reset to the top of the page. This is a severe usability issue for keyboard-only users.
- **Color as the sole status indicator:** If phases, checklist states, and WIP limit warnings are communicated only through color (green checkmark vs. red X, amber badge vs. gray badge), users with color vision deficiencies will miss critical information. There must always be a text or icon-with-label alternative.
- **Badge and label contrast at 150% zoom:** WIP limit badges, phase labels on cards, and status chips are typically small elements. At 150% zoom they become larger but may also reveal that their text is a light-on-medium-gray combination that fails WCAG AA contrast ratios. I'll check every badge variant.
- **Collapsible sections in the spec editor:** Accordion-style collapsibles must use the correct ARIA roles (button with aria-expanded) and must be keyboard operable. Many implementations get the visual toggle right but forget to announce the open/closed state to assistive technology.
- **Modal dialogs and overlays:** If phase transitions, override prompts, or export confirmations are presented in modals, I need to confirm that focus is trapped inside the modal while it is open and returned to the triggering element when it closes.
- **Skip navigation:** On long spec detail pages with many sections, there should be a skip-to-main-content link so I'm not tabbing through the entire navigation header on every page load.

## Must-Have Features

- Keyboard-accessible phase transition controls on every spec card and spec detail page — not just drag-and-drop
- Visible, high-contrast focus rings on all interactive elements (not just the browser default outline, which is often removed by reset stylesheets)
- ARIA live regions on the completeness checklist so screen readers announce when criteria are satisfied without moving focus
- Sufficient color contrast on all text, badges, and status indicators — WCAG AA minimum (4.5:1 for normal text, 3:1 for large text and UI components)
- Proper semantic heading structure on spec detail pages so I can use heading navigation to jump between sections
- All form fields associated with labels via htmlFor/id pairs — not just visually proximate text

## Deal-Breakers

- If the Flow Board provides no keyboard alternative to drag-and-drop, I cannot use the core workflow of the tool. I will be permanently blocked from moving specs through their lifecycle without a mouse.
- If the phase transition button or the completeness checklist are not reachable by tabbing from the top of the page in a logical order, every phase change becomes a multi-step workaround that is slower than opening a terminal.
- If the app removes or suppresses focus outlines globally (a common mistake when teams add `outline: none` to reset styles), keyboard navigation becomes invisible and therefore unusable.
- If modals do not trap focus, my keyboard tab order will wander behind the overlay into content I cannot see, which is disorienting and practically breaks the interaction.

## Questions They'd Ask

1. "Can I move a spec from one phase to the next using only my keyboard — what is the exact key sequence to do that from the board view?"
2. "Are the WIP limit badges and phase labels readable at WCAG AA contrast ratios? Has anyone run a contrast audit on the badge color palette?"
3. "When the completeness checklist updates live while I'm typing in the editor, does the focus stay on the field I'm typing in, or does something in the DOM re-render and reset my position?"
4. "Do the collapsible spec editor sections expose aria-expanded state to screen readers, and do they update when toggled via keyboard?"
5. "Is there a skip-to-main-content link on spec detail and board pages?"
6. "When a phase transition triggers an error or a 422 from the completeness gate, how is that error communicated — visually only, or also via an ARIA alert role?"
7. "Has the app been tested with any screen reader — NVDA, JAWS, or VoiceOver — at any point in development?"
