# Persona Walkthrough: Dana Kim (Product Manager)

**Key Traits:** Intermediate tech comfort, PM/part-time dev, 13" MacBook (1440x900), daily board checks in 10-15 minutes, wants big-picture visibility, exports specs for stakeholder review, sets up products and intentions.

---

## Task: Daily board review, check spec progress, identify bottlenecks, export a spec for stakeholder review

### Step-by-Step Experience

#### Step 1: Landing on the Products List (/)
- **Action:** Navigated to http://localhost:5173 -- redirected to /products
- **Expected:** A dashboard showing my products with quick status summaries (e.g., "Forge: 2 specs in progress, 1 blocked")
- **Actual:** A flat list of product cards showing name, phase badge, problem statement, and creation date. Seven products listed, including five "E2E Editor Product" entries that are clearly test data.
- **Reaction:** "This is just a list? I was hoping for a dashboard with at-a-glance status. I can't tell from this list how many specs each product has, what phase they're in, or if anything is stuck. I have to click into each product to see what's going on. The E2E test products are cluttering things up -- I need filtering or at least the ability to archive/hide products I don't care about. On my 13-inch screen, I can see maybe 4-5 products before scrolling, so the noise from test data is really impactful."
- **Friction Level:** 3 -- Moderate. No summary metrics on the product list. No way to see progress without clicking in. Test data noise.

#### Step 2: Product Detail Page
- **Action:** Clicked into "Forge" product
- **Expected:** A summary showing spec distribution across phases, active intentions, maybe a mini-board
- **Actual:** Full product definition page: Problem Statement, Vision, Target Audience, Context (Stack/Patterns/Conventions/Auth), WIP Limits table, and three navigation cards (Intentions, Specs, Flow Board). WIP limits show numerical values per phase.
- **Reaction:** "This page is comprehensive but it's oriented toward the spec author, not the PM. I can see the WIP limits are set (Draft: 5, Ready: 3, In Progress: 3, Review: 3, Validating: 2) but I can't see how many specs are currently IN each phase. I have to go to the board for that. The Context section with tech stack details is interesting but not what I need for my daily review. I'd love a summary card here showing something like '7 specs total: 2 Draft, 1 Ready, 2 In Progress, 0 Review, 0 Validating, 2 Done.' That would save me a click to the board every time."
- **Friction Level:** 2 -- Minor. The page is well-structured but optimized for authors over PMs. Missing a quick status summary.

#### Step 3: Flow Board -- The Main Event
- **Action:** Clicked "View Board"
- **Expected:** A clear visual board showing specs in columns, bottlenecks highlighted, maybe color coding for aging or blocked specs
- **Actual:** Six-column Kanban board: Draft (0/5), Ready (0/3), In Progress (0/3), Review (0/3), Validating (0/2), Done (2). Most columns are empty with "No specs in this phase" messages. Two spec cards in Done showing title, complexity badge, and days-in-phase (0d). "Back to Product" link in header.
- **Reaction:** "The board layout is what I expected -- six columns matching the lifecycle phases. The WIP limit badges in column headers (0/5, 0/3, etc.) are exactly what I need to see capacity at a glance. But right now the board is sparse -- only two specs in Done and everything else empty. On a real project with 15-20 specs, this would be much more useful. A few things I'm missing: (1) No summary bar showing total counts per phase. (2) No way to identify bottlenecks -- if the Review column had 3/3 specs, would it turn red? I see the badge uses 'destructive' variant when at limit, which is good. (3) No way to export or share the board view for a status update. (4) No filtering by assignee, complexity, or age. (5) The 'days in phase' counter (0d) is useful for spotting stale specs -- I like that."
- **Friction Level:** 2 -- Minor. The board serves its core purpose well. Missing summary metrics and export/share capabilities that a PM needs for reporting.

#### Step 4: Spec Cards on the Board
- **Action:** Examined the spec cards in the Done column
- **Expected:** Enough info to understand what each spec is about without clicking in
- **Actual:** Each card shows: spec title (e.g., "SPEC-002: Product CRUD"), complexity badge (Medium), and days-in-phase counter (0d). No description preview, no assignee, no linked intention/expectation info.
- **Reaction:** "The title and complexity are helpful, but I'd also want to see a one-line description or the linked intention name. When I'm reporting to stakeholders, they don't know what 'SPEC-002: Product CRUD' means -- they care about the intention it fulfills, like 'Teams can organize work in a purpose-driven hierarchy.' Also, there's no assignee shown, so I can't tell who's working on what without clicking into each spec."
- **Friction Level:** 2 -- Minor. Cards are clean but lack context that PMs need for status reporting.

#### Step 5: Viewing a Spec for Export
- **Action:** Navigated to SPEC-002 detail page
- **Expected:** A well-formatted spec with prominent export options
- **Actual:** Comprehensive spec detail: title, phase, complexity, Export YAML / Export Markdown buttons, Edit / Delete buttons, phase transition buttons, then full spec content (Description, Context, Boundaries, Deliverables, Validation, Linked Expectations, Peer Reviewed status). Completeness checklist sidebar showing 11/11.
- **Reaction:** "The Export YAML and Export Markdown buttons are right at the top -- perfect. I can quickly export a spec to share with stakeholders or AI agents. The spec content is thorough and well-organized. The Completeness Checklist on the side is brilliant for quality assurance -- I can see at a glance that this spec meets all 11 criteria. But a few things: (1) Export YAML is probably not what I'd send to stakeholders -- Markdown is the one I need. (2) There's no 'copy to clipboard' option for the export, just file download presumably? (3) I notice the spec doesn't show which Product it belongs to or which Intention it serves from this page -- I'd need to use the breadcrumbs or back button to see the hierarchy context. Wait, actually there are no breadcrumbs on this page. Just the global 'Products' nav link."
- **Reaction continued:** "The linked Expectations section shows 'All hierarchy entities support full CRUD operations' with a 'Specced' badge and a link to the expectation. That's useful for tracing the hierarchy."
- **Friction Level:** 2 -- Minor. Export is prominent and spec content is great. Missing breadcrumbs to show hierarchy context and no clipboard-copy option.

#### Step 6: Setting Up Product Hierarchy (Intentions and Expectations)
- **Action:** Navigated to Intentions list for Forge product
- **Expected:** A clear list of intentions with progress indicators showing how many specs cover each
- **Actual:** Three intentions listed as cards: "Teams can generate AI-ready spec documents" (High, Draft), "Teams can track spec progress through a Kanban workflow" (High, Draft), "Teams can organize work in a purpose-driven hierarchy" (Critical, InProgress). Each card shows the intention statement, priority badge, description, and status badge. Breadcrumbs present: Products > Forge > Intentions. "New Intention" button available.
- **Reaction:** "This is where the IDD model really shows its value. The intentions are stated as capability statements ('Teams can...') which is exactly the language I use with stakeholders. The priority badges (Critical, High) help me communicate what matters most. But I'm missing progress information: how many expectations does each intention have? How many specs cover those expectations? Are any expectations unspecced? I'd want a progress indicator like '3/5 expectations specced' or a small progress bar. Also, the status badges (Draft, InProgress) -- are these the status of the intention itself, or a summary of the specs underneath? That's not clear."
- **Friction Level:** 3 -- Moderate. Good list of intentions but missing progress/coverage metrics that a PM needs to track hierarchy completeness.

#### Step 7: Attempting to Create a Spec Before Setting Up Hierarchy
- **Action:** Noted the "New Spec" button on the specs list
- **Expected:** The tool would guide me to set up intentions and expectations first if none exist
- **Actual:** The new spec form opens immediately with pre-populated context. The Expectations section shows "0" with a note: "No expectations linked. Link expectations from the spec detail page after creating." There's no warning that I should create intentions/expectations first.
- **Reaction:** "I know from my persona that I tend to try creating specs before setting up intentions and expectations. The tool doesn't stop me or warn me -- it just lets me create a spec with 0 expectations linked, which would then fail the completeness checklist (item 5: 'At least one expectation linked'). It would be much better to show a gentle warning or a link to the intentions page if no expectations exist yet for this product."
- **Friction Level:** 3 -- Moderate. No guardrails or guidance for the correct hierarchy setup sequence. The completeness checklist catches it eventually, but late feedback is worse than upfront guidance.

---

## Summary

### Delight Moments
- WIP limit badges on board column headers provide instant capacity visibility
- Days-in-phase counter on spec cards helps identify stale/stuck work
- Completeness Checklist (11/11) gives clear quality assurance signal
- Export YAML and Export Markdown buttons are prominently placed on spec detail
- Intention statements use capability language ("Teams can...") perfect for stakeholder communication
- Breadcrumbs on the specs/intentions list pages help with orientation
- Context inheritance means new specs start with correct product context

### Friction Points (ranked by severity)
1. **No dashboard or summary view** (Major) -- Product list shows no metrics; must click into each product and then into the board to see status. A PM doing daily reviews across multiple products spends too many clicks.
2. **No board export or share capability** (Major) -- Cannot export a board snapshot, generate a status report, or share a link to a filtered view for stakeholder updates.
3. **No progress/coverage metrics on intentions** (Major) -- Intentions list doesn't show how many expectations exist per intention or how many are specced. Cannot assess hierarchy completeness at a glance.
4. **No guidance for hierarchy setup order** (Moderate) -- Tool allows creating specs without intentions/expectations and doesn't warn about the expected setup sequence.
5. **No assignee/owner on spec cards or board** (Moderate) -- Cannot see who's working on what from the board view.
6. **Missing breadcrumbs on spec detail and board** (Moderate) -- No way to see the full hierarchy path (Product > Intention > Expectation > Spec) from the spec detail page.
7. **Spec cards lack description/intention context** (Minor) -- Cards show title and complexity but not the "why" (linked intention).
8. **No filtering on any list** (Minor) -- Cannot filter specs by phase, complexity, assignee, or age on the board or list views.

### Overall Verdict
Dana would partially adopt this tool. The Flow Board is a good foundation for daily status checks, and the completeness checklist enforces quality in a way that's genuinely valuable. The export buttons make it easy to share individual specs. However, the lack of dashboards, board export, and progress metrics means Dana would need to supplement Forge with manual status tracking (spreadsheets, slide decks) for stakeholder reporting. The tool is currently optimized for spec authors, not for PMs who need big-picture visibility and reporting. Adding a product dashboard with phase distribution metrics and a board export/share feature would make this a daily-driver for the PM use case.

### Recommendations (from Dana's perspective)
- Add a product dashboard card showing spec count per phase (e.g., a small bar chart or summary line)
- Add "Export Board" or "Copy Status Summary" functionality for stakeholder reporting
- Add progress indicators to the intentions list (expectations count, specs coverage)
- Show a warning when creating a spec without any expectations available to link
- Add assignee/owner to spec cards on the board
- Add filtering to the board (by complexity, assignee, days-in-phase)
- Add breadcrumbs showing full hierarchy on every page
- Consider a cross-product dashboard view showing all products' board summaries
