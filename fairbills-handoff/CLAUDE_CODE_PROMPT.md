# FairBills v1 Build Spec

This document is the complete brief for Claude Code to build FairBills v1.
Paste this into Claude Code as the system prompt or initial context for a
new project. The HTML mockup files in this folder are your visual reference.

---

## What FairBills is

FairBills is a free Australian web tool that helps households find out if
they're overpaying for electricity by comparing their current bill against
every available plan from all 77 NEM retailers. Users upload a power bill,
get a savings estimate, and receive a script to either negotiate with their
existing retailer or switch to a cheaper one.

For v1 we ship electricity only, NSW only, free only — no accounts, no
payments, no subscriptions, no donations.

The product fights the "loyalty tax" — the structural penalty Australians pay
for staying loyal to their existing retailer while new customers get discounts.

---

## Brand voice and positioning

The brand voice is "no-bullshit Aussie mate who knows the system." Confident,
slightly punchy, warm, trustworthy. Think Up Bank meets CHOICE meets The
Betoota Advocate.

Concrete examples of the voice:
- Headline: "Your power company is taking the piss."
- Subhead: "Aussies on rollover plans are quietly overpaying by hundreds a year."
- Trust line: "No commission, no kickbacks."
- Script intro: "Most people get a better rate either way."

What the voice IS NOT:
- Not corporate ("Welcome to FairBills, your trusted energy comparison partner")
- Not breathless ("Save THOUSANDS today!!")
- Not technical ("Optimise your kWh consumption across the available retail tariffs")
- Not condescending ("Don't worry, we'll guide you through every step")

The user is treated as an adult who's busy and getting ripped off, and we are
the mate who has the time to figure it out for them.

---

## Tech stack

- Next.js 14 with App Router
- TypeScript strict mode
- Tailwind CSS only (no other styling libraries)
- shadcn/ui for buttons, cards, dialogs where useful
- Lucide icons (no emoji, no character mascots in v1)
- Supabase for database, auth (if added later), and Edge Functions
- Anthropic Claude API for bill parsing (claude-haiku-4-5-20251001 is fine
  for OCR; consider claude-sonnet-4-6 for script generation)
- AER's public Product Reference Data API for energy plan data
- Vercel for hosting
- Resend or AWS SES for transactional email (the 6-month nudge)

No accounts, no Supabase Auth in v1. State is captured per-session and
optionally retained via email capture for the follow-up nudge only.

---

## Brand colour system

Use these as Tailwind extensions — do not improvise others.

```js
// tailwind.config.ts colors
colors: {
  brand: {
    50: '#E1F5EE',  // pale teal — backgrounds, badges
    100: '#EAF3DE', // pale lime — success backgrounds
    400: '#97C459', // accent lime — highlights on dark
    500: '#1D9E75', // primary brand green — CTAs, mark
    600: '#0F6E56', // darker teal — icon fills
    700: '#173404', // very dark green — final-CTA backgrounds
    800: '#04342C', // brand dark — primary text, mark dark
  },
  danger: {
    50: '#FCEBEB',  // pale red — "you're overpaying" backgrounds
    600: '#791F1F', // mid red — overpayment text
    800: '#501313', // dark red — overpayment headlines
  },
  warning: {
    50: '#FAEEDA',  // pale amber — "try this first" tips
    600: '#854F0B', // mid amber — tip icons
    800: '#412402', // dark amber — tip text
  },
  info: {
    50: '#E6F1FB',  // pale blue — trust block backgrounds
    600: '#185FA5', // mid blue — trust icons, links
    800: '#0C447C', // dark blue — info text
  },
  surface: {
    DEFAULT: '#FFFFFF',
    muted: '#F1EFE8', // page background outside cards
  },
  text: {
    primary: '#04342C',
    secondary: '#5F5E5A',
    tertiary: '#888780',
  }
}
```

Border: always 0.5px solid rgba(0,0,0,0.15) for subtle cards. Never use
heavier borders unless emphasising a featured card (then 2px solid brand-500).

Border radius: use 8px (rounded-lg) for most components, 12px (rounded-xl)
for cards, 999px for pills.

---

## Typography

- Default Tailwind font stack (system fonts)
- Headings: font-medium (500), not bold (700) — heavy bold reads aggressive
- H1: 42px desktop, 32px mobile, letter-spacing -0.5px, line-height 1.15
- H2: 22px, letter-spacing -0.3px
- Body: 16px, line-height 1.6
- Small/UI: 13px or 14px
- Labels/captions: 11-12px, often with letter-spacing 0.5px and uppercase
  ONLY for very short labels like "STEP 1" or "YOUR CURRENT PLAN"

Sentence case everywhere. Never title case headings. Never ALL CAPS for
copy beyond 3-word labels.

---

## v1 user flow

Three screens, total:

1. **Landing page** — sells the value, shows the live counter, has the
   "Upload my bill" CTA and the "No bill? Estimate instead" fallback
2. **Upload + processing** — drag-and-drop or file picker; while processing,
   shows a loading state with "Reading your bill..." status
3. **Results** — shows the user's current plan, the cheapest alternatives,
   the "Get my switch script" CTA, and the "Try this first" retentions tip

After the results screen, the user can:
- Get the script (which opens a modal or new page with the script + retailer
  phone number + copy buttons)
- Provide email for a 6-month follow-up nudge (optional, no other use of
  this email)
- Share the result (auto-generated share card with savings amount, redacted
  identifying info)

No accounts. No login. No persistent user history in v1.

---

## Visual references

Five HTML mockup files are provided in this folder:

- `01-landing.html` — full landing page with hero, live counter, how it
  works, sample result, trust section, final CTA, footer
- `02-upload.html` — the upload screen with drop zone and "enter manually"
  fallback
- `03-results.html` — the results screen showing current plan vs. top pick
  vs. runners-up plus the "try this first" tip
- `04-script.html` — the script screen with retentions script, phone
  number, copy button, and "if they push back" expandable
- `05-no-bill-quick-check.html` — the no-bill alternative entry point
  (postcode + retailer + household size)

These mockups are visual targets. They use raw HTML with inline styles —
your job is to translate them into proper React/TypeScript components with
Tailwind classes. Match the visual hierarchy, copy, colours, and spacing,
but use idiomatic Next.js patterns.

---

## Key technical specs

### Bill parsing pipeline

1. User uploads PDF or image via drag-and-drop or file picker
2. File posted to a Next.js API route (`/api/parse-bill`)
3. API route forwards to Anthropic Claude with structured output prompt
   asking for: retailer name, plan name, total bill amount, kWh used,
   billing period start, billing period end, supply charge per day, usage
   rate per kWh (or peak/off-peak/shoulder if time-of-use), postcode,
   distributor (Essential Energy, Ausgrid, Endeavour Energy for NSW)
4. Parsed data returned as JSON; user can correct fields if anything looks
   wrong (the "is this right?" confirmation screen — small step but earns
   trust)
5. Parsed data sent to the comparison engine

### Comparison engine

1. Takes the parsed bill data
2. Queries Supabase for all current plans available to the user's
   distributor (data loaded nightly from AER PRD API)
3. For each plan, calculates annualised cost using the user's actual kWh
   usage
4. Returns plans sorted by annualised cost ascending
5. Top 5 returned to UI; user sees top 1 prominently with savings amount,
   plus 4 runners-up

The annualised cost formula:
```
annualised_cost =
  (supply_charge_per_day * 365) +
  (usage_kwh_per_year * usage_rate_per_kwh) +
  any_applicable_discounts_minus
```

Be careful with time-of-use plans where usage is split across peak,
shoulder, off-peak. For v1, if the user's bill is flat-rate, only compare
against other flat-rate plans. If it's time-of-use, compare against
time-of-use plans only. Mixing them produces inaccurate estimates.

### AER PRD API integration

Public, no accreditation required. Documentation at
https://www.aer.gov.au/energy-product-reference-data

Endpoints used:
- `GET /cds-au/v1/energy/plans?type=ALL&effective=CURRENT&page-size=1000`
  for listing all current plans (paginated)
- `GET /cds-au/v1/energy/plans/{planId}` for full plan details

Build a nightly cron (Supabase Edge Function with a scheduled trigger, or
a Vercel Cron) that:
1. Fetches all current plans across all 77 retailers
2. Filters to NSW (residential, electricity only, market offers — not
   standing offers)
3. Splits by distributor
4. Stores in Supabase `plans` table with all rate components
5. Logs the run for debugging

### Script generation

The script is generated server-side from a template, not by the LLM
directly. The LLM only fills in the variables — never improvises.

Template:
```
"Hi, I've been a customer for a few years on the [CURRENT_PLAN_NAME],
account [PLACEHOLDER_FOR_ACCOUNT_NUMBER].

I've just compared my rates and I can move to [TOP_PICK_RETAILER]'s
[TOP_PICK_PLAN_NAME] plan at [TOP_PICK_USAGE_RATE]c/kWh and
[TOP_PICK_DAILY_SUPPLY] daily supply — that's about $[ANNUAL_SAVING] a
year cheaper than what I'm paying you.

Before I switch, can you have a look and see what your best offer is? If
you can match it or get close, I'd rather stay."
```

The "If they push back" responses are static template snippets — same
fallbacks for every user.

The retailer phone number comes from a static lookup table (
`retailer_phone_numbers.json`) maintained as part of the codebase. ~50-80
phone numbers, all retentions lines. Build this table once; it changes
rarely.

### Data persistence in v1

- Anonymous session ID in localStorage (random UUID) so the user can leave
  and return within 24 hours without re-uploading
- Bill data stored in Supabase keyed by session ID, with 30-day TTL
- Email captures stored permanently for the 6-month nudge
- No personally identifiable information beyond email is stored beyond
  the 30-day TTL

---

## Database schema (Supabase)

```sql
-- Plans loaded nightly from AER PRD
create table plans (
  id text primary key,
  retailer_name text not null,
  retailer_id text not null,
  plan_name text not null,
  state text not null,                  -- 'NSW' for v1
  distributor text not null,            -- 'Essential Energy', 'Ausgrid', 'Endeavour Energy'
  tariff_type text not null,            -- 'flat' | 'time_of_use' | 'controlled_load'
  is_market_offer boolean not null,
  supply_charge_per_day_cents int not null,
  usage_rate_cents_flat int,            -- for flat-rate plans
  usage_rate_cents_peak int,            -- for time-of-use
  usage_rate_cents_shoulder int,
  usage_rate_cents_offpeak int,
  features jsonb,                       -- pay-on-time discount, green energy, etc.
  effective_from date not null,
  effective_to date,
  raw_data jsonb,                       -- full AER response for debugging
  last_synced_at timestamptz default now()
);

create index plans_distributor_idx on plans(distributor);
create index plans_market_idx on plans(is_market_offer, state, distributor);

-- Anonymous bill submissions (30-day TTL)
create table bill_submissions (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  parsed_data jsonb not null,
  recommended_plans jsonb,
  email text,                            -- only if user opts in for 6-month nudge
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '30 days')
);

create index bill_submissions_session_idx on bill_submissions(session_id);
create index bill_submissions_expires_idx on bill_submissions(expires_at);

-- Email captures for 6-month follow-up
create table email_followups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  bill_submission_id uuid references bill_submissions(id),
  postcode text,
  current_retailer text,
  saving_estimate_cents int,
  scheduled_for timestamptz not null,    -- 6 months from now
  sent_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz default now()
);

create index email_followups_scheduled_idx on email_followups(scheduled_for) where sent_at is null and unsubscribed_at is null;

-- Aggregate stats for the live counter
create table fairbills_stats (
  id int primary key default 1,
  total_savings_estimated_cents bigint not null default 0,
  total_users int not null default 0,
  total_switches_reported int not null default 0,
  last_updated timestamptz default now()
);
```

---

## What to build first, in order

1. **Project scaffolding** — Next.js, Tailwind, shadcn/ui, Supabase client,
   environment variables for Anthropic API key and Supabase credentials
2. **Landing page** — translate `01-landing.html` to a proper React page
   at `app/page.tsx`. Use shadcn/ui Button. Hardcode the live counter
   numbers for now ($1,847,392 etc.); we'll wire to Supabase next.
3. **Supabase setup** — create the schema above. Build the nightly AER
   PRD sync (start with a manual script you can run by hand; cron-schedule
   later).
4. **Upload flow** — translate `02-upload.html`. Wire the file picker and
   drag-and-drop. Build `/api/parse-bill` route that calls Claude with the
   uploaded file.
5. **Confirmation step** — show parsed bill fields, let user correct
   anything that looks wrong before comparison runs.
6. **Comparison engine** — server-side function that takes parsed bill data
   and queries plans table; returns top 5 ranked by annualised cost.
7. **Results screen** — translate `03-results.html`. Wire to the
   comparison engine output.
8. **Script generation** — translate `04-script.html`. Wire the script
   template to interpolate user's data.
9. **No-bill alternative path** — translate `05-no-bill-quick-check.html`.
   Build the postcode + retailer + household-size flow with ABS-average
   usage estimates.
10. **Email capture for 6-month nudge** — form, validation, Supabase write,
    confirmation UI.
11. **6-month follow-up email** — Vercel cron or Supabase scheduled
    function that emails users at the 6-month mark.
12. **Live counter wiring** — replace hardcoded numbers with Supabase
    queries.

This is roughly 4-6 weeks of focused part-time work for someone comfortable
in the stack. Ship in pieces — the landing page can go live alone in week
one as a "coming soon" page that captures emails.

---

## Things to do well that are easy to get wrong

**Bill parsing accuracy.** Bills from different retailers look wildly
different. Build a small library of test bill PDFs (one per major
retailer: Origin, AGL, EnergyAustralia, Red Energy, Alinta, Powershop,
Energy Locals, Momentum, Tango, Lumo) and run them through the parser
with a known-good answer for each. If parser fails on any test bill,
fix before shipping. Bill OCR mistakes are the fastest way to lose user
trust.

**The "is this right?" confirmation.** Always show the user what was
parsed before running comparison. Even if the AI is right 95% of the
time, the 5% who see wrong data and don't get to correct it will leave
furious. Three fields max on the confirmation screen: retailer, current
plan, total bill amount. Anything else can be edited but defaults are
shown.

**Honest savings claims.** Never round up. If the estimate is $327, show
$327, not "$350+." If the saving depends on assumptions, say so. Trust
is the moat.

**Retailer quality alongside price.** Bill Hero only ranks on price and
gets criticised for recommending shonky retailers. FairBills should
include a retailer quality flag — at minimum, surface a warning on
retailers with ProductReview ratings below 2.5 stars. ("Cheapest, but be
aware: this retailer has 1.8 stars from 412 reviews.")

**The "try this first" retentions tip is the brand statement.** It's the
move Bill Hero would never make. It's what makes FairBills different. It
must be prominent on every results screen, not hidden in a footer.

**Mobile-first.** The most engaged users will be on phones — older
demographics use larger phone fonts and tap targets. Test at 375px width.
Tap targets minimum 44px tall.

**Loading states are part of the brand.** When parsing a bill, show "Reading
your bill..." then "Comparing 77 retailers..." then "Finding your best plan..."
Each takes 2-3 seconds and conveys that real work is happening. Static
spinners feel like the app is broken.

---

## What NOT to build in v1

- User accounts or login
- Payment processing
- Subscriptions of any kind
- Donation flow
- Rage Wall / community features
- Postcode leaderboard
- Multi-utility (gas, broadband, mobile)
- Continuous monitoring / Pro tier
- Mobile native app
- Internationalisation
- Analytics dashboards beyond Vercel's built-in
- A/B testing infrastructure

All of these are v2+. Resist the urge to build "just one more thing."

---

## Definition of done for v1

A user in NSW can:
1. Land on fairbills.com.au
2. Click "Upload my bill"
3. Drag-and-drop a PDF or photo of their power bill
4. See their bill parsed correctly (retailer, plan, amount)
5. See a savings estimate against the cheapest plan available
6. See top 5 alternatives ranked by savings
7. Click "Get my switch script"
8. Receive a personalised retentions script with retailer phone number
9. Copy the script
10. Optionally provide email for a 6-month nudge
11. (Bonus) Share the result via a generated image card

If a user can complete this flow without ever needing to email support,
v1 is done. Ship it.

---

## Anthropic API specifics

Use the streaming endpoint for parsing — gives the user something to see
while the LLM works. Use structured output for bill parsing:

```ts
const response = await anthropic.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 1000,
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'document', // or 'image' for photos
          source: { type: 'base64', media_type: 'application/pdf', data: base64Pdf }
        },
        {
          type: 'text',
          text: `Parse this Australian electricity bill. Return ONLY a JSON object with these fields:
{
  "retailer_name": string,
  "plan_name": string | null,
  "billing_period_start": "YYYY-MM-DD",
  "billing_period_end": "YYYY-MM-DD",
  "total_amount_cents": int,
  "kwh_used": int,
  "supply_charge_per_day_cents": int,
  "usage_rate_cents_flat": int | null,
  "usage_rate_cents_peak": int | null,
  "usage_rate_cents_shoulder": int | null,
  "usage_rate_cents_offpeak": int | null,
  "postcode": string,
  "tariff_type": "flat" | "time_of_use" | "controlled_load"
}
No other text. If you cannot find a field, use null.`
        }
      ]
    }
  ]
});
```

Parse the response with JSON.parse. Validate with zod schema. If parsing
fails or fields are missing, fall back to manual entry.

---

That's the brief. The mockups show the look; this document gives you the
spec. Build it.

Questions to ask the user (Ben) if anything is unclear:
- Is the AER PRD API actually returning the data we need? (test it early)
- What's the test bill collection look like? Do we have real bills from
  multiple retailers?
- Domain pointed to Vercel yet? (check fairbills.com.au registration)
- Anthropic API key in environment? Supabase project created?

Good luck.
