# Hare Krishna Supermarket website

A Next.js (App Router, TypeScript) website for Hare Krishna Mall (Virpur and Lalsar, Gujarat),
built on a replica of the Webflow "Grocer" template layout and rebranded as a retail supermarket.

## Rebrand

- `rebrand/content.json` is the single content module: brand facts and links (from business.md),
  six retail categories, 36 mock products with mock prices, nine posts, reviews, FAQ, page copy and SEO text.
- `rebrand/apply.js` is run by `tools/convert.js` on every captured page: it swaps products, categories,
  posts, images, links (Google Maps for both branches, Instagram), copy and metadata, and recolours the
  stylesheet with the logo palette.
- `rebrand/images.py` generates placeholder brand imagery into `public/brand/` (packshots, category tiles,
  post covers, about/contact art, avatars, OG image, keyed logos). `rebrand/prompts.py` writes one
  AI-image prompt per image so real images can replace the placeholders under the same file names.
- `app/brand.css` holds the dark header/menu theme the logo needs.

Prices, products, reviews and posts are mock content for the demo. Phone numbers and addresses are not
shown because they have not been confirmed; the footer and contact page use the Google Maps and Instagram links.

## What is in here

- 78 routes: home, home-02, about, shop (3 pages), 6 categories (2 pages each), 42 products,
  blog (2 pages) with 9 posts, contact, FAQ, checkout, 3 policy pages, 3 account pages,
  3 utility pages and the 404 page.
- `components/pages/*.tsx` and `components/site/{header,footer}.tsx` are generated from the
  captured HTML by `tools/convert.js`. Do not edit them by hand; re-run the converter.
- `app/webflow.css` is the site's shared Webflow stylesheet with fonts switched to `next/font`
  variables and remote assets pointed at `public/assets/`.
- `lib/ix2-data.json` holds the Webflow IX2 interaction definitions extracted from the site's
  JavaScript bundle; `lib/ix-engine.ts` replays them (scroll reveals, hover, dropdown, click,
  mouse-move and scroll-progress interactions) using Framer Motion's `animate()`.
- `lib/widgets.ts` re-implements the Webflow widgets kept in the markup: dropdowns, tabs,
  sliders, the cart modal and the forms.
- Lenis smooth scrolling runs on viewports of 768 px and wider, as on the original.

## Forms and the store

Every form is a clearly labelled mock: a note under each form says nothing is sent or stored,
and submitting shows the same message. Add to cart, buy now, the cart modal and the checkout
"Place order" button show a demo notice. Nothing is persisted anywhere.

## Search engines

The site is `noindex, nofollow` until it is on its own domain. Set
`NEXT_PUBLIC_ALLOW_INDEXING=true` (and `NEXT_PUBLIC_SITE_URL`) in the environment to allow
indexing.

## Commands

```bash
npm ci
npm run dev      # http://localhost:3000
npm run build && npm start
npm run lint
npx tsc --noEmit
```

## Regenerating from a capture

`tools/convert.js <refDir> <captureDir> <appDir>` expects the reference HTML files in
`<refDir>/html`, the shared stylesheet as `<refDir>/site.css`, the IX2 data as
`<refDir>/ix2.json` (see `tools/ix2.js`) and an extracted capture folder with `assets/` and
`assets.csv`. `tools/verify.js` loads every route in headless Chromium and checks status,
console errors, failed requests, horizontal overflow and hidden elements, and saves screenshots.
