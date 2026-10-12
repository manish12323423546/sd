# Verixa replica

A Next.js (App Router, TypeScript) + Framer Motion rebuild of the Framer template site
`verixa.framer.media`, made from a capture ZIP (stage 2 of the website replica pipeline).
Reference/demo work: the copy, photos and brand belong to the template's authors, and the site is
served with `noindex, nofollow`.

## Run

```bash
npm ci
npm run dev        # http://localhost:3000
npm run build      # static pages for every route + /api/contact
npm run typecheck
```

## What is in it

- 13 page templates, 37 routes (all sitemap URLs of the original): home, about, service, case studies
  (+6), blog (+10), jobs (+10), contact, style guide, changelog, licenses, and the 404 page.
  Unknown routes and unknown CMS slugs return 404.
- Content comes from the capture (`src/data/content.json`); images were converted from the capture's
  assets to WebP at 640 and 1440 px (`npm run images -- <capture>/assets`), with intrinsic sizes in
  `src/data/images.json` so nothing shifts while loading.
- Inter Display (400/500/600, SIL OFL) is self-hosted from `src/fonts`.

## Motion (taken from the original's code, not guessed)

- H1/H2 reveal word by word: 800 ms, +40 ms per word, `cubic-bezier(.22,1,.36,1)`.
- Other blocks fade up 24 px over 900 ms; items entering together stagger 80 ms.
- The header hides on scroll down after 150 px, returns on scroll up, and gets a hairline border.
- Cards lift 4 px with a soft shadow and zoom their image to 1.05 on hover.
- Buttons roll their label and swap the arrow on hover.
- Wheel scrolling is smoothed on mouse/trackpad devices.
- About counters count up when scrolled into view. FAQ tabs/accordion, blog and job filters work.
- Everything respects `prefers-reduced-motion`.

## Approximations

- The two "Process" illustrations on the home page were Lottie animations in the original; they are
  rebuilt in HTML/CSS with Framer Motion and look close but are not frame-exact.
- Tablet (810-1199 px) layouts follow the original's type scale but were not captured, so spacing
  there is inferred.
- The footer credit reads "Built with Next.js" instead of "Built in Framer".

## Contact form

Mock by design: `/api/contact` validates the input (required fields, phone format, lengths), drops
obvious spam (hidden honeypot field, submissions under 2.5 s, 5 per IP per 10 minutes) and then
answers success without storing or forwarding anything. The thank-you message tells the visitor it
is a demo. To make it real later, replace the mock step in `src/app/api/contact/route.ts` with a call
to an email service or database.
