# Hirepulse Solutions website

Next.js (App Router, TypeScript) + Framer Motion site for **Hirepulse Solutions Pvt. Ltd.**, built on
the layout and motion of a rebuilt Framer template ("Verixa") and filled with the content of the
Hirepulse company profile (10-page PDF).

## Run

```bash
npm ci
npm run dev        # http://localhost:3000
npm run build
npm run typecheck
```

## Pages

| Route | Content (from the company profile) |
|---|---|
| `/` | Hero (People. Potential. Progress.), two hiring models, six services, IT / non-IT scope, why Hirepulse, people, process, FAQ |
| `/about-us` | Who we are, why Hirepulse, 10+ / 50+ / 15+ counters, purpose, leadership and delivery team |
| `/service` | Six services (with anchors), Hire-Train-Deploy vs lateral models, delivery brief, process, FAQ |
| `/hiring-scope` | IT and non-IT roles, representative sectors, sourcing channels, regional strongholds |
| `/contact` | Email, website, registered office (Ahmedabad), branch offices |

All copy lives in `src/lib/hirepulse.ts`. Facts are as supplied in the profile, which notes they were
not independently verified; leadership names follow the profile ("Jinendra Mihsra").

## Brand

Colours sampled from the logo and profile: slate `#142c30`, teal `#1f9399` / `#10666b`,
orange `#ef8a3b`, peach `#fff2e5`. The logo (`public/brand/`) was cut out of the profile's logo
image; replace it with the original vector file when available.

## Things to know

- **Photos**: apart from the two leadership photos, the images are stock photos that came with the
  Framer template (credited there to Freepik). Check the licence or replace them with Hirepulse's own.
- **Contact form**: mock. `/api/contact` validates input and drops spam, but stores nothing; the
  thank-you message asks people to email info@hirepulsesolutions.com. Wire it to an inbox or CRM
  before relying on it.
- **Search engines**: pages are `noindex` until `NEXT_PUBLIC_ALLOW_INDEXING=true` is set (do this once
  the site is on its own domain, and set `NEXT_PUBLIC_SITE_URL` to that domain).
- Motion follows the original template: word-by-word heading reveals, fade-up blocks, hiding header,
  card hovers, smooth wheel scrolling; all respect `prefers-reduced-motion`.
