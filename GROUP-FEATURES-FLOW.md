Core product rules
These rules should guide all app behavior:
A traveler’s private inputs must never be shown to other travelers.
Hard constraints must never be silently broken.
The app should produce only plans that are realistically possible based on time, opening hours, travel time, budget, and fixed commitments.
If no perfect plan exists, the app must explain the tradeoff instead of pretending there is one.
The final itinerary should include shared activities, optional split activities, and clear reunion points.
AI should be used to extract messy ideas, summarize reasoning, and help interpret text. Core constraint scoring should remain transparent and deterministic.

2. Private traveler preference profile
[Hackathon-ready]
Each traveler completes a short private profile. The experience should feel like a friendly two-minute survey, not a long form.

2.1 Availability and fixed commitments
Arrival date and approximate arrival time.
Departure date and approximate departure time.
Whether the traveler joins the full trip or only part of it.
Existing commitments, such as concert tickets, a wedding, or a dinner reservation.
Optional note: “I cannot do anything before 6 PM on Friday.”
Example:
Sam arrives Saturday at 1 PM, so the planner must not schedule Sam into Friday night or Saturday morning activities.

2.2 Budget and spend style
2.2.1 Total trip budget
Input options:
Under $400
$400–600
$600–900
$900–1,300
$1,300+
Custom range
Then ask:
“How flexible is this?”
Hard limit — do not exceed this.
Preferred limit — small flexibility is acceptable.
Flexible for one splurge — I can spend more for the right thing.
2.2.2 Spending priorities
Each traveler chooses their top one or two priorities:
Accommodation — better location, comfort, private room, hotel amenities.
Food and drinks — memorable restaurants, cafés, bars, local food.
Activities — museums, tickets, tours, shows, classes, experiences.
Convenience — rideshares, airport transfer, less walking, shorter travel time.
Keep costs low — prefer free or low-cost activities.
2.2.3 Accommodation preferences
Lowest workable cost.
Best value.
Comfortable and well-located.
Hotel experience matters most.
Room preference:
Fine sharing a room.
Need my own bed.
Need a private room.
Fine sharing a bathroom.
Need a private bathroom.
2.2.4 Optional-cost preference
“If part of the group wants a more expensive activity, are you okay doing something else at that time?”
Yes, split up if needed.
Sometimes, if we reunite afterward.
No, I prefer shared activities.

2.3 Pace and logistics
Daily pace: Relaxed / Balanced / Full day.
Preferred start time: Early / Around 9–10 AM / Late start.
Walking tolerance: Short walks / Moderate walking / Lots of walking okay.
Transport preference: Public transit / Mix / Rideshares okay.
Need for free time: None / Some / A few hours daily.
Group-style preference: Mostly together / Open to splitting occasionally / Prefer several solo blocks.
2.4 Food, accessibility, and comfort needs
These should be optional unless relevant.
Dietary preferences and allergies.
Alcohol preference: Include nightlife / Fine either way / Prefer non-alcohol-focused activities.
Accessibility: Step-free, wheelchair access, elevator required, stroller-friendly, limited walking.
Sensory preference: Quieter venues, avoid crowds, avoid late-night places.
2.5 Interests, must-dos, and avoids
Select up to three broad interests: food, art, history, shopping, live music, nightlife, outdoors, wellness, sports, family activities, local culture.
Add one specific must-do.
Add one or more “cannot do” activities.
Optionally rank top interests.
Example:
A traveler may choose: Food, Art, Local Culture; then add “Visit the Met” as a Must have and “No clubbing” as Cannot do.

3. Research Inbox: collect messy trip ideas
[Hackathon-ready for text, links, and screenshots]
[Instagram Reel/video extraction: post-hackathon]
The group needs one place to dump unorganized travel research.
Each traveler can add:
Plain text notes.
A place name.
A Google Maps link.
A general web link.
An uploaded screenshot.
A pasted restaurant, attraction, or hotel recommendation.
The app creates a searchable “Trip Ideas Inbox.”
For each item, the system should attempt to extract:
Place name.
Category: restaurant, bar, museum, activity, hotel, park, etc.
Neighborhood/location.
Estimated cost category.
Relevant interest tags.
Who added it.
Confidence level if extraction is uncertain.
Example:
Priya uploads a screenshot that says, “The Met is free for NY residents and amazing on rainy days.” The app extracts “The Metropolitan Museum of Art,” categorizes it as Art / Indoor / Museum, and adds it to the candidate pool.
Important implementation rule: users must be able to manually edit or confirm extracted information.
4. Planning engine
[Hackathon-ready with deterministic logic]
4.1 Hard-constraint filtering
The engine must reject or avoid itinerary items that break:
A traveler’s unavailable time.
Arrival/departure windows.
Fixed bookings or commitments.
Dietary/allergy requirements for shared meals.
Accessibility requirements.
Hard budget caps.
“Cannot do” preferences.
Opening hours.
Unrealistic transit or travel time.
Example:
The app cannot place a 10 AM walking tour on Saturday if Alex arrives at 1 PM and another traveler has selected “No early mornings” as Cannot do.
4.2 Preference scoring
For feasible activities, score based on:
Must-have satisfaction.
Would-love satisfaction.
Nice-to-have satisfaction.
Individual budget fit.
Group travel time.
Daily pace.
Shared versus split preference.
Interest diversity.
Indoor/outdoor needs.
Availability and booking confidence.
The engine should use transparent weighted scoring. Do not claim a mysterious AI score.
4.3 Generate exactly three itinerary options
The planner generates these three named choices:
Consensus Plan
Prioritizes maximum agreement and the fewest compromises.
Example:
A balanced weekend with one museum, vegan-friendly meals, modest nightlife, and all activities within every hard budget limit.
Balanced Plan
Ensures each traveler gets at least one high-priority activity, even if the schedule is slightly less efficient.
Example:
Priya gets the museum, Jordan gets nightlife, Sam gets a Central Park activity, Maya gets vegan dining, and Alex gets a relaxed Sunday morning.
Best-Value Plan
Minimizes cost while retaining the group’s most important shared experiences.
Example:
Free park activity, affordable food market, transit-first routes, and a value accommodation option.
4.4 Intentional split and reunion planning
The engine should not force every traveler into every activity.
It should create structured split blocks:
Saturday 2:00–4:30 PM
Group A: Museum visit
Group B: Shopping / coffee walk
Reunite: 5:00 PM at dinner near Union Square
Each split block must have:
Which travelers are assigned.
Why the split exists.
A clear reunion time and location.
A travel-time-safe path to the next shared activity.
5. Itinerary view with map and timeline
[Hackathon-ready]
Each generated option should have a clear, visual itinerary page.
Display:
Day-by-day timeline.
Shared activities.
Optional/split activities.
Meal blocks.
Transit or walking blocks.
Fixed reservations.
Estimated cost range.
Hotel/home-base location.
Interactive or static map with route lines.
Status labels: Confirmed / Estimated / Needs booking / Weather-sensitive.
6. Fairness Receipt
[Hackathon-ready]
Each itinerary option must have a simple explanation of why it was generated.
This should be visible to the whole group without exposing private data.
Example:
Why this plan works
Meets all submitted hard constraints
Fits every traveler’s budget range
Includes one high-priority experience for each traveler
Includes a split afternoon to respect different interests
Avoids long cross-city travel
Includes an indoor backup in case of rain

7. Compromise Studio
[Hackathon-ready]
If no perfect itinerary satisfies every preference, show the group the smallest realistic tradeoffs.
Do not simply return an error or silently ignore a preference.
Example:
The group cannot include the Broadway show, premium hotel, and Saturday dinner reservation within all submitted budget ranges.
Then show choices:
Choice
Result
Keep the Broadway show
Increase estimated spend by approximately $35 per person
Keep the budget
Replace Broadway with a lower-cost evening activity
Keep every shared activity
Add a split afternoon and reduce shared travel time
Keep a relaxed pace
Remove one Sunday attraction

Privacy rule:
Never reveal whose individual input creates the constraint. Use wording such as “one or more submitted limits.”
This feature should let the group choose a tradeoff and regenerate the plan.
8. Private option feedback and plan locking
[Hackathon-ready]
When the group sees the Consensus, Balanced, and Best-Value plans, each traveler should see a private personalized overlay.
The group view can say:
“This plan satisfies all required group constraints.”
Maya’s private view can say:
Why this works for you
Starts after 10 AM, matching your preferred pace
Includes two vegan-friendly meals
Includes an art museum visit
Keeps your estimated spend within your preferred range
Gives you a relaxed solo café block on Sunday
Jordan may see something completely different for the exact same plan:
Why this works for you
Includes Saturday-night live music
Keeps the group together for the main dinner
Preserves a flexible late-evening block
Includes your preferred higher-energy activity
This is a major feature. It proves that GroupWeave has not generated one generic group itinerary.
After viewing the three options, each traveler can privately respond to each plan:
Happy with this plan.
Acceptable with a small change.
This breaks a must-have for me.
The organizer sees only aggregate results, for example:
Consensus Plan: 4 happy, 1 needs a change
Balanced Plan: 5 happy
Best-Value Plan: 3 happy, 2 need a change
The organizer can then lock the selected plan.
Once locked:
The itinerary becomes the active plan.
It receives a status of “Locked.”
The group sees what needs booking.
The app creates a version snapshot before future changes.
9. Accommodation selection and Stay22 booking handoff
[Hackathon-ready]
After the group chooses an itinerary option, GroupWeave recommends the best home-base neighborhood based on where the itinerary happens.
Example:
If most plans are in SoHo, the East Village, and Chelsea, GroupWeave may recommend staying in Lower Manhattan instead of Midtown.
Display:
Recommended neighborhood.
Why that location works.
Live accommodation options for the group’s dates.
Price and booking link.
Approximate travel time to major itinerary blocks.
Group lodging-fit label: Best value / Best location / Best comfort.
Use Stay22’s Direct Travel API only for live, user-facing accommodation data and booking links. Do not store or analyze accommodation listings long-term.
Example rationale:
This hotel is a 12-minute average trip from your planned activities, fits the group’s lodging preferences, and reduces late-night travel.
10. Change event and partial re-planning
[Hackathon-ready as a simulated trigger]
The app should prove that the plan adapts when something changes.
For the demo, provide selectable triggers:
Rain starts Saturday afternoon.
Restaurant is unavailable.
A traveler arrives two hours late.
A museum closes early.
The group wants to reduce spending.
When triggered, GroupWeave should:
Preserve the locked preferences.
Identify affected itinerary blocks.
Regenerate only the affected part.
Highlight changes visually.
Explain why the replacement was chosen.
Example:
Rain affects the Central Park walk from 2–4 PM. GroupWeave replaced it with an indoor gallery visit 10 minutes away and preserved the 5 PM reunion dinner.

11. Share and export the chosen plan
[Hackathon-ready for shareable web link and copyable summary]
[Calendar sync / native mobile offline mode: post-hackathon]
Once locked, provide:
Public/private shareable itinerary link.
Copyable text summary for WhatsApp or iMessage.
Printable itinerary view.
“Open route in Maps” links.
List of booking links and responsibilities.
Example copyable summary:
NYC Friends Weekend — Locked Plan
Hotel: Lower Manhattan
Saturday: Brunch → split museum/shopping → dinner → optional rooftop bar
Sunday: relaxed coffee → Central Park → depart


GroupWeave — Application Flow & Screen Spec
This document maps every screen in GroupWeave, what's on it, what the user does, and where they go next. It follows the feature spec exactly (Core product rules; Private preference profile; Research Inbox; Planning engine; Itinerary view; Fairness Receipt; Compromise Studio; Private feedback & locking; Stay22 accommodation handoff; Change events; Share/export). Screens tagged [V2] are explicitly post-hackathon per the spec (Reel/video extraction, calendar sync, native offline) — build everything else for the demo.

0. Two roles, one app
Organizer — creates the trip, monitors who's responded, triggers plan generation, sees aggregate feedback, locks the final plan, triggers the Stay22 handoff, shares the final itinerary. The organizer is also a traveler and goes through the private survey like everyone else.
Traveler — joins via invite link, completes the private survey, optionally adds to the Research Inbox, views the three plans, sees their own private "why this works for you" overlay, gives private feedback per plan.
Every screen below is marked [Organizer], [Traveler], or [Both].

Phase A — Entry & Trip Setup
A1. Landing / Sign-in — [Both]
Elements: app logo/name, "Create a Trip" CTA, "Have an invite link? Join a trip" secondary CTA, sign-in (email or social).
Action: Create → A2. Join via link → A3.
A2. Create Trip — [Organizer]
Elements: trip name, destination (or "let the group vote" toggle — out of scope for MVP, assume destination is fixed), rough date range (or "TBD"), organizer's own name.
Action: Create → generates a unique invite link/QR → routes organizer into B1 (organizer fills their own private survey like any traveler) → then D1 (Group Dashboard).
A3. Join Trip — [Traveler]
Elements: trip name/destination preview pulled from the invite link, traveler's name input, "Join" CTA.
Action: Join → routes into B1.

Phase B — Private Preference Survey
Framed as a friendly ~2-minute flow, one short screen per topic, progress indicator at top. Every answer here is private — never shown to other travelers (Core rule).
B1. Survey Intro — [Both]
Elements: "This stays private" reassurance copy, "Takes about 2 minutes" estimate, Start CTA.
B2. Availability & Fixed Commitments — [Both] (spec 2.1)
Elements: arrival date + approx. time, departure date + approx. time, toggle "joining full trip / part of trip," free-text fixed commitments (e.g., "wedding Saturday 4–8pm"), optional free-text note field ("I can't do anything before 6 PM Friday").
Data captured feeds directly into hard-constraint filtering (4.1).
B3. Budget & Spend Style — [Both] (spec 2.2, multi-step within this screen or sub-stepper)
B3a. Total trip budget: preset bands (Under $400 / $400–600 / $600–900 / $900–1,300 / $1,300+ / Custom range).
B3b. Flexibility: Hard limit / Preferred limit / Flexible for one splurge.
B3c. Spending priorities: pick top 1–2 of Accommodation / Food & drinks / Activities / Convenience / Keep costs low.
B3d. Accommodation preference: Lowest workable cost / Best value / Comfortable & well-located / Hotel experience matters most; room preference (share room / own bed / private room; share bathroom / private bathroom).
B3e. Optional-cost preference: "If part of the group wants a pricier activity, are you okay doing something else?" → Yes split up / Sometimes if we reunite / No, prefer shared.
This screen's data is the most sensitive input in the app — flag clearly in UI copy that it's never shared, only used to compute fairness-safe outputs.
B4. Pace & Logistics — [Both] (spec 2.3)
Elements: daily pace (Relaxed / Balanced / Full day), preferred start time (Early / 9–10 AM / Late), walking tolerance (Short / Moderate / Lots okay), transport preference (Public transit / Mix / Rideshares okay), need for free time (None / Some / A few hrs daily), group-style preference (Mostly together / Open to splitting / Prefer solo blocks).
B5. Food, Accessibility & Comfort — [Both] (spec 2.4, optional/skippable unless relevant)
Elements: dietary preferences/allergies (free text + common-tag chips), alcohol preference (Include nightlife / Fine either way / Prefer non-alcohol-focused), accessibility needs (step-free / wheelchair / elevator required / stroller-friendly / limited walking — multi-select), sensory preference (quieter venues / avoid crowds / avoid late-night).
B6. Interests, Must-Dos & Avoids — [Both] (spec 2.5)
Elements: interest chips, select up to 3 (food, art, history, shopping, live music, nightlife, outdoors, wellness, sports, family, local culture), optional drag-to-rank; one specific "must-do" free-text field; one or more "cannot do" free-text/chip entries.
B7. Survey Complete — [Both]
Elements: confirmation ("Your answers are saved and private"), CTA to add trip ideas → C1, or CTA to go to the group dashboard/waiting screen → D1.

Phase C — Research Inbox
Collaborative, ongoing, visible to the whole group (unlike the survey). Text/links/screenshots are [Hackathon-ready]; Instagram Reel/video extraction is [V2].
C1. Trip Ideas Inbox — [Both]
Elements: feed of submitted items as cards (place name, category tag, neighborhood, cost category, who added it, confidence badge if extraction is uncertain), search/filter by category, "+ Add Idea" CTA.
C2. Add Idea — [Both]
Elements: input modes — plain text note, place name, Google Maps link, general web link, screenshot upload, pasted recommendation text.
Action: Submit → routes to C3 if extraction ran, or directly back to C1 if it's a simple manual entry.
C3. Confirm Extraction — [Both]
Elements: AI-extracted fields shown editable — place name, category (restaurant/bar/museum/activity/hotel/park/etc.), neighborhood, estimated cost category, interest tags, confidence level flag.
Action: Confirm/edit → saves to inbox → back to C1. (This is the one place AI is used for interpretation, per the core rule — constraint scoring itself stays deterministic elsewhere.)

Phase D — Group Status
D1. Group Dashboard — [Both, organizer sees extra controls]
Elements: list of travelers with response status (Survey complete / In progress / Not started), countdown to trip date, live count of Research Inbox items, trip summary (dates, destination, headcount).
[Organizer only]: "Generate Plans" CTA — enabled once a minimum threshold of travelers have completed the survey (e.g., all, or all-but-one with a warning).
[Traveler]: sees the same dashboard read-only, can jump back into the survey to edit answers, or into the inbox.
Action: Organizer taps Generate Plans → E1.

Phase E — Plan Generation & Review
E1. Generating — [Both]
Elements: deterministic-feeling progress copy tied to the actual engine steps (e.g., "Checking arrival/departure windows," "Applying hard budget limits," "Scoring must-haves and would-loves," "Building split blocks") — this reinforces the "transparent, not mysterious AI" rule from the spec. Short, since this should feel fast in a demo.
Auto-advances to E2 when done.
E2. Three Plans Overview — [Both]
Elements: three cards — Consensus Plan, Balanced Plan, Best-Value Plan — each with a one-line description (max agreement / everyone gets one priority / lowest cost), estimated cost range, and a thumbnail day-strip.
Action: Tap a card → E3 (that plan's detail view).
E3. Plan Detail — [Both] (one instance per plan, same layout)
Elements: day-by-day timeline, shared activities, optional/split activities clearly marked, meal blocks, transit/walking blocks, fixed reservations, estimated cost range, hotel/home-base location, map with route lines, status labels (Confirmed / Estimated / Needs booking / Weather-sensitive).
Sub-section: split blocks show which travelers are in which group, why the split exists, reunion time/location, and a travel-time-safe path to the next shared activity (spec 4.4).
Action: scroll to E4 (Fairness Receipt) and E5 (private overlay), or tap "Give Feedback" → E6.
E4. Fairness Receipt — [Both] (attached to bottom of E3, group-visible)
Elements: plain-language checklist, e.g. "Meets all submitted hard constraints," "Fits every traveler's budget range," "Includes one high-priority experience for each traveler," "Includes a split afternoon to respect different interests," "Avoids long cross-city travel," "Includes an indoor backup in case of rain." No individual data ever named.
E5. Private "Why This Works For You" Overlay — [Traveler, private]
Elements: toggle/tab on the plan detail screen visible only to the logged-in traveler, showing their own personalized reasons (e.g., "Starts after 10 AM, matching your pace," "Includes two vegan-friendly meals," "Keeps your spend within your preferred range"). Different travelers see completely different reasons for the same plan — this is the proof point that the plan isn't generic, so it should be visually distinct/highlighted in the UI.
E6. Private Feedback — [Traveler, private]
Elements: three-option response per plan — "Happy with this plan" / "Acceptable with a small change" / "This breaks a must-have for me." Optional free-text note if the middle or last option is picked.
Action: Submit → back to E3 or E2. Traveler can give feedback on all three plans before the organizer decides.
E7. Organizer Aggregate Results — [Organizer]
Elements: per-plan rollup (e.g., "Consensus Plan: 4 happy, 1 needs a change"; "Balanced Plan: 5 happy"; "Best-Value Plan: 3 happy, 2 need a change") — counts only, never attributed to individuals.
Actions: "Lock this plan" → F1, or "Open Compromise Studio" → E8 if a plan has unresolved "breaks a must-have" flags.
E8. Compromise Studio — [Organizer] (conditional — only reachable when no plan is perfect)
Elements: a plain description of the specific conflict (e.g., "The group cannot include the Broadway show, premium hotel, and Saturday dinner reservation within all submitted budget ranges"), followed by a small table of named tradeoff choices, each with its concrete result (e.g., "Keep the Broadway show → +$35/person," "Keep the budget → replace Broadway with a lower-cost evening activity," "Keep every shared activity → add a split afternoon," "Keep a relaxed pace → remove one Sunday attraction").
Privacy rule enforced here: never states whose limit created the constraint — always "one or more submitted limits."
Action: pick a tradeoff → triggers a partial regenerate → back to E3 (updated plan) → E7.

Phase F — Locking & Booking
F1. Plan Locked Confirmation — [Both]
Elements: confirmation banner, plan status changes to "Locked," a version snapshot is silently created, "What needs booking" checklist preview, CTA into accommodation → F2.
F2. Accommodation Selection (Stay22 handoff) — [Organizer, viewable by all]
Elements: recommended home-base neighborhood with a one-line rationale (e.g., "This hotel is a 12-minute average trip from your planned activities and reduces late-night travel"), live accommodation listings for the group's dates via Stay22 Direct API (price, thumbnail, booking link), lodging-fit labels (Best value / Best location / Best comfort).
Explicit build note: use Stay22 Direct API only for live, user-facing display and booking links at this step — do not persist/analyze listings beyond the session.
Action: tap a listing → external booking link (Stay22) → back to F3.
F3. Booking Checklist — [Both]
Elements: simple list of what's booked vs. still needs booking (accommodation, reservations, tickets), who's responsible for each, status checkmarks.

Phase G — Living Itinerary & Adaptation
G1. Active Itinerary Home — [Both]
Elements: the locked plan's day-by-day timeline becomes the default "home" view post-lock (reuses E3's layout with a "Locked" badge), quick links to Booking Checklist and Share/Export.
G2. Change Event Trigger — [Organizer, demo-only selectable triggers]
Elements: for the hackathon demo, a simple selectable list simulating real triggers: "Rain starts Saturday afternoon," "Restaurant is unavailable," "A traveler arrives two hours late," "A museum closes early," "The group wants to reduce spending."
Action: select a trigger → G3.
G3. Regeneration Result — [Both]
Elements: before/after view highlighting only the affected block(s) visually (e.g., strikethrough old block, highlight new block), one-line rationale for the replacement (e.g., "Rain affects the Central Park walk from 2–4 PM. Replaced with an indoor gallery visit 10 minutes away, and preserved the 5 PM reunion dinner."), everything outside the affected block stays untouched.
Action: Accept → updates G1, creates a new version snapshot → G4 available from history.
G4. Version History — [Both, lightweight]
Elements: simple list of snapshots with timestamp and one-line reason for each change (mainly a safety net / transparency feature, not a demo centerpiece).

Phase H — Share & Export
H1. Share / Export — [Both]
Elements: shareable web link (public/private toggle), "Copy as text summary" (formatted for WhatsApp/iMessage), printable itinerary view, "Open route in Maps" links per day, list of booking links and who's responsible for each.

Build-priority notes for the agent
Build for the demo (spec-tagged [Hackathon-ready]): everything above except the items listed below.
Explicitly out of scope for v1 [V2]:
Instagram Reel / video extraction in the Research Inbox (C2/C3) — text, links, and screenshots only for the demo.
Calendar sync.
Native mobile offline mode.
Cross-cutting rules to enforce everywhere, not just on one screen:
A traveler's private inputs (survey answers, individual feedback) are never rendered anywhere another traveler can see them — only aggregates (E7) or anonymized language (E8).
Hard constraints (arrival/departure windows, dietary/accessibility, hard budget caps, "cannot do," opening hours, unrealistic transit time) are never silently violated in any of the three generated plans — if they can't all be met, that's what routes the organizer into Compromise Studio (E8) instead of producing a broken plan.
Constraint scoring (E1/E2 engine) stays deterministic and explainable; AI is used only for interpreting messy input (C3 extraction) and writing natural-language rationale text (E4, E5, G3) — not for the underlying feasibility/scoring logic.
Every plan, every regeneration, and every compromise choice must be explainable in plain language — there's no screen in this app that shows a result without also showing why.


