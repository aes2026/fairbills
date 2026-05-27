# FairBills v1 — Build Handoff Bundle

This folder contains everything Claude Code needs to build FairBills v1.

## What's in here

```
CLAUDE_CODE_PROMPT.md       The complete build specification — the brief
01-landing.html              Landing page visual reference
02-upload.html               Upload screen visual reference
03-results.html              Results screen visual reference
04-script.html               Script screen visual reference
05-no-bill-quick-check.html  No-bill alternative flow visual reference
README.md                    This file
```

## How to use it

### Step 1 — Set up your project

```bash
npx create-next-app@latest fairbills --typescript --tailwind --app
cd fairbills
npx shadcn@latest init
npm install @anthropic-ai/sdk @supabase/supabase-js lucide-react zod
```

### Step 2 — Copy this folder into your project

Drop the entire `fairbills-handoff/` folder into the root of your new
project (or anywhere Claude Code can read it).

### Step 3 — Open Claude Code in the project root

```bash
cd fairbills
claude code
```

### Step 4 — Give Claude Code the brief

Paste this into Claude Code as the opening message:

> Read `fairbills-handoff/CLAUDE_CODE_PROMPT.md` completely. Then look at
> all five HTML mockups in the same folder. They are visual references for
> the screens we need to build. Confirm you understand the brief, then
> let's start with the landing page (`app/page.tsx`).

### Step 5 — Build iteratively

Don't try to build everything at once. The CLAUDE_CODE_PROMPT.md has a
"build first, in order" section. Follow it. Stop and test after each step.

## When you run into issues

- **The mockups have inline styles, not Tailwind classes** — that's
  deliberate. They're visual references, not code to copy. Claude Code
  should translate them into idiomatic Tailwind.
- **The mockups use Tabler icons** — production should use Lucide
  (specified in the prompt). They're visually similar.
- **The mockups don't show error states or loading states** — those need
  to be designed during the build. The prompt covers what good loading
  states look like.
- **The mockups don't show mobile** — Claude Code should make everything
  responsive, mobile-first. Test at 375px width.

## Before you start coding

These are practical things to lock down that aren't in the brief:

1. **Domain** — register fairbills.com.au and fairbills.au via VentraIP
   or Crazy Domains. ~$70/year for both.
2. **ABN** — register a sole trader ABN at abr.gov.au if you don't
   already have one. Required for .com.au.
3. **Supabase project** — create one at supabase.com. Free tier covers
   v1 easily.
4. **Anthropic API key** — get one at console.anthropic.com if you don't
   have one already.
5. **Resend account** — for transactional email. Free tier covers v1.
6. **Vercel account** — for hosting. Free tier covers v1.
7. **GitHub repo** — make it public from day one. Open source is part
   of the brand.
8. **Test bills** — collect at least one real PDF bill from each of:
   Origin, AGL, EnergyAustralia, Red Energy, Alinta, Powershop, Energy
   Locals, Momentum, Tango, Lumo. You'll need these for testing the
   parser. Ask friends and family to forward you their bills.

## Timeline reality check

For someone comfortable in the stack working part-time:
- Week 1: project setup, landing page, Supabase schema, AER PRD sync
- Week 2: bill upload + Anthropic parsing
- Week 3: comparison engine + results screen
- Week 4: script generation + screen
- Week 5: no-bill flow + email capture
- Week 6: polish, testing, deployment, soft launch

For someone learning the stack: roughly double these timelines.

For a fully ship-ready public launch with press coverage and proper
testing: add another 2-4 weeks.

## What to do once v1 is live

1. Soft launch — share with 20-30 friends and family. Watch them use it.
   Fix what breaks.
2. Post on r/AusFinance with the "I built this" framing. Don't oversell.
3. Email three financial counsellors at local community orgs (Salvation
   Army Moneycare, Anglicare, Vinnies) offering free training on the tool.
4. Pitch ABC New England NW for a local-news story.
5. Don't add features until you have 1,000+ users. The pressure to add
   "just one more thing" will be immense. Resist.

Good luck.
