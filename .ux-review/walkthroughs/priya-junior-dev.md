# Persona Walkthrough: Priya Sharma (Junior Developer)

**Key Traits:** Intermediate tech comfort (strong coder, new to PM tools), 6 months into first job, 15" laptop at 1366x768, overwhelmed by too many fields, doesn't understand the IDD hierarchy, primary goal is finding assigned specs and understanding what to build.

---

## Task: Morning routine -- find a spec to work on, understand what to build, move it through phases

### Step-by-Step Experience

#### Step 1: Landing on the Products List (/)
- **Action:** Navigated to http://localhost:5173 -- redirected to /products
- **Expected:** Some kind of home page or dashboard that shows me what I need to work on today. Maybe "My Specs" or "Assigned to Me."
- **Actual:** A list of products with names, phase badges, and problem statements. Seven products visible, many with cryptic names like "E2E Editor Product 1774030639211."
- **Reaction:** "Wait, where are my tasks? I don't see anything about what's assigned to me. This looks like a list of... products? I'm not sure which one my team works on. The 'Discovery' and 'Active' badges don't mean anything to me yet. And what are all these 'E2E Editor Product' things? Are those real? I'm already confused and I haven't even started."
- **Friction Level:** 4 -- Major. No concept of "my work" or assignments. A junior dev has to know which product to click, which presumes organizational knowledge the tool doesn't provide.

#### Step 2: Finding the Right Product
- **Action:** Scanned the list, guessed "Forge" might be the right product based on the description mentioning "spec-management tool"
- **Expected:** Clear indication of which product I belong to, or a way to filter
- **Actual:** Had to read descriptions to figure out which product was mine. No favoriting, no "recent" section, no team/user association.
- **Reaction:** "I had to read through all the descriptions to find the right one. On my first day someone would have to tell me 'click on Forge.' There's no way to know otherwise."
- **Friction Level:** 3 -- Moderate. Solvable by a team lead pointing you to the right product, but the tool offers no help.

#### Step 3: Product Detail Page -- Understanding Navigation
- **Action:** Clicked into "Forge" product
- **Expected:** A clear path to "my specs" or "things to work on"
- **Actual:** A detailed page with Problem Statement, Vision, Target Audience, a technical Context block, WIP Limits, and three cards: Intentions, Specs, Flow Board. Lots of information.
- **Reaction:** "There's a lot here. Problem Statement, Vision, Context with Stack and Patterns... I guess that's useful but it's not what I'm looking for right now. I just want to find my spec. I see three cards at the bottom -- Intentions, Specs, and Flow Board. What's the difference between Intentions and Specs? The descriptions say 'Manage the intentions that define this product's purpose' and 'Manage the specs that implement this product's intentions.' Okay so specs are what I work on, I think? But what about the Flow Board -- 'Visualize spec workflow across phases with drag-and-drop.' That sounds like it might show me what's in progress."
- **Friction Level:** 3 -- Moderate. The three navigation options require understanding of IDD hierarchy that Priya doesn't have yet. No guidance on which link a developer should click.

#### Step 4: Checking the Flow Board
- **Action:** Clicked "View Board" hoping to see work in progress
- **Expected:** A board showing tasks/specs with my name on them, like a simple Kanban board
- **Actual:** Six-column board with phase names (Draft, Ready, In Progress, Review, Validating, Done). WIP limit badges show "0/5", "0/3", etc. Most columns say "No specs in this phase." Two spec cards in Done column.
- **Reaction:** "Okay, this looks like a Kanban board, which I've seen before. But everything is either empty or done. There's nothing 'In Progress' for me to pick up. And these columns -- Draft, Ready, In Progress, Review, Validating, Done -- that's six phases? In my last team we just had Todo, In Progress, and Done. What's the difference between 'Ready' and 'Draft'? And what's 'Validating'? I don't see any names on the cards either, so even if there were specs here, I wouldn't know which ones are mine."
- **Friction Level:** 3 -- Moderate. The six-phase workflow is more complex than what Priya is used to. No assignment/ownership visible on cards. Phase names aren't self-explanatory for newcomers.

#### Step 5: Viewing a Spec Detail Page
- **Action:** Navigated to SPEC-002 detail page
- **Expected:** A clear description of what to build, like a user story or task description
- **Actual:** Detailed page with title, phase badge (Done), complexity badge (Medium), export buttons, phase transition buttons (Ready, InProgress, Review, Validating), then sections: Description, Context (Stack/Patterns/Conventions/Auth), Boundaries, Deliverables, Validation (Automated + Human), Linked Expectations, Peer Reviewed indicator, timestamps. Completeness Checklist sidebar with 11 items.
- **Reaction:** "Okay, the Description tells me what to build: 'Implement full CRUD for the Product entity establishing patterns for all subsequent entity CRUDs.' That's clear enough. But then there's all this other stuff -- Context with Stack and Patterns, Boundaries, Deliverables, Validation criteria... it's a lot of sections. I'm not sure which ones I need to read carefully versus which are metadata. The Deliverables section is actually really helpful -- it tells me exactly what files/components to produce. The Completeness Checklist on the side has 11 items and they're all green, which is reassuring. But those four transition buttons at the top (Ready, InProgress, Review, Validating) -- can I just click any of them? What order do they go in? What if I click the wrong one?"
- **Friction Level:** 3 -- Moderate. The spec content is comprehensive and useful, but the volume of sections is overwhelming for a junior dev. The transition buttons lack guidance on proper sequence.

#### Step 6: Attempting to Edit a Spec
- **Action:** Navigated to SPEC-002 edit page
- **Expected:** A simple form with clearly labeled required vs. optional fields
- **Actual:** Long single-page form with collapsible sections: Title, Description, Phase/Complexity dropdowns, Context (expanded, showing Stack items with individual Remove buttons, Patterns, Conventions, Auth), Expectations (read-only with count), Boundaries, Deliverables, Validation (Automated + Human + Peer Reviewed checkbox). Save/Cancel at the bottom. Live checklist sidebar.
- **Reaction:** "This is overwhelming. There are so many fields and sections. I count at least 8 collapsible sections. The Context section alone has four sub-sections with dozens of individual text inputs. I can see all the tech stack items each have their own text box and a Remove button -- am I supposed to edit these? What if I accidentally remove something? There's no undo. I don't even know which fields are required. Nothing is marked with an asterisk or 'required' label. The Expectations section says I can't link them here and need to go to the detail page -- but I'm not even sure what 'linking expectations' means."
- **Friction Level:** 4 -- Major. No required field indicators, no contextual help, no undo for destructive actions (removing stack items), and the form is very long on a 1366x768 screen.

#### Step 7: Trying to Create a New Spec
- **Action:** Navigated to the new spec form
- **Expected:** A guided form that walks me through what's needed
- **Actual:** Same complex form as the editor, but with product context pre-populated. Expectations section says "0" with a message about linking after creation.
- **Reaction:** "Same long form. I appreciate that the tech stack is already filled in, but I don't know what half these sections mean. What's a 'Boundary'? What should go in 'Automated Validation'? There's no tooltip or help text explaining any of this. If I just fill in Title and Description and hit Create, will that work? Or will it yell at me? I'm afraid to try."
- **Friction Level:** 4 -- Major. No inline help, no field descriptions, no progressive disclosure for beginners.

---

## Summary

### Delight Moments
- The Deliverables section on spec detail clearly lists what to produce -- this is the most useful section for a developer
- Context inheritance pre-populates the tech stack, so a new spec starts with the right technology context
- The Completeness Checklist provides a clear visual of what's done vs. missing (green checkmarks)
- Breadcrumb navigation on the specs list (Products > Forge > Specs) helps with orientation
- The Description field on spec cards in the list gives enough context to identify specs

### Friction Points (ranked by severity)
1. **No concept of assignment or "my work"** (Critical) -- No way to see specs assigned to me; no user/assignee on spec cards or the board
2. **No required field indicators or inline help** (Major) -- Fields are unmarked; no tooltips explaining what Boundaries, Deliverables, or Validation sections mean
3. **IDD terminology is unexplained** (Major) -- "Intentions," "Expectations," "Phase transitions," "WIP limits" are domain jargon with no onboarding or help text
4. **Phase transition buttons lack guidance** (Major) -- All four transition buttons shown at once with no indication of proper order or consequences
5. **Form complexity is overwhelming** (Moderate) -- 8+ collapsible sections, dozens of fields, no progressive disclosure
6. **No undo for destructive actions** (Moderate) -- Removing a stack item or convention has no confirmation or undo
7. **Product list has no personalization** (Moderate) -- No way to find "my product" without prior knowledge
8. **Six-phase workflow is complex** (Minor) -- Draft/Ready/InProgress/Review/Validating/Done is more granular than typical junior-dev experience

### Overall Verdict
Priya would struggle to adopt this tool without significant onboarding. The core spec content is actually useful for a developer (especially Deliverables and Validation sections), but the tool assumes you already understand the IDD methodology and know which product/spec is yours. Without assignment, search, inline help, or progressive disclosure, Priya would rely on her tech lead to navigate the tool for her, which defeats the purpose of self-service.

### Recommendations (from Priya's perspective)
- Add user assignment to specs and a "My Specs" view or filter
- Add required field indicators (asterisks) and help text/tooltips for each section
- Add a brief onboarding tooltip or help panel explaining the IDD hierarchy on first visit
- Show only the valid next phase transition, with a label explaining what it means (e.g., "Move to Ready -- this means the spec is complete and reviewed")
- Add confirmation dialogs for destructive actions (removing items from lists)
- Consider a "simple view" vs. "full view" toggle that hides advanced sections for readers vs. authors
- Add a glossary or "What's this?" links for IDD terminology
